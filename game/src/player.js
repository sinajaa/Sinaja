// The player on foot: a third-person walker with a camera you can swing around him.
import * as THREE from 'three';
import { PLAYER } from './config.js';
import { resolveCollisions } from './city.js';

export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: 0x26324a, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98d63, roughness: 0.75 });
    const jeans = new THREE.MeshStandardMaterial({ color: 0x2b3c55, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.62, 4, 8), jacket);
    body.position.y = 1.16; body.castShadow = true; this.group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 12), skin);
    head.position.y = 1.7; this.group.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0x141a26 }));
    cap.position.y = 1.83; this.group.add(cap);
    this.legs = [];
    for (const x of [-0.13, 0.13]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.18), jeans);
      leg.position.set(x, 0.37, 0); this.group.add(leg); this.legs.push(leg);
    }
    this.arms = [];
    for (const x of [-0.34, 0.34]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.14), jacket);
      arm.position.set(x, 1.16, 0); this.group.add(arm); this.arms.push(arm);
    }
    this.pos = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.health = PLAYER.health;
    this.walkPhase = 0;
    this.mesh = this.group;
    this.mesh.userData.kind = 'player';
    scene.add(this.mesh);
  }

  update(dt, input, cameraYaw, colliders) {
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const move = new THREE.Vector3();
    if (input.forward) move.add(forward);
    if (input.back) move.sub(forward);
    if (input.right) move.add(right);
    if (input.left) move.sub(right);
    const moving = move.lengthSq() > 0.001;
    if (moving) {
      move.normalize();
      const speed = input.sprint ? PLAYER.sprint : PLAYER.walk;
      this.pos.addScaledVector(move, speed * dt);
      this.yaw = Math.atan2(move.x, move.z);
      this.walkPhase += dt * (input.sprint ? 13 : 9);
    }
    resolveCollisions(this.pos, PLAYER.radius, colliders);
    this.mesh.position.set(this.pos.x, 0.14, this.pos.z);
    this.mesh.rotation.y = this.yaw;
    const swing = moving ? Math.sin(this.walkPhase) * 0.6 : 0;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.7;
    this.arms[1].rotation.x = swing * 0.7;
  }

  damage(amount) {
    this.health = Math.max(0, this.health - amount);
  }
}

export function chaseCamera(camera, target, yaw, pitch, distance = 5.6, height = 2.1, lerp = 0.16) {
  const offX = Math.sin(yaw) * distance * Math.cos(pitch);
  const offZ = Math.cos(yaw) * distance * Math.cos(pitch);
  const offY = height + Math.sin(pitch) * distance;
  const want = new THREE.Vector3(target.x + offX, target.y + offY, target.z + offZ);
  camera.position.lerp(want, lerp);
  camera.lookAt(target.x, target.y + 1.15, target.z);
}
