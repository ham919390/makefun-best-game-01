// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the real rules forward
// from a fresh world, steered by a simple pilot, so the frame is what a real game looks like
// and the same seed always gives the same frame. The win scene starts near the Dawn Line and
// the end scene starts with one light left and a reckless pilot, so both endings are reached
// quickly and honestly, through the same step() a player plays.
import { FIELD, GOAL_ALTITUDE, STEP } from './config.js';
import { EVENT_OVER, EVENT_WON } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const NO_POINTER = null;
const STILL = { x: 0, y: 0 };

/**
 * A careful pilot: flee any wisp that comes close, otherwise lean toward the ember that will
 * be cheapest to reach, since embers are both score and life.
 */
function carefulPilot(state) {
  const lantern = state.lantern;
  let threat = null;
  let threatDist = 170;
  for (const wisp of state.wisps) {
    const dx = wisp.x - lantern.x;
    const dy = wisp.y - lantern.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < threatDist) { threatDist = dist; threat = wisp; }
  }
  if (threat) {
    const away = lantern.x <= threat.x ? -1 : 1;
    return { x: lantern.x < 90 ? 1 : lantern.x > FIELD.width - 90 ? -1 : away, y: 0 };
  }
  let target = null;
  let bestCost = Infinity;
  for (const ember of state.embers) {
    if (ember.y > lantern.y - 8) continue;
    const cost = Math.abs(ember.x - lantern.x) + (lantern.y - ember.y) * 0.2;
    if (cost < bestCost) { bestCost = cost; target = ember; }
  }
  if (!target) return STILL;
  const dx = target.x - lantern.x;
  return { x: dx > 14 ? 1 : dx < -14 ? -1 : 0, y: 0 };
}

/** A reckless pilot for the end scene: it chases the storm it should flee. */
function recklessPilot(state) {
  const lantern = state.lantern;
  let target = null;
  let bestDist = Infinity;
  for (const wisp of state.wisps) {
    const dist = Math.abs(wisp.x - lantern.x) + Math.abs(wisp.y - lantern.y);
    if (dist < bestDist) { bestDist = dist; target = wisp; }
  }
  if (!target) return STILL;
  const dx = target.x - lantern.x;
  return { x: dx > 6 ? 1 : dx < -6 ? -1 : 0, y: 0 };
}

function simulate(world, pilot, seconds, stopOnEvent) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    const events = world.step(STEP, pilot(world.state), NO_POINTER, false);
    if (stopOnEvent && (events & stopOnEvent)) return events;
    if (world.state.over || world.state.won) return events;
  }
  return 0;
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is start) and return
 * the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    simulate(world, carefulPilot, 150, 0);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    world.state.altitude = GOAL_ALTITUDE - 30;
    world.state.flame = 92;
    simulate(world, carefulPilot, 60, EVENT_WON);
    return { screen: world.state.won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    world.state.lives = 1;
    world.state.flame = 60;
    simulate(world, recklessPilot, 180, EVENT_OVER);
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  for (let i = 0; i < 4 / STEP; i++) world.step(STEP, STILL, NO_POINTER, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
