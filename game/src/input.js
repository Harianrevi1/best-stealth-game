// NIGHTSHIFT: BLACKOUT — keyboard input.
// Tracks which movement keys are held and fires one-shot actions
// (start, restart, interact) through a small callback queue.

export function createInput() {
  const keys = new Set();
  const pressed = []; // one-shot keys consumed by the game loop
  let onFirstKey = null;

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
    Space: 'interact', KeyE: 'interact',
    Enter: 'confirm',
    KeyR: 'restart',
  };

  function down(e) {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!e.repeat) pressed.push(action);
    keys.add(action);
    if (onFirstKey) { const cb = onFirstKey; onFirstKey = null; cb(); }
  }

  function up(e) {
    const action = KEYMAP[e.code];
    if (action) keys.delete(action);
  }

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  return {
    // Held movement direction, normalised, or {x:0,y:0}.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('left')) x -= 1;
      if (keys.has('right')) x += 1;
      if (keys.has('up')) y -= 1;
      if (keys.has('down')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    get sneaking() { return keys.has('sneak'); },
    get moving() {
      return keys.has('left') || keys.has('right') || keys.has('up') || keys.has('down');
    },
    // Take and clear the one-shot presses since the last frame.
    takePressed() {
      const out = pressed.splice(0, pressed.length);
      return out;
    },
    // Called once on the next keydown (used to unlock audio).
    onceFirstKey(cb) { onFirstKey = cb; },
  };
}
