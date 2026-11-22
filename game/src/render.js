// NIGHTSHIFT: BLACKOUT — rendering.
// Draws the whole scene on one canvas (floor, walls, crates, shadows,
// intel, exit, raycast vision cones, guards, player) and keeps the
// DOM HUD in sync. No images: every visual is drawn in code.

import { TILE, COLORS, GUARD_VISION_RANGE, GUARD_VISION_HALF_ANGLE } from './config.js';
import { T_WALL, T_CRATE, T_SHADOW, tileAt, isBlockingTile } from './level.js';

// Cast one ray of a vision cone until it hits a wall or runs out.
function rayHit(level, x, y, angle, maxDist) {
  const step = 6;
  let dist = 0;
  while (dist < maxDist) {
    dist += step;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (isBlockingTile(level, col, row)) break;
  }
  return { x: x + Math.cos(angle) * Math.min(dist, maxDist), y: y + Math.sin(angle) * Math.min(dist, maxDist) };
}

function coneColor(guard) {
  if (guard.state === 'chase') return COLORS.coneAlert;
  if (guard.state === 'suspicious') return COLORS.coneSuspicious;
  return COLORS.coneCalm;
}

function drawCone(ctx, level, guard) {
  const rays = 26;
  const start = guard.facing - GUARD_VISION_HALF_ANGLE;
  const end = guard.facing + GUARD_VISION_HALF_ANGLE;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i++) {
    const a = start + ((end - start) * i) / rays;
    const hit = rayHit(level, guard.x, guard.y, a, GUARD_VISION_RANGE);
    ctx.lineTo(hit.x, hit.y);
  }
  ctx.closePath();
  ctx.fillStyle = coneColor(guard);
  ctx.fill();
  ctx.strokeStyle = COLORS.coneEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawFloor(ctx, level) {
  for (let row = 0; row < level.rows; row++) {
    for (let col = 0; col < level.cols; col++) {
      const t = level.grid[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (t === T_WALL) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 4);
        continue;
      }
      ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = COLORS.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      if (t === T_SHADOW) {
        ctx.fillStyle = COLORS.shadow;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = COLORS.shadowEdge;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (t === T_CRATE) {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      }
    }
  }
}

function drawIntel(ctx, intelSpots, collected, now) {
  for (let i = 0; i < intelSpots.length; i++) {
    if (collected[i]) continue;
    const p = intelSpots[i];
    const pulse = 1 + Math.sin(now / 240 + i) * 0.15;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulse, pulse);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.intel;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = '#0b2e21';
    ctx.lineWidth = 2;
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
  }
}

function drawExit(ctx, exit, open, now) {
  const glow = open ? 0.6 + Math.sin(now / 200) * 0.25 : 0.25;
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle = open ? COLORS.exitOpen : COLORS.exitLocked;
  ctx.beginPath();
  ctx.arc(exit.x, exit.y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = open ? COLORS.exitOpen : COLORS.exitLocked;
  ctx.fillRect(exit.x - 12, exit.y - 12, 24, 24);
  ctx.fillStyle = '#06130a';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', exit.x, exit.y - 22);
}

function drawGuard(ctx, guard) {
  const body = guard.state === 'chase'
    ? COLORS.danger
    : guard.state === 'suspicious' ? COLORS.guardSuspicious : COLORS.guard;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c0505';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * (guard.radius + 6), guard.y + Math.sin(guard.facing) * (guard.radius + 6));
  ctx.stroke();
  // Suspicion arc above the guard.
  if (guard.suspicion > 0.02) {
    ctx.strokeStyle = guard.suspicion >= 1 ? COLORS.danger : '#ffd640';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.suspicion);
    ctx.stroke();
  }
  if (guard.state !== 'patrol') {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - guard.radius - 10);
  }
}

function drawPlayer(ctx, player, now) {
  const blink = player.invulnerableUntil > now && Math.floor(now / 120) % 2 === 0;
  if (blink) return; // invulnerability blink
  ctx.fillStyle = player.sneaking ? COLORS.playerSneak : COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#06222e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(player.facing) * (player.radius + 5), player.y + Math.sin(player.facing) * (player.radius + 5));
  ctx.stroke();
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(57, 198, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function renderScene(ctx, game, now) {
  const { level, player, guards, intelSpots, intelCollected, exitOpen } = game;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawFloor(ctx, level);
  drawIntel(ctx, intelSpots, intelCollected, now);
  drawExit(ctx, game.exitPos, exitOpen, now);
  for (const guard of guards) drawCone(ctx, level, guard);
  for (const guard of guards) drawGuard(ctx, guard);
  drawPlayer(ctx, player, now);
  // Soft night vignette.
  const grad = ctx.createRadialGradient(
    ctx.canvas.width / 2, ctx.canvas.height / 2, ctx.canvas.height * 0.45,
    ctx.canvas.width / 2, ctx.canvas.height / 2, ctx.canvas.height * 0.95,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function updateHud(game) {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const intelGot = game.intelCollected.filter(Boolean).length;
  set('hud-objective', game.exitOpen
    ? 'REACH THE EXIT — it is open!'
    : `Collect intel ${intelGot}/${game.intelSpots.length}, then reach the exit`);
  set('hud-intel', `INTEL ${intelGot}/${game.intelSpots.length}`);
  set('hud-lives', '♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(Math.max(0, 3 - game.lives)));
  set('hud-timer', formatTime(game.elapsed));
  set('hud-score', `SCORE ${game.score}`);
  const meter = document.getElementById('hud-meter-fill');
  if (meter) {
    const worst = Math.max(0, ...game.guards.map((g) => g.suspicion));
    meter.style.width = `${Math.round(worst * 100)}%`;
    meter.style.background = worst >= 1 ? '#ff3c28' : worst >= 0.45 ? '#ff9a1f' : '#ffd640';
  }
  const alarm = document.getElementById('hud-alarm');
  if (alarm) alarm.style.visibility = game.alarmOn ? 'visible' : 'hidden';
}

export function showOverlay(id) {
  for (const name of ['overlay-title', 'overlay-win', 'overlay-lose']) {
    const el = document.getElementById(name);
    if (el) el.style.display = name === id ? 'flex' : 'none';
  }
}

export function hideOverlays() {
  showOverlay('');
}
