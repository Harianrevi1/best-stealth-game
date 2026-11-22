// NIGHTSHIFT: BLACKOUT — the guards.
// Each guard walks a waypoint loop and watches a vision cone. When the
// player is inside the cone with a clear line of sight, the guard's
// suspicion meter climbs — faster up close, slower when the player
// sneaks or hides in shadow. At full suspicion the guard gives chase
// and raises the alarm; breaking line of sight lets the meter fall
// again, so a careful player can always recover.

import {
  TILE, GUARD_RADIUS, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED,
  GUARD_VISION_RANGE, GUARD_VISION_HALF_ANGLE, GUARD_WAIT_AT_WAYPOINT,
  DETECT_BASE_RATE, DETECT_CLOSE_BOOST, DETECT_SNEAK_MULT,
  DETECT_SHADOW_MULT, DETECT_DECAY_RATE, SUSPICIOUS_AT, ALERT_AT,
  CHASE_GIVE_UP_SECONDS,
} from './config.js';
import { tileCenter, hasLineOfSight, circleHitsWall, isShadowTile } from './level.js';

export function createGuards(level) {
  return level.guardSpawns.map((spawn) => {
    const start = tileCenter(spawn.waypoints[0][0], spawn.waypoints[0][1]);
    const waypoints = spawn.waypoints.map(([c, r]) => tileCenter(c, r));
    return {
      name: spawn.name,
      x: start.x,
      y: start.y,
      radius: GUARD_RADIUS,
      waypoints,
      waypointIndex: 1,
      waitTimer: 0,
      facing: 0,
      suspicion: 0,
      state: 'patrol', // patrol | suspicious | chase
      lastSeenX: 0,
      lastSeenY: 0,
      unseenTimer: 0,
      caughtCooldown: 0,
    };
  });
}

export function resetGuards(guards, level) {
  const fresh = createGuards(level);
  for (let i = 0; i < guards.length; i++) Object.assign(guards[i], fresh[i]);
}

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// Can this guard see the player right now?
export function guardSeesPlayer(guard, level, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VISION_RANGE) return { seen: false, dist };
  const toPlayer = Math.atan2(dy, dx);
  if (angleDiff(toPlayer, guard.facing) > GUARD_VISION_HALF_ANGLE) return { seen: false, dist };
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return { seen: false, dist };
  return { seen: true, dist };
}

function moveToward(guard, level, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  if (!circleHitsWall(level, nx, guard.y, guard.radius)) guard.x = nx;
  if (!circleHitsWall(level, guard.x, ny, guard.radius)) guard.y = ny;
  return dist - step < 2;
}

// One frame for one guard. Returns 'spotted' the moment the guard
// flips to full alert, 'caught' when it touches the player.
export function updateGuard(guard, level, player, dt, now) {
  if (guard.caughtCooldown > 0) guard.caughtCooldown -= dt;
  const { seen, dist } = guardSeesPlayer(guard, level, player);
  const inShadow = playerInShadowNow(level, player);

  if (seen) {
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    guard.unseenTimer = 0;
    const closeness = 1 + (1 - dist / GUARD_VISION_RANGE) * (DETECT_CLOSE_BOOST - 1);
    let rate = DETECT_BASE_RATE * closeness;
    if (player.sneaking) rate *= DETECT_SNEAK_MULT;
    if (inShadow) rate *= DETECT_SHADOW_MULT;
    guard.suspicion = Math.min(ALERT_AT, guard.suspicion + rate * dt);
  } else {
    guard.unseenTimer += dt;
    guard.suspicion = Math.max(0, guard.suspicion - DETECT_DECAY_RATE * dt);
  }

  // State machine. Once a guard is chasing, it keeps chasing until
  // the player has been out of sight for a while — suspicion decaying
  // below full must not cancel the chase on its own.
  const wasChase = guard.state === 'chase';
  if (wasChase) {
    if (guard.unseenTimer >= CHASE_GIVE_UP_SECONDS) {
      guard.state = 'patrol';
      guard.suspicion = Math.max(guard.suspicion, SUSPICIOUS_AT);
    }
  } else if (guard.suspicion >= ALERT_AT) {
    guard.state = 'chase';
  } else if (guard.suspicion >= SUSPICIOUS_AT) {
    guard.state = 'suspicious';
  } else {
    guard.state = 'patrol';
  }
  if (guard.state === 'chase' && !wasChase) return 'spotted';

  if (guard.state === 'chase') {
    moveToward(guard, level, player.x, player.y, GUARD_CHASE_SPEED, dt);
    if (guard.caughtCooldown <= 0 && now > player.invulnerableUntil) {
      const d = Math.hypot(player.x - guard.x, player.y - guard.y);
      if (d < guard.radius + player.radius + 2) return 'caught';
    }
    return null;
  }

  if (guard.state === 'suspicious') {
    // Freeze and stare at where the player was last seen.
    guard.facing = angleTo(guard.x, guard.y, guard.lastSeenX, guard.lastSeenY);
    return null;
  }

  // Patrol: walk the waypoint loop, pausing briefly at each stop.
  if (guard.waitTimer > 0) {
    guard.waitTimer -= dt;
    return null;
  }
  const target = guard.waypoints[guard.waypointIndex];
  if (moveToward(guard, level, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.waitTimer = GUARD_WAIT_AT_WAYPOINT;
  }
  return null;
}

function playerInShadowNow(level, player) {
  const col = Math.floor(player.x / TILE);
  const row = Math.floor(player.y / TILE);
  return isShadowTile(level, col, row);
}

// Highest suspicion across all guards — the HUD's alarm meter.
export function maxSuspicion(guards) {
  let m = 0;
  for (const g of guards) m = Math.max(m, g.suspicion);
  return m;
}

export function anyGuardChasing(guards) {
  return guards.some((g) => g.state === 'chase');
}
