// Print the live state of one posed screenshot scene. Run: node tools/inspect.mjs chase
import { spawn } from 'node:child_process';

const shot = process.argv[2] || 'street';
const CHROME = '/usr/bin/chromium';
const PORT = 9223;
const URL = `http://127.0.0.1:8100/index.html?shot=${shot}&seed=1`;

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--hide-scrollbars', '--window-size=1280,720',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/suncoast-inspect-${Date.now()}`,
  URL,
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* booting */ }
    await sleep(500);
  }
  throw new Error('no page');
}

const expression = `JSON.stringify({
  shot: window.game?.shotName,
  cine: window.game?.cine,
  mission: window.game?.missions?.active?.id ?? null,
  index: window.game?.missions?.index,
  money: window.game?.money,
  car: window.game?.playerCar ? [window.game.playerCar.pos.x, window.game.playerCar.pos.z] : null,
  cops: (window.game?.police?.cruisers ?? []).map((c) => [c.pos.x, c.pos.z]),
  officers: window.game?.police?.officers?.length ?? 0,
  hostiles: (window.game?.missions?.hostiles ?? []).map((h) => [h.mesh.position.x, h.mesh.position.z]),
  player: window.game ? [window.game.player.pos.x, window.game.player.pos.z] : null,
  cam: window.game ? window.game.camera.position.toArray() : null
})`;

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
  console.log(result.result?.result?.value ?? JSON.stringify(result.result));
  ws.close();
} finally {
  chrome.kill('SIGKILL');
}
