// The night itself: lantern, flame, embers, storm wisps, wind gusts and sparks, advanced in
// fixed steps. Nothing here touches the page: the renderer draws what the world holds and the
// sounds answer the events a step returns, which is also what lets a headless run play the
// game start to finish to prove the climb can be won.
import {
  EMBER, FIELD, FLAME, GOAL_ALTITUDE, GUST, LANTERN, LIVES,
  METRES_PER_PIXEL, RISE_PER_WATCH, RISE_SPEED, WATCHES, WISP,
} from './config.js';

export const EVENT_EMBER = 1;
export const EVENT_GOLD = 2;
export const EVENT_HIT = 4;
export const EVENT_GUST = 8;
export const EVENT_WATCH = 16;
export const EVENT_WON = 32;
export const EVENT_OVER = 64;

const MAX_PARTICLES = 260;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Which watch of the night an altitude is in: 0 to 3, a quarter of the climb each. */
export function watchIndex(altitude) {
  return Math.min(WATCHES.length - 1, Math.floor((altitude / GOAL_ALTITUDE) * WATCHES.length));
}

export function createWorld(random) {
  const state = {
    time: 0,
    altitude: 0,
    score: 0,
    lives: LIVES,
    flame: FLAME.start,
    lantern: { x: FIELD.width / 2, y: LANTERN.homeY, vx: 0, vy: 0, tilt: 0, invulnerable: 0 },
    embers: [],
    wisps: [],
    particles: [],
    gust: { phase: 'calm', timer: GUST.firstAt, direction: 1 },
    emberTimer: 0.4,
    wispTimer: 2.2,
    won: false,
    over: false,
    endReason: '',
  };

  function spawnParticle(x, y, vx, vy, life, size, color) {
    let slot = state.particles.find((p) => p.life <= 0);
    if (!slot) {
      if (state.particles.length >= MAX_PARTICLES) return;
      slot = { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: '#fff' };
      state.particles.push(slot);
    }
    slot.x = x; slot.y = y; slot.vx = vx; slot.vy = vy;
    slot.life = life; slot.maxLife = life; slot.size = size; slot.color = color;
  }

  function burst(x, y, count, color, speed) {
    for (let i = 0; i < count; i++) {
      const angle = random.next() * Math.PI * 2;
      const pace = speed * (0.3 + random.next() * 0.7);
      spawnParticle(x, y, Math.cos(angle) * pace, Math.sin(angle) * pace,
        random.range(0.3, 0.8), random.range(1.5, 3.5), color);
    }
  }

  function spawnEmber() {
    const gold = random.chance(EMBER.goldChance);
    state.embers.push({
      baseX: random.range(40, FIELD.width - 40),
      x: 0, y: -24,
      phase: random.next() * Math.PI * 2,
      gold,
      radius: gold ? EMBER.goldRadius : EMBER.radius,
      active: true,
    });
  }

  function spawnWisp() {
    state.wisps.push({
      x: random.range(50, FIELD.width - 50),
      y: -30,
      phase: random.next() * Math.PI * 2,
      active: true,
    });
  }

  function reset() {
    state.time = 0;
    state.altitude = 0;
    state.score = 0;
    state.lives = LIVES;
    state.flame = FLAME.start;
    state.lantern.x = FIELD.width / 2;
    state.lantern.y = LANTERN.homeY;
    state.lantern.vx = 0;
    state.lantern.vy = 0;
    state.lantern.tilt = 0;
    state.lantern.invulnerable = 0;
    state.embers.length = 0;
    state.wisps.length = 0;
    state.particles.length = 0;
    state.gust.phase = 'calm';
    state.gust.timer = GUST.firstAt;
    state.gust.direction = 1;
    state.emberTimer = 0.4;
    state.wispTimer = 2.2;
    state.won = false;
    state.over = false;
    state.endReason = '';
  }

  /**
   * Advance one fixed step. `move` is the keyboard vector, `pointer` the held mouse (or null),
   * `attract` runs the title-screen drift: things fall, nothing can be won or lost.
   * Returns the events that happened, as a bitmask of the EVENT_ constants.
   */
  function step(dt, move, pointer, attract) {
    let events = 0;
    const lantern = state.lantern;
    state.time += dt;
    const watch = watchIndex(state.altitude);
    const rise = RISE_SPEED + watch * RISE_PER_WATCH;
    const scroll = rise * dt;

    // The wind: calm, then a warning, then the blow itself.
    const gust = state.gust;
    gust.timer -= dt;
    if (gust.phase === 'calm' && gust.timer <= 0) {
      gust.phase = 'warn';
      gust.timer = GUST.warnSeconds;
      gust.direction = random.chance(0.5) ? -1 : 1;
    } else if (gust.phase === 'warn' && gust.timer <= 0) {
      gust.phase = 'blow';
      gust.timer = GUST.blowSeconds;
      events |= EVENT_GUST;
    } else if (gust.phase === 'blow' && gust.timer <= 0) {
      gust.phase = 'calm';
      gust.timer = random.range(GUST.intervalMin, GUST.intervalMax);
    }
    const windAccel = gust.phase === 'blow' ? gust.direction * (GUST.force + watch * GUST.forcePerWatch) : 0;

    // Steering: keys push, a held pointer springs the lantern toward it, calm air settles it home.
    if (attract) {
      lantern.x = FIELD.width / 2 + Math.sin(state.time * 0.45) * 130;
      lantern.y = LANTERN.homeY + Math.sin(state.time * 0.8) * 18;
      lantern.tilt = Math.cos(state.time * 0.45) * 0.12;
    } else {
      let ax = move.x * LANTERN.accel + windAccel;
      let ay = move.y * LANTERN.accel * 0.82;
      if (pointer && pointer.active) {
        ax += (pointer.x - lantern.x) * 24;
        ay += (pointer.y - lantern.y) * 18;
      } else if (move.y === 0) {
        ay += (LANTERN.homeY - lantern.y) * 2.4;
      }
      lantern.vx += ax * dt;
      lantern.vy += ay * dt;
      lantern.vx -= lantern.vx * LANTERN.drag * dt;
      lantern.vy -= lantern.vy * LANTERN.drag * dt;
      lantern.vx = clamp(lantern.vx, -LANTERN.maxSpeed, LANTERN.maxSpeed);
      lantern.vy = clamp(lantern.vy, -LANTERN.maxSpeed * 0.8, LANTERN.maxSpeed * 0.8);
      lantern.x = clamp(lantern.x + lantern.vx * dt, LANTERN.radius, FIELD.width - LANTERN.radius);
      lantern.y = clamp(lantern.y + lantern.vy * dt, 90, FIELD.height - 60);
      lantern.tilt = clamp(lantern.vx / LANTERN.maxSpeed, -1, 1) * 0.38;
    }
    if (lantern.invulnerable > 0) lantern.invulnerable -= dt;

    // The climb and the flame.
    if (!attract && !state.over && !state.won) {
      const before = watchIndex(state.altitude);
      state.altitude += rise * dt * METRES_PER_PIXEL;
      if (watchIndex(state.altitude) !== before) events |= EVENT_WATCH;
      state.flame -= (FLAME.drainPerSecond + watch * FLAME.drainPerWatch) * dt;
      if (state.flame <= 0) {
        state.flame = 0;
        state.over = true;
        state.endReason = 'flame';
        events |= EVENT_OVER;
      } else if (state.altitude >= GOAL_ALTITUDE) {
        state.won = true;
        burst(lantern.x, lantern.y - 20, 42, '#ffe95c', 260);
        events |= EVENT_WON;
      }
    }

    // Spawning: embers everywhere, wisps thicker in the later watches.
    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawnEmber();
      const pace = EMBER.interval * (1 - 0.06 * watch);
      state.emberTimer = pace * random.range(1 - EMBER.intervalJitter, 1 + EMBER.intervalJitter);
    }
    state.wispTimer -= dt;
    if (state.wispTimer <= 0) {
      spawnWisp();
      const pace = Math.max(WISP.minInterval, WISP.interval - watch * WISP.intervalPerWatch);
      state.wispTimer = pace * random.range(0.7, 1.3);
    }

    // Embers drift down with the night and sway; eat the ones the lantern touches.
    for (const ember of state.embers) {
      if (!ember.active) continue;
      ember.y += scroll + EMBER.drift * dt;
      ember.x = ember.baseX + Math.sin(state.time * 1.7 + ember.phase) * 14;
      if (ember.y > FIELD.height + 40) { ember.active = false; continue; }
      if (!attract && !state.over && !state.won) {
        const dx = ember.x - lantern.x;
        const dy = ember.y - (lantern.y - 6);
        if (dx * dx + dy * dy < (LANTERN.radius + ember.radius) * (LANTERN.radius + ember.radius)) {
          ember.active = false;
          state.score += ember.gold ? EMBER.goldPoints : EMBER.points;
          state.flame = Math.min(FLAME.max, state.flame + (ember.gold ? FLAME.goldFeed : FLAME.emberFeed));
          burst(ember.x, ember.y, ember.gold ? 14 : 7, ember.gold ? '#ffe95c' : '#ffd76a', 130);
          events |= ember.gold ? EVENT_GOLD : EVENT_EMBER;
        }
      }
    }

    // Wisps dive and home; a touch costs a light, unless the lantern is still reeling.
    for (const wisp of state.wisps) {
      if (!wisp.active) continue;
      wisp.y += scroll + (WISP.fallSpeed + watch * WISP.fallPerWatch) * dt;
      wisp.x += Math.sin(state.time * WISP.wobble + wisp.phase) * 34 * dt;
      wisp.x += clamp(lantern.x - wisp.x, -1, 1) * WISP.homing * dt;
      if (wisp.y > FIELD.height + 50) { wisp.active = false; continue; }
      if (!attract && !state.over && !state.won && lantern.invulnerable <= 0) {
        const dx = wisp.x - lantern.x;
        const dy = wisp.y - lantern.y;
        const reach = LANTERN.radius * 0.85 + WISP.radius;
        if (dx * dx + dy * dy < reach * reach) {
          wisp.active = false;
          state.lives -= 1;
          state.flame = Math.max(0, state.flame - FLAME.hitCost);
          lantern.invulnerable = LANTERN.invulnerable;
          burst(lantern.x, lantern.y, 22, '#c792ff', 220);
          events |= EVENT_HIT;
          if (state.lives <= 0) {
            state.over = true;
            state.endReason = 'wisps';
            events |= EVENT_OVER;
          } else if (state.flame <= 0) {
            state.over = true;
            state.endReason = 'flame';
            events |= EVENT_OVER;
          }
        }
      }
    }
    state.embers = state.embers.filter((e) => e.active);
    state.wisps = state.wisps.filter((w) => w.active);

    // The flame's own trail, and every spark's short life.
    if (random.chance(0.65)) {
      spawnParticle(
        lantern.x + random.range(-5, 5), lantern.y + 16,
        random.range(-14, 14) + scroll * 0.4, random.range(30, 70),
        random.range(0.35, 0.8), random.range(1.5, 3.2),
        random.pick(['#ffb347', '#ff7847', '#ffd76a']),
      );
    }
    for (const p of state.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt + scroll * 0.6;
      p.vx -= p.vx * 1.6 * dt;
      p.vy -= p.vy * 1.6 * dt;
    }

    return events;
  }

  return { state, reset, step };
}
