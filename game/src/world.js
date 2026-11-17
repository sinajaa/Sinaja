// Sky, sun, sea and light: the golden-hour look the whole city sits in.
import * as THREE from 'three';
import { PALETTE } from './config.js';

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#1b4d86');
  grad.addColorStop(0.32, '#4d8fc4');
  grad.addColorStop(0.58, '#a8cfe4');
  grad.addColorStop(0.74, '#ffd7a3');
  grad.addColorStop(0.86, '#ff9d63');
  grad.addColorStop(1, '#7c4b45');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sunSprite() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,250,225,1)');
  grad.addColorStop(0.18, 'rgba(255,236,180,.95)');
  grad.addColorStop(0.45, 'rgba(255,190,110,.42)');
  grad.addColorStop(1, 'rgba(255,150,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
}

export function buildWorld(scene, renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(760, 32, 24),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  scene.add(sky);

  const sun = sunSprite();
  sun.scale.set(210, 210, 1);
  sun.position.set(-200, 96, 560);
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0xcfe4f7, 0x7a6146, 1.35);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffd2a1, 2.15);
  sunLight.position.set(-140, 260, 180);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -150;
  sunLight.shadow.camera.right = 150;
  sunLight.shadow.camera.top = 150;
  sunLight.shadow.camera.bottom = -150;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 520;
  sunLight.shadow.bias = -0.0008;
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0xffe2c0, 0.7));
  const fill = new THREE.DirectionalLight(0xbfd4ef, 0.55);
  fill.position.set(220, 90, -180);
  scene.add(fill);

  // The bay south of the boardwalk.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 900),
    new THREE.MeshStandardMaterial({ color: PALETTE.water, roughness: 0.18, metalness: 0.55 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.02, 340 + 450);
  scene.add(water);
  const shelf = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 900),
    new THREE.MeshStandardMaterial({ color: 0x1d4a5e, roughness: 0.4, metalness: 0.3 }),
  );
  shelf.rotation.x = -Math.PI / 2;
  shelf.position.set(0, -0.4, 340 + 450);
  scene.add(shelf);

  scene.fog = new THREE.Fog(0xe8c49a, 240, 900);

  // Low hills across the bay, so the horizon is not a hard line.
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x8a7f78, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(90 + i * 11, 30 + (i % 3) * 18, 5), hillMat);
    h.position.set(-620 + i * 155, 6, 760 + (i % 2) * 60);
    h.rotation.y = i * 0.7;
    scene.add(h);
  }

  return { sunLight, hemi, sky };
}
