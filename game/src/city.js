// Port Solara: lots, towers, parks, palms, billboards and the things you can crash into.
import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';
import { between, pick } from './random.js';

const WINDOW_COLORS = ['#243447', '#2d4258', '#3a526b', '#7fb4c9', '#b9d6e2', '#f6c97a'];

function facadeTexture(base, seed) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,.10)';
  for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 128, 2);
  const cols = 6; const rows = 8;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lit = ((x * 7 + y * 11 + seed * 13) % 9) < 3;
      g.fillStyle = lit ? WINDOW_COLORS[5] : WINDOW_COLORS[(x + y + seed) % 4];
      g.globalAlpha = lit ? 0.9 : 0.62;
      g.fillRect(8 + x * 19, 14 + y * 29, 12, 17);
    }
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function billboardTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(0, 0, 512, 10); g.fillRect(0, 246, 512, 10);
  g.fillStyle = fg; g.font = 'bold 88px ui-sans-serif, system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function palmTree(rng, scale = 1) {
  const group = new THREE.Group();
  const h = between(rng, 5, 9) * scale;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14 * scale, 0.26 * scale, h, 6),
    new THREE.MeshStandardMaterial({ color: PALETTE.palmTrunk, roughness: 0.9 }),
  );
  trunk.position.y = h / 2;
  group.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: PALETTE.palm, roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.42 * scale, 3.2 * scale, 4, 1, true), leafMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.1 * scale, h + 0.2, Math.sin(a) * 1.1 * scale);
    leaf.rotation.z = Math.cos(a) * 1.15;
    leaf.rotation.x = Math.sin(a) * 1.15;
    group.add(leaf);
  }
  return group;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  group.name = 'city';
  const colliders = [];
  const parks = [[-1, 2], [2, -2], [-2, -1]];
  const isPark = (i, j) => parks.some(([a, b]) => a === i && b === j);
  const facadeCache = PALETTE.building.map((c, i) => facadeTexture(c, i + 1));

  const walkMat = new THREE.MeshStandardMaterial({ color: PALETTE.walk, roughness: 0.92 });
  const curbMat = new THREE.MeshStandardMaterial({ color: PALETTE.curb, roughness: 0.85 });
  const grassMat = new THREE.MeshStandardMaterial({ color: PALETTE.park, roughness: 0.95 });

  for (let i = -CITY.blocks; i <= CITY.blocks; i++) {
    for (let j = -CITY.blocks; j <= CITY.blocks; j++) {
      const cx = i * CITY.step;
      const cz = j * CITY.step;
      const park = isPark(i, j);
      const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(CITY.block, 0.12, CITY.block), walkMat);
      sidewalk.position.set(cx, 0.06, cz);
      group.add(sidewalk);
      const curb = new THREE.Mesh(new THREE.BoxGeometry(CITY.block + 0.6, 0.18, CITY.block + 0.6), curbMat);
      curb.position.set(cx, 0.05, cz);
      group.add(curb);

      if (park) {
        const lawn = new THREE.Mesh(new THREE.BoxGeometry(CITY.block - 8, 0.14, CITY.block - 8), grassMat);
        lawn.position.set(cx, 0.16, cz);
        group.add(lawn);
        const fountain = new THREE.Mesh(
          new THREE.CylinderGeometry(4.2, 4.6, 0.8, 18),
          new THREE.MeshStandardMaterial({ color: 0xc8c0ae, roughness: 0.8 }),
        );
        fountain.position.set(cx, 0.5, cz);
        group.add(fountain);
        const water = new THREE.Mesh(
          new THREE.CylinderGeometry(3.6, 3.6, 0.2, 18),
          new THREE.MeshStandardMaterial({ color: 0x4aa6bf, roughness: 0.2, metalness: 0.4 }),
        );
        water.position.set(cx, 0.94, cz);
        group.add(water);
        for (let k = 0; k < 8; k++) {
          const p = palmTree(rng, between(rng, 0.8, 1.15));
          const a = (k / 8) * Math.PI * 2;
          p.position.set(cx + Math.cos(a) * 20, 0.16, cz + Math.sin(a) * 20);
          group.add(p);
        }
        continue;
      }

      // Four lots a block, with a plaza around the Needle and an occasional empty lot.
      if (i === 1 && j === -1) continue;
      const lots = [[-14, -14], [14, -14], [-14, 14], [14, 14]];
      for (const [lx, lz] of lots) {
        if (rng() < 0.12) continue;
        const w = between(rng, 16, 23);
        const d = between(rng, 16, 23);
        const downtown = Math.abs(i) + Math.abs(j) <= 2;
        const h = downtown ? between(rng, 18, 52) : between(rng, 7, 26);
        const bx = cx + lx + between(rng, -2, 2);
        const bz = cz + lz + between(rng, -2, 2);
        const seed = (i + 5) * 17 + (j + 5) * 7;
        const tex = facadeCache[(seed + Math.floor(rng() * facadeCache.length)) % facadeCache.length].clone();
        tex.needsUpdate = true;
        tex.repeat.set(Math.max(1, Math.round(w / 12)), Math.max(1, Math.round(h / 14)));
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.05 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        body.position.set(bx, h / 2 + 0.12, bz);
        body.castShadow = true; body.receiveShadow = true;
        body.userData.kind = 'building';
        group.add(body);

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.8, 0.7, d + 0.8),
          new THREE.MeshStandardMaterial({ color: PALETTE.trim, roughness: 0.9 }),
        );
        roof.position.set(bx, h + 0.45, bz);
        group.add(roof);
        if (h > 20 && rng() < 0.7) {
          const hut = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.28, 2.2, d * 0.28),
            new THREE.MeshStandardMaterial({ color: 0x9a9384, roughness: 0.9 }),
          );
          hut.position.set(bx + between(rng, -w * 0.2, w * 0.2), h + 1.9, bz + between(rng, -d * 0.2, d * 0.2));
          group.add(hut);
        }
        colliders.push({
          minX: bx - w / 2, maxX: bx + w / 2,
          minZ: bz - d / 2, maxZ: bz + d / 2,
          height: h,
          kind: 'building',
        });

        if (h > 22 && rng() < 0.55) {
          const words = ['SUNCOAST', 'NEON TIDE', 'SOLARA', 'VULTURES', 'PALM FM', 'TIDE FM'];
          const bg = pick(rng, ['#141b2e', '#3b1d3f', '#173d3a']);
          const fg = pick(rng, ['#ffcf66', '#ff8d9a', '#8ff0d0']);
          const board = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 5),
            new THREE.MeshBasicMaterial({ map: billboardTexture(pick(rng, words), bg, fg) }),
          );
          board.position.set(bx, h * 0.68, bz + d / 2 + 0.06);
          group.add(board);
        }
      }
    }
  }

  // The Needle: the city's landmark, on the block just north-east of centre.
  const needleX = CITY.step, needleZ = -CITY.step;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 7, 92, 12),
    new THREE.MeshStandardMaterial({ color: 0xdcd6c8, roughness: 0.55, metalness: 0.25 }),
  );
  shaft.position.set(needleX, 46, needleZ);
  shaft.castShadow = true;
  group.add(shaft);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(11, 0.8, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 0.8 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(needleX, 78, needleZ);
  group.add(ring);
  const pod = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 6, 5, 16),
    new THREE.MeshStandardMaterial({ color: 0x9fc6d8, roughness: 0.25, metalness: 0.6 }),
  );
  pod.position.set(needleX, 82, needleZ);
  group.add(pod);
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(1.3, 22, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.5 }),
  );
  spire.position.set(needleX, 103, needleZ);
  group.add(spire);
  colliders.push({ minX: needleX - 8, maxX: needleX + 8, minZ: needleZ - 8, maxZ: needleZ + 8, height: 92, kind: 'building' });

  // Palms along the avenues, and a few benches and hydrants for texture.
  for (let i = 0; i < 46; i++) {
    const p = palmTree(rng, between(rng, 0.85, 1.2));
    const road = pick(rng, [-259, -185, -111, -37, 37, 111, 185, 259]);
    const along = between(rng, -240, 240);
    const side = rng() > 0.5 ? 1 : -1;
    if (rng() > 0.5) p.position.set(road + side * (CITY.roadHalf + 2), 0, along);
    else p.position.set(along, 0, road + side * (CITY.roadHalf + 2));
    group.add(p);
  }

  // Boardwalk and beach to the south, where the city meets the water.
  const sand = new THREE.Mesh(
    new THREE.BoxGeometry(560, 0.3, 70),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  sand.position.set(0, 0.15, 300);
  group.add(sand);
  for (let x = -250; x <= 250; x += 34) {
    const p = palmTree(rng, between(rng, 0.9, 1.25));
    p.position.set(x, 0.2, between(rng, 278, 292));
    group.add(p);
  }
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(560, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x9c7a55, roughness: 0.95 }),
  );
  boardwalk.position.set(0, 0.35, 272);
  group.add(boardwalk);

  scene.add(group);
  return { group, colliders, palms: 46 };
}

// Push a circle out of the solid boxes; used by the player and the traffic cars.
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    if (pos.y > c.height + 1.2) continue;
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 < 1e-6) {
        const left = pos.x - c.minX, right = c.maxX - pos.x;
        const back = pos.z - c.minZ, front = c.maxZ - pos.z;
        const m = Math.min(left, right, back, front);
        if (m === left) pos.x = c.minX - radius;
        else if (m === right) pos.x = c.maxX + radius;
        else if (m === back) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      } else {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      }
      return true;
    }
  }
  return false;
}
