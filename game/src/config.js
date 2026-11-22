// NIGHTSHIFT: BLACKOUT — configuration.
// Every tunable number for the game lives here so balancing never
// means hunting through the other modules.

export const TILE = 40;
export const MAP_COLS = 26;
export const MAP_ROWS = 16;
export const VIEW_W = MAP_COLS * TILE; // 1040
export const VIEW_H = MAP_ROWS * TILE; // 640

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 148; // px per second
export const PLAYER_SNEAK_SPEED = 82;

export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 58;
export const GUARD_CHASE_SPEED = 118;
export const GUARD_VISION_RANGE = 235;
export const GUARD_VISION_HALF_ANGLE = Math.PI / 5.2; // ~35 degrees
export const GUARD_WAIT_AT_WAYPOINT = 1.4; // seconds

// How fast a guard's suspicion (0..1) climbs while the player is seen.
export const DETECT_BASE_RATE = 0.62;
export const DETECT_CLOSE_BOOST = 1.7; // multiplier at point blank
export const DETECT_SNEAK_MULT = 0.5;
export const DETECT_SHADOW_MULT = 0.22;
export const DETECT_DECAY_RATE = 0.34; // per second while unseen
export const SUSPICIOUS_AT = 0.45; // guard stops and stares
export const ALERT_AT = 1.0;

export const CHASE_GIVE_UP_SECONDS = 3.0; // unseen this long -> back to patrol
export const ALARM_RING_SECONDS = 6.0;
export const START_LIVES = 3;
export const INTEL_TO_COLLECT = 3;
export const INTEL_SCORE = 250;
export const WIN_TIME_BONUS_BASE = 3000;
export const WIN_TIME_BONUS_PER_SECOND = 10;

export const COLORS = {
  floorA: '#16202e',
  floorB: '#131c28',
  floorLine: '#1d2a3a',
  wall: '#2b3a52',
  wallTop: '#42587a',
  crate: '#5d4a2a',
  crateEdge: '#8a6d3b',
  shadow: 'rgba(2, 6, 14, 0.72)',
  shadowEdge: 'rgba(90, 140, 190, 0.25)',
  intel: '#37e0a0',
  exitLocked: '#7a2e2e',
  exitOpen: '#2ee66b',
  player: '#39c6ff',
  playerSneak: '#2a9fd8',
  guard: '#ff5340',
  guardSuspicious: '#ff9a1f',
  coneCalm: 'rgba(255, 214, 64, 0.20)',
  coneSuspicious: 'rgba(255, 154, 31, 0.30)',
  coneAlert: 'rgba(255, 60, 40, 0.38)',
  coneEdge: 'rgba(255, 214, 64, 0.35)',
  text: '#dfe9f5',
  danger: '#ff5340',
};
