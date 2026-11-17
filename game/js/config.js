// Emberlight: every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The lantern the player steers: a paper sky-lantern with a living flame at its heart. */
export const LANTERN = {
  radius: 24,
  homeY: 452,
  accel: 1500,
  maxSpeed: 430,
  drag: 3.2,
  pointerPull: 7.5,
  invulnerable: 1.6,
};

/** Altitude is the score that wins: cross the Dawn Line before the flame dies. */
export const GOAL_ALTITUDE = 1000;
/** How many metres one pixel of climb is worth. */
export const METRES_PER_PIXEL = 0.06;
/** How fast the world scrolls past, in pixels a second, before the watch's share is added. */
export const RISE_SPEED = 62;
export const RISE_PER_WATCH = 9;

/** The flame: it always burns down, faster in the later watches; embers feed it. */
export const FLAME = {
  max: 100,
  start: 82,
  drainPerSecond: 2.3,
  drainPerWatch: 0.65,
  emberFeed: 8,
  goldFeed: 26,
  hitCost: 16,
  lowWarning: 26,
};

export const LIVES = 3;

/** Embers: drifting sparks the lantern eats to stay alight. Gold ones are rare and rich. */
export const EMBER = {
  radius: 9,
  goldRadius: 12,
  goldChance: 0.09,
  interval: 0.85,
  intervalJitter: 0.5,
  drift: 26,
  points: 10,
  goldPoints: 50,
};

/** Storm wisps: dark moths that dive at the lantern. One touch costs a light and some flame. */
export const WISP = {
  radius: 17,
  interval: 2.4,
  intervalPerWatch: 0.38,
  minInterval: 0.95,
  fallSpeed: 74,
  fallPerWatch: 16,
  homing: 26,
  wobble: 2.4,
};

/** Wind gusts: the HUD warns, then the wind shoves the lantern sideways for a few seconds. */
export const GUST = {
  firstAt: 14,
  intervalMin: 9,
  intervalMax: 15,
  warnSeconds: 1.3,
  blowSeconds: 2.4,
  force: 620,
  forcePerWatch: 90,
};

/** The four watches of the night, one every quarter of the climb. Names are shown in the HUD. */
export const WATCHES = ['First Watch', 'Deep Night', 'The Murmuring Dark', 'Before Dawn'];

export const PALETTE = {
  nightTop: '#070a1c',
  nightBottom: '#1c1440',
  dawnTop: '#3a2a63',
  dawnBottom: '#e2703a',
  star: '#cfd8ff',
  cloud: '#141b38',
  cloudFar: '#0d1230',
  moon: '#f4ecd8',
  paper: '#ffb85c',
  paperDark: '#e07f2e',
  paperRib: '#b85c1a',
  flameCore: '#fff3b0',
  flameMid: '#ffb347',
  flameOuter: '#ff7847',
  ember: '#ffd76a',
  gold: '#ffe95c',
  wisp: '#241b3a',
  wispWing: '#3b2a63',
  wispEye: '#c792ff',
  gust: '#9fd8ff',
  panel: '#131a30',
  panelEdge: '#2c3a63',
  text: '#f2ead8',
  muted: '#9aa3c7',
  danger: '#ff6b5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberlight.best';
