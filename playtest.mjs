// Headless playtest for NIGHTSHIFT: BLACKOUT via Chrome DevTools Protocol.
// Drives the real game in headless Chromium: starts it, walks around,
// checks detection rises, collects intel, and wins. Exits non-zero on failure.
import { execFile } from 'node:child_process';

const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`;
const PORT = 9333;
const URL = 'http://localhost:8123/game/index.html';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--no-sandbox', '--disable-gpu', '--window-size=1280,720',
  `--remote-debugging-port=${PORT}`, '--headless=new', URL,
], () => {});

let failures = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`);
  if (!ok) failures++;
}

try {
  // Wait for the DevTools target list.
  let targets;
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const r = await fetch(`http://localhost:${PORT}/json/list`);
      targets = await r.json();
      if (targets.find((t) => t.type === 'page')) break;
    } catch { /* not up yet */ }
  }
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 0;
  const pending = new Map();
  const exceptions = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') {
      exceptions.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
    }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const id = ++msgId;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error('eval threw: ' + JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  const key = async (type, code, keyName) => {
    await send('Input.dispatchKeyEvent', { type, code, key: keyName, windowsVirtualKeyCode: 13 });
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await sleep(1500);

  check('title overlay visible', (await evalJs(`document.getElementById('overlay-title').style.display`)) === 'flex');
  check('phase starts at title', (await evalJs(`window.__nightshift.phase`)) === 'title');

  // Start the game with Enter.
  await key('keyDown', 'Enter', 'Enter');
  await key('keyUp', 'Enter', 'Enter');
  await sleep(300);
  check('phase playing after Enter', (await evalJs(`window.__nightshift.phase`)) === 'playing');

  // Walk right for 1.2s: player x must grow.
  const x0 = await evalJs(`window.__nightshift.player.x`);
  await key('keyDown', 'KeyD', 'd');
  await sleep(1200);
  await key('keyUp', 'KeyD', 'd');
  const x1 = await evalJs(`window.__nightshift.player.x`);
  check('player moves right', x1 > x0 + 50, `(${Math.round(x0)} -> ${Math.round(x1)})`);
  check('timer advances', (await evalJs(`window.__nightshift.elapsed`)) > 1);

  // Wall collision: walk left into the border wall for 1s, x must stay >= ~53.
  await key('keyDown', 'KeyA', 'a');
  await sleep(1500);
  await key('keyUp', 'KeyA', 'a');
  const x2 = await evalJs(`window.__nightshift.player.x`);
  check('wall blocks movement', x2 >= 50 && x2 < x1, `(x=${Math.round(x2)})`);

  // Detection: teleport in front of guard 0 (ROOK), inside its cone.
  await evalJs(`(() => { const g = window.__nightshift; const guard = g.guards[0];
    guard.x = 500; guard.y = 300; guard.facing = 0; guard.state = 'patrol'; guard.suspicion = 0;
    g.player.x = 620; g.player.y = 300; g.player.sneaking = false; })()`);
  await sleep(1500);
  const susp = await evalJs(`window.__nightshift.guards[0].suspicion`);
  check('suspicion rises in cone', susp > 0.3, `(suspicion=${susp.toFixed(2)})`);

  // Recovery: move the player far away, suspicion must fall.
  await evalJs(`(() => { const g = window.__nightshift; g.player.x = 60; g.player.y = 60; })()`);
  await sleep(2500);
  const susp2 = await evalJs(`window.__nightshift.guards[0].suspicion`);
  check('suspicion decays when hidden', susp2 < susp, `(${susp.toFixed(2)} -> ${susp2.toFixed(2)})`);

  // Intel pickup: teleport onto chip 0.
  await evalJs(`(() => { const g = window.__nightshift; const s = g.intelSpots[0]; g.player.x = s.x; g.player.y = s.y; })()`);
  await sleep(400);
  check('intel collected on touch', (await evalJs(`window.__nightshift.intelCollected[0]`)) === true);
  check('score increased', (await evalJs(`window.__nightshift.score`)) >= 250);

  // Win: collect the rest, open the exit, walk onto it.
  await evalJs(`(() => { const g = window.__nightshift; g.intelCollected = [true, true, true]; g.exitOpen = true; g.player.x = g.exitPos.x; g.player.y = g.exitPos.y; })()`);
  await sleep(400);
  check('win phase on reaching open exit', (await evalJs(`window.__nightshift.phase`)) === 'win');

  // Restart with Enter, then game over path: force lives to 1 and get caught.
  await key('keyDown', 'Enter', 'Enter');
  await key('keyUp', 'Enter', 'Enter');
  await sleep(300);
  check('restart works', (await evalJs(`window.__nightshift.phase`)) === 'playing');
  await evalJs(`(() => { const g = window.__nightshift; g.lives = 1;
    const guard = g.guards[0]; guard.x = g.player.x + 10; guard.y = g.player.y; guard.state = 'chase';
    guard.suspicion = 1; guard.caughtCooldown = 0; g.player.invulnerableUntil = 0; })()`);
  await sleep(500);
  check('game over after last life lost', (await evalJs(`window.__nightshift.phase`)) === 'gameover');

  check('no JS exceptions during playtest', exceptions.length === 0, exceptions.join(' | ').slice(0, 300));

  ws.close();
} catch (e) {
  console.log('PLAYTEST ERROR:', e.message);
  failures++;
} finally {
  chrome.kill();
}

console.log(failures === 0 ? 'PLAYTEST ALL PASS' : `PLAYTEST ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
