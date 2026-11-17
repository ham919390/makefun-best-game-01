// Keyboard and mouse, read as the game needs them: a steering vector (arrows or WASD), an
// optional pointer the lantern leans toward while the mouse is held, and one-shot actions
// (confirm, pause, mute) the main loop collects once a frame.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const STEER_KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
};

export function createInput(canvas) {
  const held = { left: false, right: false, up: false, down: false };
  const pointer = { x: FIELD.width / 2, y: FIELD.height / 2, active: false };
  let pending = 0;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    const steer = STEER_KEYS[event.code];
    if (steer) {
      held[steer] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'Space' || event.code === 'Enter') {
      pending |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'Escape' || event.code === 'KeyP') {
      pending |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      pending |= ACTION_MUTE;
    }
  });

  window.addEventListener('keyup', (event) => {
    const steer = STEER_KEYS[event.code];
    if (steer) held[steer] = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.active = true;
    pending |= ACTION_CONFIRM;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointer.active) return;
    const point = toLogical(event);
    pointer.x = point.x;
    pointer.y = point.y;
  });
  function releasePointer() {
    pointer.active = false;
  }
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  window.addEventListener('blur', () => {
    held.left = held.right = held.up = held.down = false;
    pointer.active = false;
  });

  return {
    /** The keyboard steering vector, each axis -1, 0 or 1. */
    direction() {
      return {
        x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    /** Where the mouse pulls the lantern, and whether it pulls at all. */
    pointer() {
      return pointer;
    },
    /** The actions pressed since the last call; reading them clears them. */
    takeActions() {
      const actions = pending;
      pending = 0;
      return actions;
    },
  };
}
