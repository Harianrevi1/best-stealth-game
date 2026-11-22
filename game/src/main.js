// NIGHTSHIFT: BLACKOUT — game state and main loop.
// Phases: title -> playing -> win | gameover. Caught costs a life
// and respawns the player; three catches end the run.

import { VIEW_W, VIEW_H, INTEL_TO_COLLECT, INTEL_SCORE, WIN_TIME_BONUS_BASE, WIN_TIME_BONUS_PER_SECOND, START_LIVES, ALARM_RING_SECONDS } from './config.js';
import { buildLevel } from './level.js';
import { createInput } from './input.js';
import { createPlayer, resetPlayer, updatePlayer, playerDistanceTo } from './player.js';
import { createGuards, resetGuards, updateGuard, maxSuspicion, anyGuardChasing } from './guards.js';
import { createAudio } from './audio.js';
import { renderScene, updateHud, showOverlay, hideOverlays } from './render.js';
import { applyShot } from './shots.js';

export function createGame(canvas) {
  const level = buildLevel();
  const game = {
    canvas,
    ctx: canvas.getContext('2d'),
    level,
    player: createPlayer(level),
    guards: createGuards(level),
    intelSpots: level.intelSpots,
    intelCollected: level.intelSpots.map(() => false),
    exitPos: level.exit,
    exitOpen: false,
    phase: 'title', // title | playing | win | gameover
    lives: START_LIVES,
    score: 0,
    elapsed: 0,
    alarmOn: false,
    alarmTimer: 0,
    timesSpotted: 0,
    frozen: false, // true while a ?shot= scene is staged
    input: createInput(),
    audio: createAudio(),
    lastTime: 0,
  };
  return game;
}

function resetRun(game) {
  resetPlayer(game.player, game.level);
  resetGuards(game.guards, game.level);
  game.intelCollected = game.intelSpots.map(() => false);
  game.exitOpen = false;
  game.lives = START_LIVES;
  game.score = 0;
  game.elapsed = 0;
  game.alarmOn = false;
  game.alarmTimer = 0;
  game.timesSpotted = 0;
  game.phase = 'playing';
  hideOverlays();
}

function onCaught(game) {
  game.lives -= 1;
  game.audio.caught();
  if (game.lives <= 0) {
    game.phase = 'gameover';
    game.audio.lose();
    const el = document.getElementById('lose-stats');
    if (el) el.textContent = `Intel ${game.intelCollected.filter(Boolean).length}/${INTEL_TO_COLLECT} · Score ${game.score} · Survived ${Math.floor(game.elapsed)}s`;
    showOverlay('overlay-lose');
    return;
  }
  resetPlayer(game.player, game.level);
  resetGuards(game.guards, game.level);
  game.player.invulnerableUntil = performance.now() + 2000;
  game.alarmOn = false;
  game.alarmTimer = 0;
}

function onWin(game) {
  game.phase = 'win';
  const bonus = Math.max(0, WIN_TIME_BONUS_BASE - Math.floor(game.elapsed) * WIN_TIME_BONUS_PER_SECOND);
  game.score += bonus;
  game.audio.win();
  const el = document.getElementById('win-stats');
  if (el) el.textContent = `Time ${Math.floor(game.elapsed)}s · Spotted ${game.timesSpotted}x · Time bonus +${bonus} · Score ${game.score}`;
  showOverlay('overlay-win');
}

function updatePlaying(game, dt, now) {
  const pressed = game.input.takePressed();
  if (pressed.includes('restart')) { resetRun(game); return; }

  game.elapsed += dt;

  // Alarm clock: rings for a while after a guard spots the player.
  if (game.alarmOn) {
    game.alarmTimer -= dt;
    if (game.alarmTimer <= 0) game.alarmOn = false;
  }

  const move = game.input.moveVector();
  const step = updatePlayer(game.player, game.level, move, game.input.sneaking, dt);
  if (step === 'step') game.audio.step(game.player.sneaking);

  for (const guard of game.guards) {
    const event = updateGuard(guard, game.level, game.player, dt, now);
    if (event === 'spotted') {
      game.timesSpotted += 1;
      game.alarmOn = true;
      game.alarmTimer = ALARM_RING_SECONDS;
      game.audio.spotted();
    } else if (event === 'caught') {
      onCaught(game);
      return;
    }
  }

  // Intel pickup: walk over a chip to collect it.
  for (let i = 0; i < game.intelSpots.length; i++) {
    if (game.intelCollected[i]) continue;
    const spot = game.intelSpots[i];
    if (playerDistanceTo(game.player, spot.x, spot.y) < 26) {
      game.intelCollected[i] = true;
      game.score += INTEL_SCORE;
      game.audio.pickup();
      if (game.intelCollected.every(Boolean)) {
        game.exitOpen = true;
        game.audio.exitOpen();
      }
    }
  }

  // Reaching the open exit wins the run.
  if (game.exitOpen && playerDistanceTo(game.player, game.exitPos.x, game.exitPos.y) < 26) {
    onWin(game);
  }
}

function frame(game, now) {
  const dt = Math.min(0.05, (now - game.lastTime) / 1000 || 0.016);
  game.lastTime = now;

  if (!game.frozen) {
    if (game.phase === 'title') {
      const pressed = game.input.takePressed();
      if (pressed.includes('confirm') || pressed.includes('interact')) {
        game.audio.unlock();
        resetRun(game);
      }
    } else if (game.phase === 'playing') {
      updatePlaying(game, dt, now);
    } else {
      const pressed = game.input.takePressed();
      if (pressed.includes('confirm') || pressed.includes('restart')) {
        game.audio.unlock();
        resetRun(game);
      }
    }
  }

  renderScene(game.ctx, game, now);
  updateHud(game);
  requestAnimationFrame((t) => frame(game, t));
}

export function startGame() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const game = createGame(canvas);

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot && applyShot(game, shot)) {
    showOverlay(game.phase === 'title' ? 'overlay-title' : '');
    if (game.phase !== 'title') hideOverlays();
  } else {
    showOverlay('overlay-title');
  }

  game.input.onceFirstKey(() => game.audio.unlock());
  requestAnimationFrame((t) => { game.lastTime = t; frame(game, t); });
  // Debug handle for play-testing (reading state, never used by the game).
  window.__nightshift = game;
  return game;
}
