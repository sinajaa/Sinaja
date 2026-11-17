// The SCPD: cruisers that hunt you, officers who get out and shoot, and the lights that never stop.
import * as THREE from 'three';
import { Vehicle } from './vehicles.js';
import { buildPerson } from './pedestrians.js';
import { PALETTE } from './config.js';

export class Police {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.cruisers = [];
    this.officers = [];
    this.cooldown = 0;
    this.lightPhase = 0;
  }

  spawnCruiser(x, z, heading = 0) {
    const car = new Vehicle(this.scene, { x, z, heading, color: PALETTE.police, kind: 'police' });
    car.health = 150;
    car.ai = { fire: 1 + Math.random(), deployed: false };
    car.speed = 0;
    this.cruisers.push(car);
    return car;
  }

  spawnOfficer(x, z) {
    const mesh = buildPerson(() => 0.4, false);
    mesh.children[0].material.color.setHex(0x24406e);
    mesh.userData.kind = 'police';
    mesh.position.set(x, 0.14, z);
    this.scene.add(mesh);
    this.officers.push({ mesh, health: 55, fire: 1.2, dead: false });
    return mesh;
  }

  clear() {
    for (const c of this.cruisers) this.scene.remove(c.mesh);
    for (const o of this.officers) this.scene.remove(o.mesh);
    this.cruisers = [];
    this.officers = [];
  }

  update(dt, targetPos, targetVehicle, colliders, onPlayerDamage) {
    this.lightPhase += dt * 8;
    const blue = 0.5 + 0.5 * Math.sin(this.lightPhase);
    for (const car of this.cruisers) {
      if (car.dead) continue;
      if (car.mesh.userData.lightBar) {
        car.mesh.userData.lightBar.material.color.setRGB(blue * 0.2, blue * 0.35, 1);
      }
      const dx = targetPos.x - car.pos.x;
      const dz = targetPos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let diff = want - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 2.2));
      const brake = dist < 7 ? 0.7 : dist < 12 ? 0.25 : 0;
      car.update(dt, { throttle: dist > 5 ? 1 : 0.2, brake, steer, boost: true }, colliders);
      if (dist < 2.8) onPlayerDamage(18 * dt);
      car.ai.fire -= dt;
      if (dist < 34 && car.ai.fire <= 0) {
        car.ai.fire = 1.4 + Math.random();
        const from = new THREE.Vector3(car.pos.x, 1.1, car.pos.z).addScaledVector(car.forward, 2);
        const to = new THREE.Vector3(targetPos.x, 1.05, targetPos.z);
        this.effects.tracer(from, to, 0x9fd0ff);
        this.effects.flashAt(from, 26);
        onPlayerDamage(3 + Math.random() * 4);
      }
      if (dist < 20 && !car.ai.deployed) {
        car.ai.deployed = true;
        for (const side of [-1, 1]) {
          const mesh = buildPerson(() => 0.5, false);
          mesh.children[0].material.color.setHex(0x24406e);
          mesh.userData.kind = 'police';
          mesh.position.set(car.pos.x + side * 1.6, 0.14, car.pos.z);
          this.scene.add(mesh);
          this.officers.push({ mesh, health: 55, fire: 1.2, dead: false });
        }
      }
    }
    for (const off of this.officers) {
      if (off.dead) continue;
      const dx = targetPos.x - off.mesh.position.x;
      const dz = targetPos.z - off.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 9) {
        const step = Math.min(2.6 * dt, dist - 8);
        off.mesh.position.x += (dx / dist) * step;
        off.mesh.position.z += (dz / dist) * step;
      }
      off.mesh.rotation.y = Math.atan2(dx, dz);
      off.fire -= dt;
      if (dist < 30 && off.fire <= 0) {
        off.fire = 1.1 + Math.random() * 0.8;
        const from = new THREE.Vector3(off.mesh.position.x, 1.2, off.mesh.position.z);
        const to = new THREE.Vector3(targetPos.x, 1.05, targetPos.z);
        this.effects.tracer(from, to, 0xa8d4ff);
        this.effects.flashAt(from, 18);
        onPlayerDamage(2 + Math.random() * 3);
      }
    }
    this.cruisers = this.cruisers.filter((c) => !c.dead);
  }
}
