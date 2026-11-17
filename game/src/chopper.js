// Air support: a searchlight, a spinning rotor and a very loud argument for staying off the streets.
import * as THREE from 'three';

export class Chopper {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.95, 2.4, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x1d2b45, roughness: 0.45, metalness: 0.35 }),
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.2;
    this.group.add(body);
    const cabin = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x8fd0e8, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.75 }),
    );
    cabin.position.set(0, 0.35, 1.25);
    this.group.add(cabin);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x1d2b45, roughness: 0.5 }),
    );
    tail.position.set(0, 0.2, -2.2);
    this.group.add(tail);
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.1, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.5 }),
    );
    fin.position.set(0, 0.8, -3.6);
    this.group.add(fin);
    for (const x of [-1.1, 1.1]) {
      const skid = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 2.6),
        new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.8 }),
      );
      skid.position.set(x, -0.9, 0.1);
      this.group.add(skid);
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), skid.material);
      strut.position.set(x, -0.45, 0.4);
      this.group.add(strut);
    }
    this.rotor = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x20252e, roughness: 0.7, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 2; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.06, 0.35), bladeMat);
      blade.rotation.y = i * Math.PI / 2;
      this.rotor.add(blade);
    }
    this.rotor.position.y = 1.5;
    this.group.add(this.rotor);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x9fb6c9, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 1.51;
    this.group.add(disc);
    const spotlight = new THREE.SpotLight(0xfff3d0, 420, 140, 0.36, 0.5, 1.4);
    spotlight.position.set(0, -0.4, 1.6);
    this.group.add(spotlight);
    this.target = new THREE.Object3D();
    this.scene.add(this.target);
    spotlight.target = this.target;
    this.spotlight = spotlight;
    this.lightMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), this.lightMat);
    beacon.position.set(0, 1.05, -2.4);
    this.group.add(beacon);
    this.beacon = beacon;
    this.pos = new THREE.Vector3(0, 34, 0);
    this.group.position.copy(this.pos);
    this.scene.add(this.group);
    this.fire = 0.8;
    this.phase = 0;
  }

  update(dt, targetPos, onDamage) {
    this.phase += dt;
    const want = new THREE.Vector3(targetPos.x + 14, 30 + Math.sin(this.phase * 0.8) * 1.2, targetPos.z - 10);
    this.pos.lerp(want, Math.min(1, dt * 1.6));
    this.group.position.copy(this.pos);
    this.group.rotation.y = Math.atan2(targetPos.x - this.pos.x, targetPos.z - this.pos.z);
    this.rotor.rotation.y += dt * 42;
    this.target.position.set(targetPos.x, 0, targetPos.z);
    this.group.updateMatrixWorld(true);
    this.lightMat.color.setHex(Math.sin(this.phase * 9) > 0 ? 0xff3b30 : 0x3b7bff);

    this.fire -= dt;
    if (this.fire <= 0 && this.pos.distanceTo(new THREE.Vector3(targetPos.x, 0, targetPos.z)) < 95) {
      this.fire = 1.5 + Math.random() * 0.8;
      const from = new THREE.Vector3(this.pos.x, this.pos.y - 1, this.pos.z);
      const to = new THREE.Vector3(targetPos.x, 1.0, targetPos.z);
      this.effects.tracer(from, to, 0xfff0b0);
      this.effects.flashAt(from, 24);
      onDamage(3 + Math.random() * 4);
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.scene.remove(this.target);
    this.spotlight.dispose?.();
  }
}
