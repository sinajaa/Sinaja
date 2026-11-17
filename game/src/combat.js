// Gunplay and the sparks it throws: tracers, muzzle flashes, explosions, and the shot itself.
import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.flash = new THREE.PointLight(0xffd9a0, 0, 18, 2);
    scene.add(this.flash);
  }

  tracer(from, to, color = 0xffd27a) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.items.push({ line, life: 0.09, max: 0.09 });
  }

  flashAt(pos, intensity = 40) {
    this.flash.position.copy(pos);
    this.flash.intensity = intensity;
    this.items.push({ flash: true, life: 0.06, max: 0.06 });
  }

  burst(pos, color = 0xffaa44, count = 12) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), mat);
      p.position.copy(pos);
      p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 8, (Math.random() - 0.5) * 12);
      group.add(p);
    }
    this.scene.add(group);
    this.items.push({ group, life: 0.5, max: 0.5 });
  }

  update(dt) {
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 900);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.flash) {
        it.life -= dt;
      } else if (it.line) {
        it.line.material.opacity = Math.max(0, it.life / it.max);
      } else if (it.group) {
        for (const p of it.group.children) {
          p.userData.vel.y -= 22 * dt;
          p.position.addScaledVector(p.userData.vel, dt);
        }
        it.group.scale.setScalar(1 + (1 - it.life / it.max) * 0.2);
      }
      if (it.life <= 0) {
        if (it.line) { this.scene.remove(it.line); it.line.geometry.dispose(); it.line.material.dispose(); }
        else if (it.group) this.scene.remove(it.group);
        else if (it.flash) { /* shared light */ }
        this.items.splice(i, 1);
      }
    }
  }
}

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

export function castShot(camera, targets) {
  raycaster.setFromCamera(center, camera);
  raycaster.far = 110;
  const hits = raycaster.intersectObjects(targets, true);
  if (!hits.length) return null;
  const hit = hits[0];
  let node = hit.object;
  while (node && !node.userData.kind) node = node.parent;
  return { point: hit.point, node, kind: node?.userData.kind ?? null, distance: hit.distance };
}
