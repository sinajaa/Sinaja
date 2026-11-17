// Cars: the meshes, the arcade physics, the parked rows and the traffic that fills the avenues.
import * as THREE from 'three';
import { CAR, CITY, PALETTE } from './config.js';
import { between, pick } from './random.js';
import { resolveCollisions } from './city.js';
import { ROADS } from './roads.js';

function wheel() {
  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.26, 12),
    new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.9 }),
  );
  w.rotation.z = Math.PI / 2;
  return w;
}

export function buildCarMesh(color, kind = 'sedan') {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b2a36, roughness: 0.12, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x20242b, roughness: 0.8 });
  const long = kind === 'sports' ? 4.4 : kind === 'police' ? 4.6 : 4.2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.58, long), paint);
  body.position.y = 0.62; body.castShadow = true;
  group.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.24, long * 0.34), paint);
  hood.position.set(0, 0.94, long * 0.26);
  group.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.6, long * 0.44), glass);
  cabin.position.set(0, 1.16, -0.2);
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.1, long * 0.3), paint);
  roof.position.set(0, 1.47, -0.26);
  group.add(roof);
  const bump = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.22, 0.24), dark);
  bump.position.set(0, 0.44, long / 2);
  group.add(bump);
  for (const [x, z] of [[-0.95, 1.34], [0.95, 1.34], [-0.95, -1.34], [0.95, -1.34]]) {
    const w = wheel(); w.position.set(x, 0.36, z); group.add(w);
  }
  const head = new THREE.MeshBasicMaterial({ color: 0xfff2c4 });
  const tail = new THREE.MeshBasicMaterial({ color: 0xff3a2f });
  for (const x of [-0.62, 0.62]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.06), head);
    h.position.set(x, 0.72, long / 2 + 0.03); group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.06), tail);
    t.position.set(x, 0.74, -long / 2 - 0.03); group.add(t);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.32), new THREE.MeshBasicMaterial({ color: 0x2b6bff }));
    bar.position.set(0, 1.6, -0.1); group.add(bar); group.userData.lightBar = bar;
    const paint2 = new THREE.Mesh(new THREE.BoxGeometry(1.93, 0.2, long * 0.72), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }));
    paint2.position.set(0, 0.62, -0.1); group.add(paint2);
    const word = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 1.6), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    word.position.set(0.97, 0.95, -0.2); group.add(word);
  }
  group.userData.kind = 'car';
  group.userData.paint = paint;
  return group;
}

export class Vehicle {
  constructor(scene, { x = 0, z = 0, heading = 0, color = 0xffffff, kind = 'sedan' } = {}) {
    this.mesh = buildCarMesh(color, kind);
    this.mesh.position.set(x, 0.02, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.health = 100;
    this.kind = kind;
    this.driver = null;
    this.wanted = false;
    this.dead = false;
  }

  get forward() { return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)); }

  update(dt, input, colliders) {
    if (this.dead) return;
    const throttle = input?.throttle ?? 0;
    const brake = input?.brake ?? 0;
    const steer = input?.steer ?? 0;
    const boost = input?.boost ? 1.35 : 1;
    let accel = 0;
    if (throttle > 0) accel += CAR.accel * boost * throttle;
    if (brake > 0) accel -= (this.speed > 0 ? CAR.brake : CAR.accel * 0.6) * brake;
    this.speed += accel * dt;
    this.speed -= this.speed * CAR.drag * dt;
    this.speed = Math.max(-CAR.reverse, Math.min(CAR.maxSpeed * boost, this.speed));
    if (!throttle && !brake) this.speed *= 1 - 1.6 * dt;
    if (Math.abs(this.speed) < 0.05) this.speed = 0;
    const grip = Math.min(1, Math.abs(this.speed) / 8);
    this.heading += steer * CAR.steer * grip * dt * (this.speed >= 0 ? 1 : -1);
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    const hit = resolveCollisions(this.pos, CAR.radius, colliders);
    if (hit) { this.speed *= -0.18; this.health -= Math.abs(this.speed) * 0.7; }
    this.mesh.position.set(this.pos.x, 0.02, this.pos.z);
    this.mesh.rotation.y = this.heading;
    for (const child of this.mesh.children) {
      if (child.geometry?.type === 'CylinderGeometry') child.rotation.x += this.speed * dt * 2;
    }
    if (this.health <= 0) this.explode();
  }

  explode() {
    this.dead = true;
    this.mesh.visible = false;
  }

  distanceTo(other) {
    return Math.hypot(this.pos.x - other.pos.x, this.pos.z - other.pos.z);
  }
}

export function spawnTraffic(scene, rng, count = 34) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const horizontal = rng() > 0.5;
    const road = pick(rng, ROADS);
    const dir = rng() > 0.5 ? 1 : -1;
    const along = between(rng, -240, 240);
    const color = pick(rng, PALETTE.car);
    const x = horizontal ? along : road + dir * CITY.lane;
    const z = horizontal ? road - dir * CITY.lane : along;
    const heading = horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = new Vehicle(scene, { x, z, heading, color, kind: rng() > 0.85 ? 'sports' : 'sedan' });
    car.speed = between(rng, 7, 13);
    car.traffic = { horizontal, road, dir, along };
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, playerVehicle, colliders) {
  for (const car of cars) {
    if (car.dead) continue;
    const t = car.traffic;
    if (!t || car.driver) continue;
    if (t.horizontal) {
      t.along += t.dir * car.speed * dt;
      if (t.along > 245) t.along = -245;
      if (t.along < -245) t.along = 245;
      car.pos.set(t.along, 0, t.road - t.dir * CITY.lane);
      car.heading = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      t.along += t.dir * car.speed * dt;
      if (t.along > 245) t.along = -245;
      if (t.along < -245) t.along = 245;
      car.pos.set(t.road + t.dir * CITY.lane, 0, t.along);
      car.heading = t.dir > 0 ? 0 : Math.PI;
    }
    // Slow down for the car in front on the same lane.
    const ahead = playerVehicle && !playerVehicle.dead
      ? (Math.abs(t.horizontal ? playerVehicle.pos.z - (t.road - t.dir * CITY.lane) : playerVehicle.pos.x - (t.road + t.dir * CITY.lane)) < 2
        && (t.horizontal ? (playerVehicle.pos.x - t.along) * t.dir : (playerVehicle.pos.z - t.along) * t.dir) > 0
        && (t.horizontal ? (playerVehicle.pos.x - t.along) * t.dir : (playerVehicle.pos.z - t.along) * t.dir) < 12)
      : false;
    car.speed += ((ahead ? 2 : between(() => Math.random(), 8, 12)) - car.speed) * Math.min(1, dt * 1.5);
    resolveCollisions(car.pos, 1.3, colliders);
    car.mesh.position.set(car.pos.x, 0.02, car.pos.z);
    car.mesh.rotation.y = car.heading;
  }
}

export function spawnParked(scene, rng, count = 16) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const road = pick(rng, ROADS);
    const along = between(rng, -230, 230);
    const side = rng() > 0.5 ? 1 : -1;
    const horizontal = rng() > 0.5;
    const x = horizontal ? along : road + side * (CITY.roadHalf + 2.4);
    const z = horizontal ? road + side * (CITY.roadHalf + 2.4) : along;
    const car = new Vehicle(scene, { x, z, heading: horizontal ? Math.PI / 2 : 0, color: pick(rng, PALETTE.car) });
    car.speed = 0;
    car.parked = true;
    cars.push(car);
  }
  return cars;
}
