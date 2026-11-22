// NIGHTSHIFT: BLACKOUT — the player.
// Movement with axis-separated wall sliding, sneak/run speeds,
// intel pickup and the exit check.

import { TILE, PLAYER_RADIUS, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED } from './config.js';
import { circleHitsWall, isShadowTile } from './level.js';

export function createPlayer(level) {
  return {
    x: level.playerStart.x,
    y: level.playerStart.y,
    radius: PLAYER_RADIUS,
    facing: 0, // radians, for the little direction tick
    sneaking: false,
    running: false,
    moving: false,
    invulnerableUntil: 0, // ms timestamp, set after being caught
    stepPhase: 0, // advances while moving, drives footstep sounds
  };
}

export function resetPlayer(player, level) {
  player.x = level.playerStart.x;
  player.y = level.playerStart.y;
  player.facing = 0;
  player.invulnerableUntil = 0;
}

// Move the player one frame. Returns 'step' when a footstep lands,
// so the audio module can play it.
export function updatePlayer(player, level, move, sneaking, dt) {
  const speed = sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  player.sneaking = sneaking;
  player.running = false; // no run key: walk is the fast, loud mode
  player.moving = move.x !== 0 || move.y !== 0;
  if (!player.moving) return null;

  player.facing = Math.atan2(move.y, move.x);
  const step = speed * dt;
  const nx = player.x + move.x * step;
  if (!circleHitsWall(level, nx, player.y, player.radius)) player.x = nx;
  const ny = player.y + move.y * step;
  if (!circleHitsWall(level, player.x, ny, player.radius)) player.y = ny;

  const stride = sneaking ? 26 : 34;
  player.stepPhase += step;
  if (player.stepPhase >= stride) {
    player.stepPhase -= stride;
    return 'step';
  }
  return null;
}

export function playerTile(player) {
  return { col: Math.floor(player.x / TILE), row: Math.floor(player.y / TILE) };
}

export function playerInShadow(level, player) {
  const { col, row } = playerTile(player);
  return isShadowTile(level, col, row);
}

// Distance from the player to a point, in pixels.
export function playerDistanceTo(player, x, y) {
  const dx = player.x - x;
  const dy = player.y - y;
  return Math.hypot(dx, dy);
}
