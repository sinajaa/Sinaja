// The street grid: eight avenues each way, asphalt, markings, crosswalks and lamps.
import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

export const ROADS = [-259, -185, -111, -37, 37, 111, 185, 259];
const EXTENT = 526;

function asphaltTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#2b2f38'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const v = 28 + Math.random() * 26;
    g.fillStyle = `rgba(${v},${v + 2},${v + 7},${0.25 + Math.random() * 0.3})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.5, 26);
  return t;
}

function sidewalkTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#b9b3a6'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(90,86,78,.35)'; g.lineWidth = 2;
  for (let i = 0; i <= 128; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildRoads(scene, rng) {
  const group = new THREE.Group();
  group.name = 'roads';
  const asphalt = asphaltTexture();
  const laneMat = new THREE.MeshBasicMaterial({ color: 0xf2d06b });
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xe8e6df });
  const dashGeo = new THREE.BoxGeometry(3.2, 0.04, 0.22);
  const dashes = [];
  const stripes = [];

  for (const x of ROADS) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(CITY.roadHalf * 2, EXTENT),
      new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95, metalness: 0 }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(x, 0.01, 0);
    group.add(strip);
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, EXTENT), edgeMat);
      edge.position.set(x + side * (CITY.roadHalf - 0.5), 0.04, 0);
      group.add(edge);
    }
    for (let z = -EXTENT / 2 + 4; z < EXTENT / 2; z += 8) {
      const m = new THREE.Matrix4().makeRotationY(Math.PI / 2);
      m.setPosition(x, 0.045, z);
      dashes.push(m);
    }
  }

  for (const z of ROADS) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(EXTENT, CITY.roadHalf * 2),
      new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95, metalness: 0 }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.012, z);
    group.add(strip);
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(EXTENT, 0.03, 0.16), edgeMat);
      edge.position.set(0, 0.04, z + side * (CITY.roadHalf - 0.5));
      group.add(edge);
    }
    for (let x = -EXTENT / 2 + 4; x < EXTENT / 2; x += 8) {
      const m = new THREE.Matrix4();
      m.setPosition(x, 0.045, z);
      dashes.push(m);
    }
  }

  const dashMesh = new THREE.InstancedMesh(dashGeo, laneMat, dashes.length);
  dashes.forEach((m, i) => dashMesh.setMatrixAt(i, m));
  dashMesh.instanceMatrix.needsUpdate = true;
  group.add(dashMesh);

  // Crosswalk bars at the central intersections.
  for (const x of ROADS.slice(2, 6)) {
    for (const z of ROADS.slice(2, 6)) {
      for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        for (let k = -2; k <= 2; k++) {
          const m = new THREE.Matrix4();
          if (dx === 0) m.makeScale(1, 1, 1).setPosition(x + k * 2.2, 0.05, z + dz * (CITY.roadHalf - 1.9));
          else {
            m.makeRotationY(Math.PI / 2).setPosition(x + dx * (CITY.roadHalf - 1.9), 0.05, z + k * 2.2);
          }
          stripes.push(m);
        }
      }
    }
  }
  const stripeGeo = new THREE.BoxGeometry(0.55, 0.04, 2.8);
  const stripeMesh = new THREE.InstancedMesh(stripeGeo, edgeMat, stripes.length);
  stripes.forEach((m, i) => stripeMesh.setMatrixAt(i, m));
  stripeMesh.instanceMatrix.needsUpdate = true;
  group.add(stripeMesh);

  // Street lamps and the odd traffic signal.
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.12, 6.2, 6);
  const bulbGeo = new THREE.SphereGeometry(0.32, 8, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4c5560, roughness: 0.6, metalness: 0.5 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const poles = [];
  const bulbs = [];
  for (const x of ROADS) {
    for (let z = -240; z <= 240; z += 48) {
      for (const side of [-1, 1]) {
        const px = x + side * (CITY.roadHalf + 1.1);
        const m = new THREE.Matrix4().setPosition(px, 3.1, z + side * 12);
        poles.push(m);
        const b = new THREE.Matrix4().setPosition(px, 6.15, z + side * 12);
        bulbs.push(b);
      }
    }
  }
  for (const z of ROADS) {
    for (let x = -240; x <= 240; x += 48) {
      for (const side of [-1, 1]) {
        const pz = z + side * (CITY.roadHalf + 1.1);
        poles.push(new THREE.Matrix4().setPosition(x + side * 12, 3.1, pz));
        bulbs.push(new THREE.Matrix4().setPosition(x + side * 12, 6.15, pz));
      }
    }
  }
  const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, poles.length);
  poles.forEach((m, i) => poleMesh.setMatrixAt(i, m));
  poleMesh.instanceMatrix.needsUpdate = true;
  group.add(poleMesh);
  const bulbMesh = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbs.length);
  bulbs.forEach((m, i) => bulbMesh.setMatrixAt(i, m));
  bulbMesh.instanceMatrix.needsUpdate = true;
  group.add(bulbMesh);

  scene.add(group);
  return { group, sidewalkTexture: sidewalkTexture() };
}

export function onRoad(x, z) {
  for (const r of ROADS) {
    if (Math.abs(x - r) < CITY.roadHalf + 1.6) return true;
    if (Math.abs(z - r) < CITY.roadHalf + 1.6) return true;
  }
  return false;
}

export function nearestRoad(value) {
  let best = ROADS[0];
  for (const r of ROADS) if (Math.abs(value - r) < Math.abs(value - best)) best = r;
  return best;
}

export function nearestIntersection(x, z) {
  const rx = nearestRoad(x);
  const rz = nearestRoad(z);
  return { x: rx, z: rz };
}

export function randomRoadSpot(rng) {
  const horizontal = rng() > 0.5;
  const road = ROADS[Math.floor(rng() * ROADS.length)];
  const along = (rng() * 2 - 1) * 235;
  const side = rng() > 0.5 ? 1 : -1;
  const offset = side * CITY.lane;
  return horizontal ? { x: along, z: road + offset, heading: side > 0 ? 0 : Math.PI }
    : { x: road + offset, z: along, heading: side > 0 ? Math.PI / 2 : -Math.PI / 2 };
}
