// People on the sidewalks: low-poly walkers with a loop around each block, plus hostile crew.
import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';
import { between, pick } from './random.js';

const SHIRTS = [0xf2f2f2, 0xff8a5c, 0x6fb3d9, 0xf5d06f, 0x9b6fd9, 0x53c28a, 0xe06a8a, 0x3d4a5c];
const SKIN = [0xf1c7a5, 0xd9a172, 0xa86f4a, 0x6f4630, 0xf6d9bf];

export function buildPerson(rng, hostile = false) {
  const group = new THREE.Group();
  const shirt = hostile ? 0x8f2f2f : pick(rng, SHIRTS);
  const pants = pick(rng, [0x2b3a4a, 0x4a3b2b, 0x22252b, 0x3c4a3a]);
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.24, 0.6, 4, 8),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 }),
  );
  body.position.y = 1.15; group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: pick(rng, SKIN), roughness: 0.8 }),
  );
  head.position.y = 1.68; group.add(head);
  const legs = [];
  for (const x of [-0.12, 0.12]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.62, 0.16),
      new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 }),
    );
    leg.position.set(x, 0.36, 0);
    group.add(leg); legs.push(leg);
  }
  for (const x of [-0.3, 0.3]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.52, 0.13),
      new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 }),
    );
    arm.position.set(x, 1.15, 0);
    group.add(arm);
  }
  group.userData.kind = hostile ? 'hostile' : 'ped';
  group.userData.legs = legs;
  return group;
}

export function spawnPedestrians(scene, rng, count = 42) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const bi = Math.floor(between(rng, -CITY.blocks, CITY.blocks + 1));
    const bj = Math.floor(between(rng, -CITY.blocks, CITY.blocks + 1));
    const cx = bi * CITY.step;
    const cz = bj * CITY.step;
    const half = CITY.block / 2 - 4;
    const t = rng() * 4;
    const side = Math.floor(t);
    const u = between(rng, -half, half);
    const pos = side === 0 ? { x: cx + u, z: cz + half }
      : side === 1 ? { x: cx + half, z: cz + u }
        : side === 2 ? { x: cx + u, z: cz - half }
          : { x: cx - half, z: cz + u };
    const mesh = buildPerson(rng);
    mesh.position.set(pos.x, 0.14, pos.z);
    scene.add(mesh);
    peds.push({
      mesh, cx, cz, half, side, u,
      speed: between(rng, 0.9, 1.6),
      dir: rng() > 0.5 ? 1 : -1,
      phase: rng() * Math.PI * 2,
      health: 30,
      dead: false,
    });
  }
  return peds;
}

export function updatePedestrians(peds, dt, t) {
  for (const p of peds) {
    if (p.dead) continue;
    p.u += p.dir * p.speed * dt;
    if (p.u > p.half) { p.u = p.half; p.side = (p.side + 1) % 4; }
    if (p.u < -p.half) { p.u = -p.half; p.side = (p.side + 3) % 4; }
    let x = p.cx; let z = p.cz;
    if (p.side === 0) { x += p.u; z += p.half; }
    else if (p.side === 1) { x += p.half; z += p.u; }
    else if (p.side === 2) { x += p.u; z -= p.half; }
    else { x -= p.half; z += p.u; }
    const dx = x - p.mesh.position.x;
    const dz = z - p.mesh.position.z;
    p.mesh.position.set(x, 0.14, z);
    if (Math.abs(dx) + Math.abs(dz) > 0.0001) p.mesh.rotation.y = Math.atan2(dx, dz);
    const swing = Math.sin(t * 7 + p.phase) * 0.5;
    p.mesh.userData.legs[0].rotation.x = swing;
    p.mesh.userData.legs[1].rotation.x = -swing;
  }
}
