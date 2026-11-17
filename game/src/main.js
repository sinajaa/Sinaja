// Suncoast: Neon Tide. Boots the city, wires the systems and runs the frame loop.
import * as THREE from 'three';
import { CITY, TIME } from './config.js';
import { makeRandom } from './random.js';
import { buildWorld } from './world.js';
import { buildRoads } from './roads.js';
import { buildCity } from './city.js';
import { spawnTraffic, spawnParked, updateTraffic, Vehicle } from './vehicles.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { Player, chaseCamera } from './player.js';
import { Police } from './police.js';
import { Wanted } from './wanted.js';
import { Missions } from './missions.js';
import { Effects, castShot } from './combat.js';
import { Hud } from './hud.js';
import { AudioSys } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { applyShot } from './shots.js';

addEventListener('error', (e) => { document.title = `ERR ${e.message || e.error}`; });
addEventListener('unhandledrejection', (e) => { document.title = `REJ ${e.reason?.message || e.reason}`; });

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1600);
    this.camera.position.set(47, 12, 98);
    this.camera.lookAt(37, 6, 40);
    this.clock = new THREE.Clock();
    this.world = buildWorld(this.scene, this.renderer);
    const rng = makeRandom(7);
    this.roadData = buildRoads(this.scene, rng);
    this.city = buildCity(this.scene, rng);
    this.colliders = this.city.colliders;
    this.traffic = spawnTraffic(this.scene, rng, 38);
    this.parked = spawnParked(this.scene, rng, 18);
    this.peds = spawnPedestrians(this.scene, rng, 46);
    this.player = new Player(this.scene);
    this.player.pos.set(47, 0, 86);
    this.effects = new Effects(this.scene);
    this.police = new Police(this.scene, this.effects);
    this.missions = new Missions(this.scene, this.effects);
    this.wanted = new Wanted();
    this.hud = new Hud();
    this.audio = new AudioSys();
    this.money = 0;
    this.minutes = TIME.start;
    this.inCar = false;
    this.playerCar = null;
    this.running = false;
    this.paused = false;
    this.cameraYaw = 0;
    this.cameraPitch = 0.14;
    this.cameraHeight = 2.0;
    this.cameraDistance = 5.6;
    this.cine = null;
    this.keys = {};
    this.shootCooldown = 0;
    this.ammo = 12;
    this.reloading = 0;
    this.wantedSpawn = 0;
    this.saveTimer = 0;
    this.time = 0;
    this.screenshotMode = false;
    const params = new URLSearchParams(location.search);
    this.shotName = params.get('shot');
    this.input = { forward: false, back: false, left: false, right: false, sprint: false, throttle: 0, brake: 0, steer: 0, boost: false };
    this.bindInput();
    this.hud.update(this.hudState());
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    if (params.get('debug')) {
      setTimeout(() => {
        const ray = new THREE.Raycaster();
        const counts = {};
        const targets = [this.city.group, ...this.traffic.map((c) => c.mesh), ...this.peds.map((p) => p.mesh)];
        for (let gy = 0; gy < 9; gy++) {
          for (let gx = 0; gx < 16; gx++) {
            ray.setFromCamera(new THREE.Vector2((gx + 0.5) / 8 - 1, 1 - (gy + 0.5) / 4.5), this.camera);
            const hits = ray.intersectObjects(targets, true);
            let kind = 'sky';
            if (hits.length) {
              let node = hits[0].object;
              while (node && !node.userData.kind) node = node.parent;
              kind = node?.userData.kind ?? hits[0].object.name ?? hits[0].object.geometry?.type ?? 'other';
            }
            counts[kind] = (counts[kind] || 0) + 1;
          }
        }
        const prj = (p) => { const v = p.clone().project(this.camera); return `${v.x.toFixed(2)},${v.y.toFixed(2)}`; };
        const extra = this.inCar && this.playerCar ? ` car=${prj(this.playerCar.pos.clone().setY(1))}` : '';
        const cops = this.police.cruisers.map((c) => prj(c.pos.clone().setY(1))).join('|');
        document.title = `DBG cam=${this.camera.position.toArray().map((n) => n.toFixed(1))} ${JSON.stringify(counts)}${extra} cops=${cops}`;
      }, 3000);
    }
    if (this.shotName) applyShot(this, this.shotName, Number(params.get('seed')) || 1);
  }

  bindInput() {
    const map = {
      KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right',
      ArrowUp: 'forward', ArrowDown: 'back', ArrowLeft: 'left', ArrowRight: 'right',
    };
    addEventListener('keydown', (e) => {
      if (map[e.code]) this.keys[map[e.code]] = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.sprint = true;
      if (e.code === 'KeyE') this.toggleCar();
      if (e.code === 'KeyR') this.startReload();
      if (e.code === 'Escape') this.togglePause();
    });
    addEventListener('keyup', (e) => {
      if (map[e.code]) this.keys[map[e.code]] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.sprint = false;
    });
    this.canvas.addEventListener('click', () => {
      if (!this.running || this.paused) return;
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
        return;
      }
      this.shoot();
    });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.cameraYaw -= e.movementX * 0.0024;
      this.cameraPitch = Math.max(-0.1, Math.min(0.75, this.cameraPitch + e.movementY * 0.0022));
    });
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    document.getElementById('playbtn').addEventListener('click', () => {
      this.audio.init();
      this.audio.click();
      this.start();
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    document.getElementById('overlay').classList.add('hidden');
    this.hud.show();
    this.audio.init();
    const saved = this.screenshotMode ? null : loadSave();
    if (saved) {
      this.money = saved.money ?? 0;
      this.player.pos.set(saved.x ?? 47, 0, saved.z ?? 86);
      this.player.health = saved.health ?? 100;
      this.missions.resetTo(saved.mission ?? 0);
      this.hud.toast('Save loaded');
    }
    if (!this.missions.active && this.missions.index < this.missions.jobs.length) {
      setTimeout(() => {
        if (this.running && !this.missions.active) this.missions.startNext(this);
      }, this.screenshotMode ? 0 : 1400);
    }
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    document.getElementById('overlay').classList.toggle('hidden', !this.paused);
    document.getElementById('playbtn').textContent = this.paused ? 'Resume' : 'Enter Suncoast';
    if (this.paused) document.exitPointerLock?.();
  }

  teleport(x, z, yaw = 0) {
    if (this.inCar) this.exitCar();
    this.player.pos.set(x, 0, z);
    this.player.yaw = yaw;
    this.player.mesh.position.set(x, 0.14, z);
    this.player.mesh.rotation.y = yaw;
    this.camera.position.set(x + Math.sin(this.cameraYaw) * 5.6, 3.2, z + Math.cos(this.cameraYaw) * 5.6);
  }

  spawnPlayerCar(x, z, heading, kind = 'sports', color = 0xd94a4a) {
    if (this.inCar) this.exitCar();
    this.playerCar = new Vehicle(this.scene, { x, z, heading, color, kind });
    this.playerCar.driver = 'player';
    this.playerCar.health = 220;
    this.inCar = true;
    this.player.mesh.visible = false;
    this.cameraYaw = heading + Math.PI;
    this.audio.setEngine(true, 12);
    return this.playerCar;
  }

  toggleCar() {
    if (!this.running || this.paused) return;
    if (this.inCar) { this.exitCar(); return; }
    let best = null;
    let bestD = 5.2;
    for (const car of [...this.traffic, ...this.parked]) {
      if (car.dead || car.kind === 'police') continue;
      const d = Math.hypot(car.pos.x - this.player.pos.x, car.pos.z - this.player.pos.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    if (!best) { this.hud.toast('No car nearby'); return; }
    best.driver = 'player';
    best.traffic = null;
    best.speed = 0;
    this.playerCar = best;
    this.inCar = true;
    this.player.mesh.visible = false;
    this.cameraYaw = best.heading + Math.PI;
    this.audio.setEngine(true, 0);
    this.hud.toast('Hotwired');
  }

  exitCar() {
    if (!this.playerCar) return;
    const car = this.playerCar;
    car.driver = null;
    car.parked = true;
    car.speed *= 0.3;
    if (!this.parked.includes(car)) this.parked.push(car);
    const sideX = Math.cos(car.heading) * 2.4;
    const sideZ = -Math.sin(car.heading) * 2.4;
    this.player.pos.set(car.pos.x + sideX, 0, car.pos.z + sideZ);
    this.player.yaw = car.heading;
    this.player.mesh.position.set(this.player.pos.x, 0.14, this.player.pos.z);
    this.player.mesh.visible = true;
    this.inCar = false;
    this.playerCar = null;
    this.audio.setEngine(false);
  }

  startReload() {
    if (this.inCar || this.reloading > 0) return;
    this.reloading = 1.25;
    this.hud.toast('Reloading');
  }

  shoot() {
    if (this.shootCooldown > 0 || this.reloading > 0) return;
    if (this.ammo <= 0) { this.startReload(); return; }
    this.ammo -= 1;
    this.shootCooldown = 0.19;
    this.audio.shot();
    const targets = [this.city.group];
    for (const car of [...this.traffic, ...this.parked, ...this.police.cruisers]) targets.push(car.mesh);
    for (const p of this.peds) targets.push(p.mesh);
    for (const h of this.missions.hostiles) targets.push(h.mesh);
    for (const o of this.police.officers) targets.push(o.mesh);
    const hit = castShot(this.camera, targets);
    const from = new THREE.Vector3(this.player.pos.x, 1.3, this.player.pos.z);
    this.effects.flashAt(from, 35);
    if (!hit) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.effects.tracer(from, from.clone().addScaledVector(dir, 90));
      return;
    }
    this.effects.tracer(from, hit.point);
    this.effects.burst(hit.point, 0xffd18a, 5);
    if (hit.kind === 'ped') {
      const ped = this.peds.find((p) => p.mesh === hit.node);
      if (ped && !ped.dead) { ped.dead = true; ped.mesh.visible = false; this.wanted.add(1, 'ped'); }
    } else if (hit.kind === 'hostile') {
      this.missions.hitHostile(hit.node);
      this.wanted.add(1, 'hostile');
    } else if (hit.kind === 'police') {
      const off = this.police.officers.find((o) => o.mesh === hit.node);
      if (off) {
        off.health -= 34;
        if (off.health <= 0) { off.dead = true; off.mesh.visible = false; }
      }
      this.wanted.add(1, 'police');
    } else if (hit.kind === 'car') {
      const car = [...this.traffic, ...this.parked, ...this.police.cruisers].find((c) => c.mesh === hit.node);
      if (car) {
        car.health -= 30;
        this.wanted.add(1, 'car');
        if (car.health <= 0) {
          car.explode();
          this.effects.burst(car.pos.clone().setY(1), 0xffaa44, 18);
        }
      }
    }
  }

  respawn() {
    this.player.health = 100;
    this.wanted.clear();
    this.police.clear();
    this.money = Math.max(0, this.money - 100);
    this.inCar = false;
    this.playerCar = null;
    this.player.mesh.visible = true;
    this.teleport(-37, -104, 0);
    this.hud.toast('WASTED — $100 hospital bill');
  }

  hudState() {
    const pos = this.inCar && this.playerCar ? this.playerCar.pos : this.player.pos;
    const heading = this.inCar && this.playerCar ? this.playerCar.heading : this.player.yaw;
    const marker = this.missions.marker.visible ? this.missions.marker.position : null;
    return {
      health: this.player.health,
      money: this.money,
      stars: this.wanted.stars,
      clock: `${String(Math.floor(this.minutes / 60) % 24).padStart(2, '0')}:${String(Math.floor(this.minutes % 60)).padStart(2, '0')}`,
      district: this.districtAt(pos.x, pos.z),
      objective: this.objectiveText(),
      inCar: this.inCar,
      speed: this.playerCar ? this.playerCar.speed : 0,
      playerX: pos.x,
      playerZ: pos.z,
      heading,
      marker,
      police: this.police.cruisers.map((c) => ({ x: c.pos.x, z: c.pos.z })),
    };
  }

  districtAt(x, z) {
    if (z > 232) return 'Solara Beach';
    if (x < -125) return 'Delmar Flats';
    if (Math.hypot(x - CITY.step, z + CITY.step) < 110) return 'Neon District';
    if (z < -150) return 'North Point';
    return 'Port Solara';
  }

  objectiveText() {
    if (this.missions.active) return this.missions.active.objective;
    if (this.missions.index >= this.missions.jobs.length) return 'All jobs done. The city is yours.';
    return 'Riva has another job. Call her.';
  }

  spawnPoliceWave() {
    const heading = this.inCar && this.playerCar ? this.playerCar.heading : this.player.yaw;
    const pos = this.inCar && this.playerCar ? this.playerCar.pos : this.player.pos;
    const x = Math.max(-235, Math.min(235, pos.x - Math.sin(heading) * 46));
    const z = Math.max(-235, Math.min(235, pos.z - Math.cos(heading) * 46));
    const car = this.police.spawnCruiser(x, z, heading);
    car.speed = 4;
  }

  collisionWithTraffic() {
    if (!this.inCar || !this.playerCar) return;
    const mine = this.playerCar;
    for (const car of this.traffic) {
      if (car === mine || car.dead) continue;
      if (mine.distanceTo(car) < 3.1) {
        mine.speed *= 0.55;
        car.speed = Math.max(car.speed, 4);
        this.hud.toast('Traffic collision');
      }
    }
  }

  hitPeds() {
    const inCar = this.inCar && this.playerCar;
    const pos = inCar ? this.playerCar.pos : this.player.pos;
    const speed = inCar ? Math.abs(this.playerCar.speed) : 0;
    if (speed < 7) return;
    for (const p of this.peds) {
      if (p.dead) continue;
      if (Math.hypot(p.mesh.position.x - pos.x, p.mesh.position.z - pos.z) < 1.6) {
        p.dead = true;
        p.mesh.visible = false;
        this.wanted.add(2, 'hit and run');
        this.hud.toast('Hit and run');
      }
    }
  }

  save() {
    if (this.screenshotMode) return;
    writeSave({
      money: this.money,
      mission: this.missions.index,
      x: this.player.pos.x,
      z: this.player.pos.z,
      health: this.player.health,
    });
  }

  update(dt) {
    this.time += dt;
    this.minutes = (this.minutes + dt * TIME.scale) % 1440;
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) { this.ammo = 12; this.hud.toast('Loaded'); }
    }
    const k = this.keys;
    this.input.forward = !!k.forward;
    this.input.back = !!k.back;
    this.input.left = !!k.left;
    this.input.right = !!k.right;
    this.input.sprint = !!k.sprint;

    if (this.inCar && this.playerCar) {
      const car = this.playerCar;
      this.input.throttle = this.input.forward ? 1 : 0;
      this.input.brake = this.input.back ? 1 : 0;
      this.input.steer = this.input.left ? 1 : this.input.right ? -1 : 0;
      this.input.boost = this.input.sprint;
      if (this.screenshotMode && (this.shotName === 'car' || this.shotName === 'chase')) {
        this.input.throttle = 1;
        this.input.steer = Math.sin(this.time * 0.7) * 0.1;
      }
      car.update(dt, this.input, this.colliders);
      this.audio.setEngine(true, car.speed);
      this.collisionWithTraffic();
    } else {
      this.player.update(dt, this.input, this.cameraYaw, this.colliders);
      this.audio.setEngine(false);
    }

    updateTraffic(this.traffic, dt, this.playerCar, this.colliders);
    updatePedestrians(this.peds, dt, this.time);
    this.hitPeds();

    if (this.wanted.stars > 0) {
      this.police.update(
        dt,
        this.inCar && this.playerCar ? this.playerCar.pos : this.player.pos,
        this.playerCar,
        this.colliders,
        (amount) => {
          this.player.damage(amount);
          if (this.player.health <= 0) this.respawn();
        },
      );
      this.wantedSpawn -= dt;
      if (!this.screenshotMode && this.wantedSpawn <= 0 && this.police.cruisers.length < this.wanted.stars * 2) {
        this.spawnPoliceWave();
        this.wantedSpawn = 5;
      }
      this.audio.setSiren(true);
    } else {
      this.audio.setSiren(false);
      if (this.police.cruisers.length && !this.screenshotMode) this.police.clear();
    }

    const change = this.wanted.update(dt, false);
    if (change?.dropped) this.hud.toast(change.stars ? `Wanted level ${change.stars}` : 'You lost the cops');

    const job = this.missions.update(dt, this);
    if (job) {
      this.money += job.reward;
      this.save();
      this.hud.showMission(job.title, 'MISSION COMPLETE', `${job.brief} The job paid $${job.reward}.`, () => {
        if (this.missions.index < this.missions.jobs.length) this.missions.startNext(this);
      });
      this.hud.toast(`+$${job.reward}`);
    }

    this.effects.update(dt);
    this.hud.tick(dt);
    this.hud.update(this.hudState());

    if (this.cine) {
      this.camera.position.set(...this.cine.pos);
      this.camera.lookAt(new THREE.Vector3(...this.cine.look));
    } else if (this.inCar && this.playerCar) {
      const car = this.playerCar;
      const want = new THREE.Vector3(
        car.pos.x + Math.sin(this.cameraYaw) * this.cameraDistance,
        this.cameraHeight + this.cameraPitch * 6,
        car.pos.z + Math.cos(this.cameraYaw) * this.cameraDistance,
      );
      this.camera.position.lerp(want, 0.14);
      this.camera.lookAt(car.pos.x, 1.05, car.pos.z);
    } else {
      const target = new THREE.Vector3(this.player.pos.x, 0.15, this.player.pos.z);
      chaseCamera(this.camera, target, this.cameraYaw, this.cameraPitch, this.cameraDistance, this.cameraHeight, 0.18);
    }

    this.saveTimer += dt;
    if (this.saveTimer > 5) { this.saveTimer = 0; this.save(); }
  }

  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.running && !this.paused) {
      this.update(dt);
    } else {
      this.player.mesh.rotation.y += dt * 0.1;
      const t = (this.time += dt * 0.15);
      this.camera.position.set(47 + Math.sin(t * 0.12) * 26, 14, 108 + Math.cos(t * 0.12) * 26);
      this.camera.lookAt(20, 4, 20);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

new Game();
