// NIGHTSHIFT: BLACKOUT — screenshot presets.
// ?shot=start | play | alert | exit freezes the game into one
// readable scene so screenshots are deterministic: the simulation
// does not advance while a shot is staged.

import { tileCenter } from './level.js';

function placeGuardAt(guard, col, row, facing) {
  const p = tileCenter(col, row);
  guard.x = p.x;
  guard.y = p.y;
  guard.facing = facing;
  guard.suspicion = 0;
  guard.state = 'patrol';
  guard.waitTimer = 0;
}

export function applyShot(game, shot) {
  const { level, player, guards } = game;
  game.frozen = true;
  game.alarmOn = false;

  if (shot === 'start') {
    game.phase = 'title';
    game.elapsed = 0;
    game.score = 0;
    game.lives = 3;
    game.intelCollected = game.intelSpots.map(() => false);
    game.exitOpen = false;
    player.x = level.playerStart.x;
    player.y = level.playerStart.y;
    player.sneaking = false;
    guards.forEach((g, i) => {
      const wp = level.guardSpawns[i].waypoints[0];
      placeGuardAt(g, wp[0], wp[1], 0);
    });
    return true;
  }

  if (shot === 'play') {
    game.phase = 'playing';
    game.elapsed = 42;
    game.score = 250;
    game.lives = 3;
    game.intelCollected = [true, false, false];
    game.exitOpen = false;
    const p = tileCenter(6, 6);
    player.x = p.x;
    player.y = p.y;
    player.sneaking = true;
    player.facing = 0;
    placeGuardAt(guards[0], 12, 3, Math.PI / 2);
    placeGuardAt(guards[1], 3, 8, 0);
    placeGuardAt(guards[2], 21, 8, -Math.PI / 2);
    placeGuardAt(guards[3], 13, 11, Math.PI);
    return true;
  }

  if (shot === 'alert') {
    game.phase = 'playing';
    game.elapsed = 87;
    game.score = 500;
    game.lives = 2;
    game.intelCollected = [true, true, false];
    game.exitOpen = false;
    game.alarmOn = true;
    const p = tileCenter(12, 7);
    player.x = p.x;
    player.y = p.y;
    player.sneaking = false;
    player.facing = -Math.PI / 2;
    placeGuardAt(guards[0], 12, 5, Math.PI / 2);
    guards[0].suspicion = 1;
    guards[0].state = 'chase';
    placeGuardAt(guards[1], 4, 9, Math.PI / 2);
    placeGuardAt(guards[2], 21, 10, Math.PI);
    placeGuardAt(guards[3], 14, 12, 0);
    guards[3].suspicion = 0.6;
    guards[3].state = 'suspicious';
    return true;
  }

  if (shot === 'exit') {
    game.phase = 'playing';
    game.elapsed = 118;
    game.score = 750;
    game.lives = 3;
    game.intelCollected = [true, true, true];
    game.exitOpen = true;
    const p = tileCenter(21, 3);
    player.x = p.x;
    player.y = p.y;
    player.sneaking = false;
    player.facing = -Math.PI / 2;
    placeGuardAt(guards[0], 11, 3, 0);
    placeGuardAt(guards[1], 5, 7, Math.PI / 2);
    placeGuardAt(guards[2], 20, 5, -Math.PI / 2);
    guards[2].suspicion = 0.5;
    guards[2].state = 'suspicious';
    placeGuardAt(guards[3], 12, 12, Math.PI);
    return true;
  }

  return false;
}
