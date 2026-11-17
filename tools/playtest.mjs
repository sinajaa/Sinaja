// Drive the real game through Chrome DevTools Protocol and play every job headlessly.
// Run: node tools/playtest.mjs  (expects a static server on 127.0.0.1:8100)
import { spawn } from 'node:child_process';

const CHROME = '/usr/bin/chromium';
const PORT = 9222;
const URL = 'http://127.0.0.1:8100/index.html?shot=street&seed=1';

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--hide-scrollbars', '--window-size=1280,720',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/suncoast-cdp-${Date.now()}`,
  URL,
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('no debuggable page');
}

const expression = `(async () => {
  const g = window.game;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const step = (n) => { for (let i = 0; i < n; i++) g.update(1 / 60); };
  const out = {};
  g.start();
  await sleep(300);
  g.screenshotMode = true;
  g.cine = null;
  g.hud.hideMission();
  g.missionPause = false;

  const ped = g.peds.find((p) => !p.dead);
  if (ped) {
    ped.mesh.position.set(41, 0.14, 20);
    ped.mesh.visible = true;
    g.player.pos.set(41, 0, 26);
    g.player.mesh.position.copy(g.player.pos);
    g.camera.position.set(41, 1.4, 26);
    g.camera.lookAt(41, 1.2, 20);
    g.camera.updateMatrixWorld();
    ped.mesh.updateMatrixWorld(true);
    g.scene.updateMatrixWorld(true);
    const before = g.ammo;
    g.shoot();
    out.shot = [before - g.ammo, g.wanted.stars];
  }

  g.wanted.clear();
  g.missions.resetTo(0);
  g.missions.startNext(g);
  g.teleport(g.missions.marker.position.x, g.missions.marker.position.z, 0);
  step(6);
  out.job1 = [g.missions.index, g.money];

  g.hud.hideMission();
  g.missionPause = false;
  g.missions.startNext(g);
  g.spawnPlayerCar(g.missions.marker.position.x + 2, g.missions.marker.position.z, 0);
  step(6);
  out.job2 = [g.missions.index, g.money];
  g.exitCar();

  g.hud.hideMission();
  g.missionPause = false;
  g.missions.startNext(g);
  out.hostiles = g.missions.hostiles.length;
  for (const h of [...g.missions.hostiles]) {
    g.missions.hitHostile(h.mesh);
    g.missions.hitHostile(h.mesh);
  }
  step(6);
  out.job3 = [g.missions.index, g.money];

  g.hud.hideMission();
  g.missionPause = false;
  g.missions.startNext(g);
  g.missions.time = 17;
  g.teleport(g.missions.marker.position.x, g.missions.marker.position.z, 0);
  step(6);
  out.job4 = [g.missions.index, g.money];

  g.hud.hideMission();
  g.missionPause = false;
  g.wanted.clear();
  g.wanted.add(3);
  g.spawnPoliceWave();
  const x = g.player.pos.x;
  const z = g.player.pos.z;
  step(150);
  out.chase = [g.police.cruisers.length, Number(g.player.health.toFixed(1)), g.wanted.stars];
  out.playerMoved = Number(Math.hypot(g.player.pos.x - x, g.player.pos.z - z).toFixed(1));

  g.player.health = 0;
  g.respawn();
  out.respawn = [g.player.health, g.wanted.stars, g.money];

  g.toggleCar();
  out.nearCar = g.inCar;
  if (g.inCar) g.exitCar();

  return JSON.stringify(out);
})()`;

try {
  const ws = new WebSocket(await target());
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const result = await new Promise((resolve, reject) => {
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 1) resolve(msg);
    };
    ws.onerror = reject;
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression, awaitPromise: true, returnByValue: true },
    }));
  });
  if (result.result?.exceptionDetails) {
    console.error('PAGE ERROR', JSON.stringify(result.result.exceptionDetails).slice(0, 800));
    process.exitCode = 1;
  } else {
    console.log(result.result?.result?.value ?? JSON.stringify(result));
  }
  ws.close();
} finally {
  chrome.kill('SIGKILL');
}
