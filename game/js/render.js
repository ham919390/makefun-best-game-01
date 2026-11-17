// Everything the player sees: the night sky brightening toward dawn, the lantern and its
// flame, embers, wisps, wind, sparks, the HUD and the four screens around play. Canvas only,
// in the fixed 1280x720 logical field; CSS stretches the canvas, never the drawing.
import { FIELD, FLAME, FONT, GOAL_ALTITUDE, LANTERN, PALETTE, WATCHES } from './config.js';
import { createRandom } from './random.js';
import { watchIndex } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function mixColour(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');

  // A fixed starfield and cloud bank, dealt once from a fixed seed: the same sky every visit.
  const skyRandom = createRandom(20261115);
  const stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push({ x: skyRandom.next() * FIELD.width, y: skyRandom.next() * FIELD.height, r: skyRandom.range(0.7, 2.1), tw: skyRandom.next() * 6.28, layer: i % 3 });
  }
  const clouds = [];
  for (let i = 0; i < 11; i++) {
    clouds.push({ x: skyRandom.next() * FIELD.width, y: skyRandom.next() * FIELD.height, s: skyRandom.range(0.6, 1.7), far: i % 2 === 0 });
  }

  function drawSky(state, dawnMix) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, mixColour(PALETTE.nightTop, PALETTE.dawnTop, dawnMix));
    gradient.addColorStop(1, mixColour(PALETTE.nightBottom, PALETTE.dawnBottom, dawnMix));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Stars fade as dawn comes; each layer scrolls at its own depth.
    for (const star of stars) {
      const depth = 6 + star.layer * 10;
      const y = (star.y + state.altitude * depth * 0.06) % FIELD.height;
      const twinkle = 0.55 + 0.45 * Math.sin(state.time * 2 + star.tw);
      ctx.globalAlpha = (1 - dawnMix * 0.85) * twinkle;
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(star.x, y, star.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The moon, sinking as the lantern climbs.
    const moonY = 92 + state.altitude * 0.05;
    if (moonY < FIELD.height) {
      const glow = ctx.createRadialGradient(1150, moonY, 8, 1150, moonY, 90);
      glow.addColorStop(0, 'rgba(244,236,216,0.5)');
      glow.addColorStop(1, 'rgba(244,236,216,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(1040, moonY - 100, 220, 200);
      ctx.fillStyle = PALETTE.moon;
      ctx.globalAlpha = 1 - dawnMix * 0.6;
      ctx.beginPath();
      ctx.arc(1150, moonY, 30, 0, 6.2832);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Cloud silhouettes drifting past, nearer ones lower and larger.
    for (const cloud of clouds) {
      const depth = cloud.far ? 14 : 30;
      const y = (cloud.y + state.altitude * depth * 0.06) % (FIELD.height + 220) - 110;
      ctx.fillStyle = cloud.far ? PALETTE.cloudFar : PALETTE.cloud;
      ctx.globalAlpha = cloud.far ? 0.75 : 0.9;
      const w = 190 * cloud.s;
      const h = 34 * cloud.s;
      ctx.beginPath();
      ctx.ellipse(cloud.x, y, w / 2, h / 2, 0, 0, 6.2832);
      ctx.ellipse(cloud.x - w * 0.28, y + h * 0.22, w / 3, h / 3, 0, 0, 6.2832);
      ctx.ellipse(cloud.x + w * 0.3, y + h * 0.2, w / 3.4, h / 3.2, 0, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Dawn gathering at the horizon in the last stretch of the climb.
    if (dawnMix > 0.55) {
      const glow = ctx.createRadialGradient(FIELD.width / 2, FIELD.height + 130, 60, FIELD.width / 2, FIELD.height + 130, 640);
      glow.addColorStop(0, `rgba(255,166,66,${0.5 * (dawnMix - 0.55) / 0.45})`);
      glow.addColorStop(1, 'rgba(255,166,66,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, FIELD.height - 420, FIELD.width, 420);
    }
  }

  function drawGustStreaks(state) {
    const gust = state.gust;
    if (gust.phase !== 'blow') return;
    ctx.strokeStyle = PALETTE.gust;
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = ((i * 173 + state.time * 40) % 700) + 10;
      const head = ((i * 397 + state.time * 900) % (FIELD.width + 320)) - 160;
      const x = gust.direction > 0 ? head : FIELD.width - head;
      ctx.globalAlpha = 0.16 + (i % 4) * 0.05;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - gust.direction * (46 + (i % 5) * 14), y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawEmber(ember, time) {
    const pulse = 0.8 + 0.25 * Math.sin(time * 5 + ember.phase);
    const r = ember.radius * pulse;
    const glow = ctx.createRadialGradient(ember.x, ember.y, 1, ember.x, ember.y, r * 3.1);
    glow.addColorStop(0, ember.gold ? 'rgba(255,233,92,0.85)' : 'rgba(255,215,106,0.8)');
    glow.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, r * 3.1, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = ember.gold ? PALETTE.gold : PALETTE.ember;
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, r, 0, 6.2832);
    ctx.fill();
    if (ember.gold) {
      ctx.strokeStyle = 'rgba(255,243,176,0.9)';
      ctx.lineWidth = 2;
      const s = r * 1.7;
      ctx.beginPath();
      ctx.moveTo(ember.x - s, ember.y);
      ctx.lineTo(ember.x + s, ember.y);
      ctx.moveTo(ember.x, ember.y - s);
      ctx.lineTo(ember.x, ember.y + s);
      ctx.stroke();
    }
  }

  function drawWisp(wisp, time) {
    const flap = Math.sin(time * 16 + wisp.phase) * 0.5;
    ctx.save();
    ctx.translate(wisp.x, wisp.y);
    ctx.fillStyle = PALETTE.wispWing;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(-0.5 - flap * 0.5);
      ctx.beginPath();
      ctx.ellipse(15, -4, 15, 6.5, -0.4, 0, 6.2832);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = PALETTE.wisp;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 16, 0, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = PALETTE.wispEye;
    ctx.beginPath();
    ctx.arc(-4.5, -3, 2.3, 0, 6.2832);
    ctx.arc(4.5, -3, 2.3, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }

  function drawLantern(state) {
    const lantern = state.lantern;
    const flicker = 1 + 0.07 * Math.sin(state.time * 12.7) + 0.05 * Math.sin(state.time * 29.3);
    const flameScale = (0.55 + 0.45 * (state.flame / FLAME.max)) * flicker;
    ctx.save();
    ctx.translate(lantern.x, lantern.y);
    ctx.rotate(lantern.tilt);
    if (lantern.invulnerable > 0 && Math.floor(state.time * 14) % 2 === 0) ctx.globalAlpha = 0.45;

    // The flame's halo through the paper.
    const halo = ctx.createRadialGradient(0, -6, 4, 0, -6, 74 * flameScale + 22);
    halo.addColorStop(0, 'rgba(255,190,80,0.55)');
    halo.addColorStop(1, 'rgba(255,120,50,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, -6, 74 * flameScale + 22, 0, 6.2832);
    ctx.fill();

    // The paper envelope: round shoulders tapering to a neck.
    const body = ctx.createLinearGradient(0, -46, 0, 26);
    body.addColorStop(0, '#ffc978');
    body.addColorStop(0.6, PALETTE.paper);
    body.addColorStop(1, PALETTE.paperDark);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.bezierCurveTo(30, -48, 38, -22, 34, 2);
    ctx.bezierCurveTo(31, 20, 16, 27, 9, 30);
    ctx.lineTo(-9, 30);
    ctx.bezierCurveTo(-16, 27, -31, 20, -34, 2);
    ctx.bezierCurveTo(-38, -22, -30, -48, 0, -48);
    ctx.fill();
    // Ribs and bands.
    ctx.strokeStyle = PALETTE.paperRib;
    ctx.lineWidth = 1.6;
    for (const ribX of [-19, 0, 19]) {
      ctx.beginPath();
      ctx.moveTo(ribX * 0.45, -46);
      ctx.bezierCurveTo(ribX * 1.35, -20, ribX * 1.25, 8, ribX * 0.55, 29);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-35.5, -8);
    ctx.bezierCurveTo(-12, -2, 12, -2, 35.5, -8);
    ctx.stroke();

    // The flame itself, seen at the envelope's heart.
    ctx.fillStyle = PALETTE.flameOuter;
    ctx.beginPath();
    ctx.ellipse(0, -4, 10.5 * flameScale, 15 * flameScale, 0, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = PALETTE.flameMid;
    ctx.beginPath();
    ctx.ellipse(0, -2, 6.8 * flameScale, 10 * flameScale, 0, 0, 6.2832);
    ctx.fill();
    ctx.fillStyle = PALETTE.flameCore;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.6 * flameScale, 5.6 * flameScale, 0, 0, 6.2832);
    ctx.fill();

    // Neck, cords and basket.
    ctx.fillStyle = '#6e3c14';
    ctx.fillRect(-9, 30, 18, 5);
    ctx.strokeStyle = '#6e3c14';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, 35);
    ctx.lineTo(-5.5, 43);
    ctx.moveTo(8, 35);
    ctx.lineTo(5.5, 43);
    ctx.stroke();
    ctx.fillStyle = '#8a5a24';
    ctx.fillRect(-7.5, 43, 15, 8);
    ctx.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(10,13,28,0.78)';
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
  }

  function text(str, x, y, size, colour, align = 'center', weight = 600) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colour;
    ctx.fillText(str, x, y);
  }

  function drawHud(state, muted) {
    // Score and best, top left.
    text(`SCORE ${state.score}`, 26, 34, 24, PALETTE.text, 'left', 700);
    // The climb, top centre: watch name, altitude and the road to dawn.
    const watch = WATCHES[watchIndex(state.altitude)];
    text(`${watch} · ${Math.floor(state.altitude)} m`, FIELD.width / 2, 30, 21, PALETTE.text, 'center', 700);
    const barW = 380;
    const barX = FIELD.width / 2 - barW / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.roundRect(barX, 48, barW, 7, 3.5);
    ctx.fill();
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.roundRect(barX, 48, barW * clamp01(state.altitude / GOAL_ALTITUDE), 7, 3.5);
    ctx.fill();
    text('☀', barX + barW + 16, 52, 17, PALETTE.gold);
    text(`Dawn Line ${GOAL_ALTITUDE} m`, FIELD.width / 2, 70, 13.5, PALETTE.muted);

    // Lives, top right, as little lanterns.
    for (let i = 0; i < 3; i++) {
      const x = FIELD.width - 40 - i * 34;
      ctx.globalAlpha = i < state.lives ? 1 : 0.22;
      ctx.fillStyle = PALETTE.paper;
      ctx.beginPath();
      ctx.roundRect(x - 8, 18, 16, 20, 6);
      ctx.fill();
      ctx.fillStyle = PALETTE.flameCore;
      ctx.beginPath();
      ctx.arc(x, 28, 3.4, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The flame bar, bottom centre: the game's true clock.
    const flameW = 430;
    const flameX = FIELD.width / 2 - flameW / 2;
    const flameY = FIELD.height - 34;
    text('FLAME', flameX - 12, flameY + 7, 14, PALETTE.muted, 'right', 700);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath();
    ctx.roundRect(flameX, flameY, flameW, 13, 6.5);
    ctx.fill();
    const frac = clamp01(state.flame / FLAME.max);
    const flameGrad = ctx.createLinearGradient(flameX, 0, flameX + flameW, 0);
    flameGrad.addColorStop(0, PALETTE.flameOuter);
    flameGrad.addColorStop(0.6, PALETTE.flameMid);
    flameGrad.addColorStop(1, PALETTE.ember);
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.roundRect(flameX, flameY, flameW * frac, 13, 6.5);
    ctx.fill();
    if (state.flame < FLAME.lowWarning && Math.floor(state.time * 3) % 2 === 0) {
      text('THE FLAME IS DYING — EAT EMBERS', FIELD.width / 2, flameY - 18, 15, PALETTE.danger, 'center', 700);
    }

    // Wind warning: which way the gust will shove, while there is time to brace.
    if (state.gust.phase === 'warn' && Math.floor(state.time * 4) % 2 === 0) {
      const arrow = state.gust.direction > 0 ? '⟶' : '⟵';
      text(`WIND RISING ${arrow}`, FIELD.width / 2, 104, 19, PALETTE.gust, 'center', 700);
    }
    text(muted ? 'M · sound off' : 'M · sound on', FIELD.width - 24, FIELD.height - 22, 13, PALETTE.muted, 'right', 500);
  }

  function drawTitle(state, best) {
    panel(FIELD.width / 2 - 330, 120, 660, 300);
    text('EMBERLIGHT', FIELD.width / 2, 178, 62, PALETTE.ember, 'center', 800);
    text('Keeper of the Last Lantern', FIELD.width / 2, 224, 21, PALETTE.text, 'center', 500);
    text('Feed the flame with embers. Dodge the storm wisps.', FIELD.width / 2, 272, 18.5, PALETTE.text);
    text(`Carry the light to the Dawn Line at ${GOAL_ALTITUDE} m — before it gutters out.`, FIELD.width / 2, 300, 18.5, PALETTE.text);
    text('Steer: arrow keys or WASD · or hold the mouse to guide her', FIELD.width / 2, 344, 16, PALETTE.muted);
    text('P pauses · M mutes · a gold ember is worth five', FIELD.width / 2, 370, 16, PALETTE.muted);
    if (best > 0) text(`Best score ${best}`, FIELD.width / 2, 398, 16, PALETTE.gold);
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3.2);
    ctx.globalAlpha = pulse;
    text('Press SPACE or click to light the lantern', FIELD.width / 2, 472, 21, PALETTE.flameCore, 'center', 700);
    ctx.globalAlpha = 1;
  }

  function drawEnd(state, best, won) {
    panel(FIELD.width / 2 - 300, 190, 600, 264);
    if (won) {
      text('DAWN REACHED', FIELD.width / 2, 248, 44, PALETTE.gold, 'center', 800);
      text('The night is over, and the flame still burns.', FIELD.width / 2, 292, 19, PALETTE.text);
    } else {
      text(state.endReason === 'wisps' ? 'THE WISPS TOOK THE LIGHT' : 'THE FLAME IS OUT', FIELD.width / 2, 248, 37, PALETTE.danger, 'center', 800);
      text(state.endReason === 'wisps'
        ? 'Three strikes of the storm moths, and the dark wins.'
        : 'Starved of embers, the little flame guttered and died.', FIELD.width / 2, 292, 18.5, PALETTE.text);
    }
    text(`Score ${state.score}`, FIELD.width / 2, 338, 24, PALETTE.text, 'center', 700);
    text(`Climbed ${Math.floor(state.altitude)} m of ${GOAL_ALTITUDE} m · Best ${Math.max(best, state.score)}`, FIELD.width / 2, 372, 17, PALETTE.muted);
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3.2);
    ctx.globalAlpha = pulse;
    text('Press SPACE or click to fly again', FIELD.width / 2, 420, 19, PALETTE.flameCore, 'center', 700);
    ctx.globalAlpha = 1;
  }

  /** Draw one frame: `screen` is one of the SCREEN_ constants, `best` the stored best score. */
  function draw(state, screen, best, muted) {
    const dawnMix = screen === SCREEN_WIN ? 1 : clamp01(state.altitude / GOAL_ALTITUDE);
    drawSky(state, dawnMix);
    drawGustStreaks(state);
    for (const ember of state.embers) drawEmber(ember, state.time);
    for (const wisp of state.wisps) drawWisp(wisp, state.time);
    drawParticles(state);
    drawLantern(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, muted);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_WIN) drawEnd(state, best, true);
    if (screen === SCREEN_OVER) drawEnd(state, best, false);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(5,7,18,0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      text('PAUSED', FIELD.width / 2, FIELD.height / 2 - 16, 44, PALETTE.text, 'center', 800);
      text('P or SPACE to resume', FIELD.width / 2, FIELD.height / 2 + 30, 18, PALETTE.muted);
    }
  }

  return { draw };
}
