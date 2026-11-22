// NIGHTSHIFT: BLACKOUT — the level.
// The warehouse is built from wall rectangles and feature lists instead
// of ASCII art, so a typo can never shift a whole row. Tiles:
//   0 floor, 1 wall, 2 crate (cover, blocks sight), 3 shadow (hides).
// Intel chips, the player start and the exit sit on floor tiles.

import { TILE, MAP_COLS, MAP_ROWS } from './config.js';

export const T_FLOOR = 0;
export const T_WALL = 1;
export const T_CRATE = 2;
export const T_SHADOW = 3;

function emptyGrid() {
  const grid = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    grid.push(new Array(MAP_COLS).fill(T_FLOOR));
  }
  return grid;
}

function wallRect(grid, x, y, w, h) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      grid[yy][xx] = T_WALL;
    }
  }
}

function shadowRect(grid, x, y, w, h) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (grid[yy][xx] === T_FLOOR) grid[yy][xx] = T_SHADOW;
    }
  }
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

export function buildLevel() {
  const grid = emptyGrid();

  // Border walls.
  wallRect(grid, 0, 0, MAP_COLS, 1);
  wallRect(grid, 0, MAP_ROWS - 1, MAP_COLS, 1);
  wallRect(grid, 0, 0, 1, MAP_ROWS);
  wallRect(grid, MAP_COLS - 1, 0, 1, MAP_ROWS);

  // Vertical wall A splits the left wing from the middle hall.
  // Gap at row 7 is the only way through.
  wallRect(grid, 8, 1, 1, 6);
  wallRect(grid, 8, 8, 1, 7);

  // Vertical wall B splits the middle hall from the east wing.
  // Gap at row 11 is the only way through.
  wallRect(grid, 17, 1, 1, 10);
  wallRect(grid, 17, 12, 1, 3);

  // Horizontal wall C makes a pocket in the top of the middle hall.
  wallRect(grid, 10, 4, 7, 1);
  // Horizontal wall D makes a pocket in the bottom of the left wing,
  // with a gap at column 6 so BISHOP's patrol can pass through.
  wallRect(grid, 3, 10, 3, 1);
  wallRect(grid, 7, 10, 1, 1);

  // Crates: solid cover that blocks movement and sight. None of them
  // sits on a guard patrol leg, so no guard ever gets stuck on one.
  const crates = [
    [3, 2], [5, 6], [7, 13], [13, 11], [21, 3],
    [19, 13], [11, 11], [22, 13], [4, 8], [12, 10],
  ];
  for (const [cx, cy] of crates) grid[cy][cx] = T_CRATE;

  // Shadow pools: standing in one makes detection much slower.
  shadowRect(grid, 2, 4, 2, 2);
  shadowRect(grid, 11, 6, 3, 2);
  shadowRect(grid, 20, 12, 3, 2);
  shadowRect(grid, 5, 12, 2, 2);
  shadowRect(grid, 19, 6, 2, 2);

  const playerStart = tileCenter(1, 1);
  const exit = tileCenter(22, 2);
  const intelSpots = [tileCenter(13, 2), tileCenter(21, 9), tileCenter(12, 13)];

  // Guard patrol loops, as tile waypoints. Every leg between two
  // consecutive waypoints is a straight, unblocked run.
  const guardSpawns = [
    { name: 'ROOK', waypoints: [[10, 6], [15, 6], [15, 8], [10, 8]] },
    { name: 'BISHOP', waypoints: [[3, 5], [2, 8], [2, 12], [6, 12], [6, 5]] },
    { name: 'KNIGHT', waypoints: [[20, 5], [23, 5], [23, 12], [20, 12]] },
    { name: 'QUEEN', waypoints: [[10, 13], [15, 13], [15, 9], [10, 9]] },
  ];

  return { grid, cols: MAP_COLS, rows: MAP_ROWS, playerStart, exit, intelSpots, guardSpawns };
}

export function tileAt(level, col, row) {
  if (col < 0 || row < 0 || col >= level.cols || row >= level.rows) return T_WALL;
  return level.grid[row][col];
}

export function isBlockingTile(level, col, row) {
  const t = tileAt(level, col, row);
  return t === T_WALL || t === T_CRATE;
}

export function isShadowTile(level, col, row) {
  return tileAt(level, col, row) === T_SHADOW;
}

// Does a circle of the given radius at (x, y) overlap a blocking tile?
export function circleHitsWall(level, x, y, radius) {
  const minCol = Math.floor((x - radius) / TILE);
  const maxCol = Math.floor((x + radius) / TILE);
  const minRow = Math.floor((y - radius) / TILE);
  const maxRow = Math.floor((y + radius) / TILE);
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (!isBlockingTile(level, col, row)) continue;
      const nearestX = Math.max(col * TILE, Math.min(x, (col + 1) * TILE));
      const nearestY = Math.max(row * TILE, Math.min(y, (row + 1) * TILE));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

// Bresenham over tiles: true when no wall or crate stands between
// the two pixel positions.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  let col0 = Math.floor(x0 / TILE);
  let row0 = Math.floor(y0 / TILE);
  const col1 = Math.floor(x1 / TILE);
  const row1 = Math.floor(y1 / TILE);
  const dCol = Math.abs(col1 - col0);
  const dRow = Math.abs(row1 - row0);
  const stepCol = col0 < col1 ? 1 : -1;
  const stepRow = row0 < row1 ? 1 : -1;
  let err = dCol - dRow;
  for (let guard = 0; guard < 200; guard++) {
    if (col0 === col1 && row0 === row1) return true;
    if (isBlockingTile(level, col0, row0)) return false;
    const e2 = 2 * err;
    if (e2 > -dRow) { err -= dRow; col0 += stepCol; }
    if (e2 < dCol) { err += dCol; row0 += stepRow; }
  }
  return true;
}
