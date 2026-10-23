// Unfold: iPhone Duo in HTML and CSS 3D. Open it, close it, turn it and pose it. No dependencies.
//
//   <script type="module" src="unfold.js"></script>
//   <unfold-device inner="open.png" cover="closed.png" posture="landscape-ajar" interactive></unfold-device>
//
// Everything is in millimetres. The body follows Apple's published size: 164.6 x 117.8 x 5.2 mm open and
// 84.1 x 117.8 x 11.3 mm closed. The shape of the band, the corners, the hinge cover, the camera, the buttons and
// the openings along the edges are measured from Apple's own 3D model of the phone and its spec drawings.
//
// The phone is a set of flat polygons, each a plain element with its own matrix3d, all side by side in one
// preserve-3d container (Safari drops the children of a nested 3D container once it turns edge-on).

export const SPEC = {
  width: 82.3,            // one half
  height: 117.8,
  depth: 5.2,             // one half
  gap: 0.9,               // between the two halves of the inner screen when closed: 5.2 + 0.9 + 5.2 = 11.3
  corner: 13.2,           // the outer corners are continuous curves that leave each edge this far from the corner
  cornerShape: 2.2,       // 2 would be a circle
  hingeCorner: 1.1,
  // The polished band's profile, as [depth behind the inner screen, inset from the outline], from the inner screen
  // back: a barrel, widest a little behind the middle, rolling 0.7 mm into the inner screen and 1.3 mm into the back.
  band: [[0, 0.68], [0.35, 0.28], [0.95, 0.06], [2.3, 0], [3.6, 0.07], [4.2, 0.3], [4.65, 0.72], [5.2, 1.3]],
  mechanism: 3.6,         // along the hinge the band only wraps the back edge; in front of this depth is the hinge
  overlap: 0.6,           // each half of the inner screen runs on this far past the hinge, under the other
  inner: { screen: 3.44, radius: 9 },
  cover: { screen: { outer: 2.75, hinge: 2.36, top: 2.745, bottom: 2.745 }, radius: 11.4, hingeRadius: 1.32, hole: { x: 7.94, y: 7.93, size: 6.1 } },
  // The camera, on the back of the right half: distances from the outer edge (x) and the top (y). The plateau is a
  // soft pillow given as rings [height above the back, x, y, length, height].
  camera: {
    plateau: [[0, 2.3, 2.2, 61.6, 26.8], [0.35, 2.95, 2.85, 60.3, 25.5], [1.6, 3.95, 3.85, 58.3, 23.5], [2.9, 4.62, 4.5, 56.96, 22.15],
      [3.4, 4.84, 4.62, 56.1, 21.45], [3.64, 4.94, 4.71, 55.79, 21.15]],
    lenses: [15.29, 33.07], lensY: 15.28, ring: 16.25, ringHeight: 1.9, aperture: 14.1, sapphire: 13.25,
    mic: { x: 49.73, y: 10.97, width: 3.41, height: 1.59 },
    flash: { x: 49.73, y: 19.74, size: 3.9 },
  },
  logo: { x: 41.5, y: 59.7, size: 17 },
  // The hinge cover. Closed, it stands out of the hinge side by `out` and covers `half` either side of the gap.
  spine: { out: 1.8, in: 0.58, half: 4.1, radius: 1.6, end: 1.2 },
  // On the right half: volume along the top edge (from the outer corner), the side button with Touch ID and Camera
  // Control down the outer edge (from the top), and how far behind the inner screen each sits.
  buttons: {
    volume: { at: [[20.9, 31.8], [34.3, 45.2]], depth: [1.23, 3.66], proud: 0.45 },
    side: { at: [33.6, 52.3], depth: [0.86, 4.02], proud: 0.46 },
    control: { at: [76.8, 93.5], depth: [1.36, 3.52], proud: 0.08 },
  },
  // Openings along the edges, across from the middle of each half: speaker holes, microphones and USB-C.
  ports: {
    leftTop: { dots: [-6.67, -4.01, -1.34, 1.32, 3.98, 6.64], size: 1.38, depth: 2.44 },
    leftBottom: { dots: [-7.4, 7.4], size: 1.5, depth: 2.27, slot: { width: 8.34, height: 2.56, depth: 2.44 } },
    rightBottom: { dots: [-25.06, -22.8, -20.53, -18.27, -7.4, 7.4, 18.27, 20.53, 22.8, 25.06], size: 1.39, depth: 2.44 },
  },
  // Antenna lines across the band: along the top and bottom of the open phone (from its left end) and down both
  // outer edges (from the top).
  antennas: { top: [15, 66.6, 97.5, 149.1], bottom: [28.5, 53.3, 110.5, 135.4], sides: [15, 102.3], width: 0.9 },
};

export const FINISHES = {
  'star-white': { metal: '#f2ede4', back: '#f8f6f1', hinge: '#e4e0d8', antenna: 'rgba(150, 146, 138, .45)' },
  'night-sky': { metal: '#3a4b66', back: '#47535f', hinge: '#3e4a5b', antenna: 'rgba(12, 16, 24, .5)' },
};

// Ways to hold it. `fold` is the angle between the two halves of the inner screen (0 shut, 180 flat), `roll` turns
// it on the page, `yaw` and `pitch` are where you look from (pitch above zero looks down on it). `anchor` and `lean`
// set how the phone sits as it folds: the right half turns about the hinge by lean - anchor * (180 - fold), and the
// left half by that plus (180 - fold). With anchor 0.5 throughout, both halves turn at a steady rate between any two
// postures. `glow` is the inner screen: off in a tent, where the cover screen faces out.
export const POSTURES = {
  closed: { fold: 0, roll: 0, anchor: 0.5, lean: 90, yaw: -24, pitch: 8, glow: 1 },
  landscape: { fold: 180, roll: 0, anchor: 0.5, lean: 0, yaw: -16, pitch: 8, glow: 1 },
  'landscape-ajar': { fold: 140, roll: 0, anchor: 0.5, lean: 0, yaw: -10, pitch: 6, glow: 1 },
  portrait: { fold: 180, roll: -90, anchor: 0.5, lean: 0, yaw: -16, pitch: 8, glow: 1 },
  'portrait-ajar': { fold: 140, roll: -90, anchor: 0.5, lean: 0, yaw: -16, pitch: 6, glow: 1 },
  laptop: { fold: 100, roll: -90, anchor: 0.5, lean: 50, yaw: -24, pitch: 16, glow: 1 },
  tent: { fold: 60, roll: 90, anchor: 0.5, lean: 90, yaw: -28, pitch: 12, glow: 0 },
};
const GEOMETRY = ['fold', 'roll', 'anchor', 'lean'];
const FRAMING = ['fit', 'fx', 'fy', 'fz'];
const MOVE = 'cubic-bezier(0.45, 0, 0.15, 1)';   // a gentle start and a long, soft settle
const SHRINK = bezier(0.2, 0, 0.1, 1), GROW = bezier(0.75, 0, 0.25, 1);

// Every <unfold-device> on the page, so a new finish reaches the ones already showing.
const live = new Set();

/** Adds a finish: { metal, back, hinge, antenna } colours. */
export function addFinish(name, colors) {
  FINISHES[name] = colors;
  for (const el of live) if (el.getAttribute('finish') === name) el._layout();
}

const VIDEO = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- vectors and matrices ----------

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mulv = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// 4x4 matrices in column-major order, as CSS matrix3d() takes them, with the same rotations as CSS.
const m4 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mm(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
const tr = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const sc = f => [f, 0, 0, 0, 0, f, 0, 0, 0, 0, f, 0, 0, 0, 0, 1];
function rotX(a) { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
function rotY(a) { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
function rotZ(a) { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
const apply = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

// cubic-bezier(x1, y1, x2, y2) as a function of progress, like CSS.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const x = t => ((ax * t + bx) * t + cx) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
  const y = t => ((ay * t + by) * t + cy) * t;
  return p => {
    if (p <= 0 || p >= 1) return clamp(p, 0, 1);
    let t = p;
    for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (x(t) - p) / d; }
    return y(clamp(t, 0, 1));
  };
}
const EASINGS = {
  linear: p => p,
  ease: bezier(0.25, 0.1, 0.25, 1),
  'ease-in': bezier(0.42, 0, 1, 1),
  'ease-out': bezier(0, 0, 0.58, 1),
  'ease-in-out': bezier(0.65, 0, 0.35, 1),
};
function easing(e) {
  if (typeof e === 'function') return e;
  const m = /cubic-bezier\(([^)]+)\)/.exec(e || '');
  if (m) return bezier(...m[1].split(',').map(Number));
  return EASINGS[e] || EASINGS['ease-in-out'];
}

function rgb(color) {
  const ctx = rgb.ctx || (rgb.ctx = document.createElement('canvas').getContext('2d'));
  ctx.fillStyle = '#000'; ctx.fillStyle = color;
  const s = ctx.fillStyle;
  if (s[0] === '#') return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  return s.match(/[\d.]+/g).slice(0, 3).map(Number);
}

// ---------- light ----------
// A studio fixed to the viewer: a large soft box above, a key light up and to the left, a bright surround and a
// dark line along the horizon. Polished metal reflects it; glass and blasted metal scatter it.

const KEY = unit([-0.45, -0.75, 0.5]);
const BOX = unit([0.1, -0.95, 0.3]);
const SIDE = unit([0.95, -0.2, 0.25]);

function polished(f0, n, v) {
  const d = dot(n, v), r = [2 * d * n[0] - v[0], 2 * d * n[1] - v[1], 2 * d * n[2] - v[2]];
  const up = -r[1];
  let e = 0.5 + 0.34 * smooth(-0.5, 0.75, up) + 0.12 * Math.max(0, r[2]);
  e -= 0.3 * Math.exp(-(((up + 0.05) / 0.17) ** 2)) * (0.55 + 0.45 * Math.abs(r[0]));
  e += 2.4 * Math.max(0, dot(r, BOX)) ** 12 + 1.6 * Math.max(0, dot(r, KEY)) ** 18 + 0.7 * Math.max(0, dot(r, SIDE)) ** 10;
  e += 0.25 * (1 - Math.abs(d)) ** 4;   // grazing angles reflect more
  return f0.map(c => Math.round(clamp(c * e, 0, 255)));
}

function matte(base, n, v, gloss = 0.12) {
  const d = Math.max(0, dot(n, KEY)), h = unit(add(KEY, v)), s = Math.max(0, dot(n, h)) ** 30;
  const k = 0.8 + 0.24 * d;
  return base.map(c => Math.round(clamp(c * k + 255 * s * gloss, 0, 255)));
}

const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;

// ---------- outlines ----------

// One half's outline, clockwise from the left end of its top-left corner, as { p: [x, y], n: [nx, ny], hinge }
// points with outward normals. The two outer corners are continuous curves; the two by the hinge are small circles.
function halfOutline(x0, x1, hingeLeft) {
  const H = SPEC.height, y0 = -H / 2, y1 = H / 2, A = SPEC.corner, e = SPEC.cornerShape, r = SPEC.hingeCorner;
  const corners = [[x0, y0, -1, -1, 0, 1], [x1, y0, 1, -1, 1, 0], [x1, y1, 1, 1, 0, 1], [x0, y1, -1, 1, 1, 0]];
  const pts = [];
  for (const [cx, cy, sx, sy, t0, t1] of corners) {
    const hinge = (sx < 0) === hingeLeft, a = hinge ? r : A, ex = hinge ? 2 : e, steps = hinge ? 2 : 10;
    for (let i = 0; i <= steps; i++) {
      const th = (t0 + (t1 - t0) * (i / steps)) * Math.PI / 2, c = Math.cos(th), s = Math.sin(th);
      const lx = a * Math.pow(c, 2 / ex), ly = a * Math.pow(s, 2 / ex);
      const n = unit([sx * Math.pow(c, 2 - 2 / ex), sy * Math.pow(s, 2 - 2 / ex), 0]);
      pts.push({ p: [cx - sx * a + sx * lx, cy - sy * a + sy * ly], n: [n[0], n[1]], hinge, a, c: [cx - sx * a, cy - sy * a] });
    }
  }
  return pts;
}

// The outline moved in by `inset` at depth `depth` (3D points). Small circular corners shrink about their centres.
function ring(outline, inset, depth) {
  return outline.map(({ p, n, hinge, a, c }) => {
    if (hinge) {
      const d = unit([p[0] - c[0], p[1] - c[1], 0]), k = Math.max(0.02, a - inset);
      return [c[0] + d[0] * k, c[1] + d[1] * k, -depth];
    }
    return [p[0] - n[0] * inset, p[1] - n[1] * inset, -depth];
  });
}

// A continuous corner as polygon points, for clip paths: the quarter of a superellipse from (x, y) towards (sx, sy).
function corner2d(cx, cy, sx, sy, a, from, to, steps = 10, e = 2.2) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const th = (from + (to - from) * (i / steps)) * Math.PI / 2;
    out.push([cx - sx * a + sx * a * Math.pow(Math.cos(th), 2 / e), cy - sy * a + sy * a * Math.pow(Math.sin(th), 2 / e)]);
  }
  return out;
}
// A rounded rectangle as polygon points, clockwise from the top-left, with radii [tl, tr, br, bl].
function rrect(x, y, w, h, radii, e = 2.2) {
  const [tl, tr2, br, bl] = radii;
  return [
    ...corner2d(x, y, -1, -1, tl, 0, 1, 10, e), ...corner2d(x + w, y, 1, -1, tr2, 1, 0, 10, e),
    ...corner2d(x + w, y + h, 1, 1, br, 0, 1, 10, e), ...corner2d(x, y + h, -1, 1, bl, 1, 0, 10, e),
  ];
}
const polygon = (pts, k) => `polygon(${pts.map(([x, y]) => `${(x * k).toFixed(2)}px ${(y * k).toFixed(2)}px`).join(',')})`;

const STYLE = `
:host { display: block; position: relative; width: 100%; aspect-ratio: 16 / 10; contain: layout style; -webkit-user-select: none; user-select: none; }
:host([interactive]) { cursor: grab; touch-action: pan-y; }
:host([interactive]:active) { cursor: grabbing; }
:host(:focus-visible) { outline: 2px solid currentColor; outline-offset: 4px; border-radius: 8px; }
.stage { position: absolute; inset: 0; }
.shadow { position: absolute; left: 0; top: 0; border-radius: 50%; pointer-events: none; will-change: transform;
  background: radial-gradient(closest-side, rgba(0, 0, 0, var(--unfold-shadow, .3)), rgba(0, 0, 0, 0)); filter: blur(6px); }
.world { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; }
.world > * { position: absolute; left: 0; top: 0; transform-origin: 0 0; backface-visibility: visible; }
.face { overflow: hidden; }
.layer { position: absolute; }
.glass { background: #050507; overflow: hidden; }
.screen { overflow: hidden; background: #000; }
.media { left: 0; top: 0; }
.media > img, .media > video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.veil { inset: 0; position: absolute; pointer-events: none; will-change: opacity; }
.veil.dark { background: #000; opacity: 0; }
.sweep { overflow: hidden; pointer-events: none; }
.shade { position: absolute; left: 0; top: 0; width: 300%; height: 100%; will-change: transform;
  background: linear-gradient(to right, rgba(0,0,0,.82) 33.3%, rgba(0,0,0,.62) 41%, rgba(0,0,0,.34) 49%, rgba(0,0,0,.12) 58%, rgba(0,0,0,0) 66.7%); }
.glare { pointer-events: none; mix-blend-mode: screen; will-change: transform;
  background: linear-gradient(112deg, rgba(255,255,255,0) 42%, rgba(255,255,255,.13) 48.5%, rgba(255,255,255,.04) 52%, rgba(255,255,255,0) 58%); }
.hole { border-radius: 50%; background: radial-gradient(circle at 42% 40%, #222a3a 0 12%, #07080c 24% 100%); box-shadow: 0 0 0 0.6px rgba(255,255,255,.05); }
.tone { inset: 0; pointer-events: none; will-change: opacity; }
.footprint { border-radius: 999px; background: rgba(0, 0, 0, .22); }
.logo { object-fit: contain; }
.mic { border-radius: 999px; background: #121316; box-shadow: inset 0 1px 1px rgba(0,0,0,.6); }
.flash { border-radius: 50%; background: radial-gradient(circle at 42% 38%, #fffbf2, #ece0c6 42%, #c2b28e 70%, #8f8470); box-shadow: 0 0 0 1px rgba(0,0,0,.12); }
.lensglass { border-radius: 50%; background: #050506; }
.sapphire { border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(190, 210, 255, .55) 0 3%, rgba(0,0,0,0) 9%),
    radial-gradient(circle at 64% 68%, rgba(150, 110, 230, .4) 0 4%, rgba(0,0,0,0) 11%),
    radial-gradient(circle, #050608 0 22%, #172030 23% 31%, #06070a 32% 52%, #22272f 53% 57%, #07080b 58% 100%); }
.control { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .14); }
`;

export class UnfoldDevice extends HTMLElement {
  static observedAttributes = ['posture', 'fold', 'yaw', 'pitch', 'roll', 'finish', 'inner', 'cover', 'logo',
    'interactive', 'zoom', 'shadow', 'label'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const { fold, yaw, pitch, roll, anchor, lean, glow } = POSTURES.landscape;
    // fit, fx, fy and fz frame the phone: its scale and the point it turns about (mm). They follow the shape of the
    // phone, except while it moves between postures, when they glide from one framing to the next.
    this._state = { fold, yaw, pitch, roll, anchor, lean, glow, fit: 1, fx: 0, fy: 0, fz: -SPEC.depth / 2 };
    this._posture = 'landscape';
    this._tweens = new Map();
    this._frame = 0;
    this._k = 0;
    this._last = '';
  }

  // ---------- public API ----------

  /** The current pose: fold (0 closed to 180 open), yaw, pitch and roll in degrees, and the last posture asked for. */
  get state() { const { fold, yaw, pitch, roll } = this._state; return { fold, yaw, pitch, roll, posture: this._posture }; }
  get fold() { return this._state.fold; }
  set fold(v) { this._set({ fold: v }); }
  get yaw() { return this._state.yaw; }
  set yaw(v) { this._set({ yaw: v }); }
  get pitch() { return this._state.pitch; }
  set pitch(v) { this._set({ pitch: v }); }
  get roll() { return this._state.roll; }
  set roll(v) { this._set({ roll: v }); }
  get posture() { return this._posture; }
  set posture(name) { this.setPosture(name); }

  /** Moves to one of POSTURES: closed, landscape, landscape-ajar, portrait, portrait-ajar, laptop or tent. */
  setPosture(name, options) {
    const p = POSTURES[name];
    if (!p) return Promise.resolve(false);
    this._posture = name;
    // Turn the short way round to the posture's view, however far the phone has been spun.
    const yaw = p.yaw + 360 * Math.round((this._target('yaw') - p.yaw) / 360);
    return this.animateTo({ glow: 1, ...p, yaw }, { duration: 1200, easing: MOVE, ...options });
  }

  open(options) { return this.animateTo({ fold: 180 }, options); }
  close(options) { return this.animateTo({ fold: 0 }, options); }
  /** Opens if it is mostly closed, closes otherwise. */
  toggle(options) { return this.animateTo({ fold: this._target('fold') < 90 ? 180 : 0 }, options); }
  /** Turns the phone around to show the other side. */
  flip(options) { return this.animateTo({ yaw: this._target('yaw') + 180 }, { duration: 900, ...options }); }
  /** Spins it a full turn, or `turns` turns (negative spins the other way). */
  spin(turns = 1, options) { return this.animateTo({ yaw: this._target('yaw') + 360 * turns }, { duration: 1400 * Math.abs(turns), ...options }); }

  /**
   * Animates any of fold, yaw, pitch and roll. Resolves true when it finishes, or false if a newer animation of
   * the same property takes over. Jumps straight there under prefers-reduced-motion, unless `force` is set.
   */
  animateTo(target, { duration = 1000, easing: e = MOVE, delay = 0, force = false } = {}) {
    if (!force && matchMedia('(prefers-reduced-motion: reduce)').matches) { duration = 0; delay = 0; }
    const ease = easing(e);
    // When the shape changes, the framing glides to where the new shape will sit, instead of chasing it every frame
    // (a phone turning on its side is wider half-way round, and would otherwise shrink and grow again).
    if (GEOMETRY.some(k => k in target)) {
      const end = Object.fromEntries(GEOMETRY.map(k => [k, k in target ? +target[k] : this._target(k)]));
      end.fold = clamp(end.fold, 0, 180);
      target = { ...this._framing(end), ...target };
    }
    const keys = Object.keys(target).filter(k => k in this._state && Number.isFinite(+target[k]));
    return Promise.all(keys.map(key => new Promise(resolve => {
      this._tweens.get(key)?.resolve(false);
      const to = key === 'fold' ? clamp(+target[key], 0, 180) : key === 'pitch' ? clamp(+target[key], -90, 90) : +target[key];
      // The scale shrinks a little ahead of the move and grows a little behind it, so a phone turning on its side
      // never outgrows its frame half-way round.
      const lead = key === 'fit' && duration > 0 ? (to < this._state.fit ? SHRINK : GROW) : ease;
      this._tweens.set(key, { from: this._state[key], to, start: performance.now() + delay, duration, ease: lead, resolve });
      this._tick();
    }))).then(done => done.every(Boolean));
  }

  /** Stops every animation (and any spin left over from a drag) where it is. */
  stop() {
    for (const t of this._tweens.values()) t.resolve(false);
    this._tweens.clear();
    this._velocity = 0;
  }

  /**
   * Sets a screen ("inner" or "cover") to an image or video: a URL, or a File or Blob such as one picked or dropped
   * by the user. Pass null to turn it off.
   */
  setScreen(name, src) {
    const blobs = (this._blobs ||= new Map());
    if (blobs.has(name)) { URL.revokeObjectURL(blobs.get(name).url); blobs.delete(name); }
    if (src instanceof Blob) {
      const url = URL.createObjectURL(src);
      blobs.set(name, { url, video: src.type.startsWith('video/') });
      src = url;
    }
    src == null ? this.removeAttribute(name) : this.setAttribute(name, src);
  }

  // ---------- lifecycle ----------

  connectedCallback() {
    live.add(this);
    if (!this.hasAttribute('role')) this.setAttribute('role', 'img');
    this._describe();
    this._bindInput();
    if (!this._started) {
      this._started = true;
      const name = this.getAttribute('posture');
      if (POSTURES[name]) { this._posture = name; Object.assign(this._state, POSTURES[name]); }
      this._readState();
    }
    // Build when it first comes near the screen, and only draw while it is on screen.
    this._seen = new IntersectionObserver(([entry]) => {
      this._onScreen = entry.isIntersecting;
      if (this._onScreen) { if (!this._world) this._build(); this._layout(); }
    }, { rootMargin: '300px' });
    this._seen.observe(this);
    this._resize = new ResizeObserver(() => this._layout());
    this._resize.observe(this);
    if (this._tweens.size || this._velocity) this._tick();
  }

  disconnectedCallback() {
    live.delete(this);
    this._resize?.disconnect();
    this._seen?.disconnect();
    cancelAnimationFrame(this._frame);
    this._frame = 0;
  }

  attributeChangedCallback(name, oldValue, value) {
    if (oldValue === value || !this._started) return;
    if (name === 'posture') this.setPosture(value);
    else if (['fold', 'yaw', 'pitch', 'roll'].includes(name)) { this._readState(); this._render(); }
    else if (name === 'interactive' || name === 'label') this._describe();
    else if (name === 'inner' || name === 'cover') this._fillScreens();
    else if (name === 'logo') this._fillLogo();
    else this._layout();
  }

  // ---------- state and animation ----------

  _readState() {
    for (const key of ['fold', 'yaw', 'pitch', 'roll']) {
      const v = parseFloat(this.getAttribute(key));
      if (Number.isFinite(v)) this._set({ [key]: v }, false);
    }
  }

  _set(values, render = true) {
    // Setting the shape directly hands the framing back to the shape.
    if (GEOMETRY.some(k => k in values)) for (const k of FRAMING) { this._tweens.get(k)?.resolve(false); this._tweens.delete(k); }
    for (const [k, v] of Object.entries(values)) {
      if (!(k in this._state) || !Number.isFinite(+v)) continue;
      this._tweens.get(k)?.resolve(false);
      this._tweens.delete(k);
      this._state[k] = k === 'fold' ? clamp(+v, 0, 180) : +v;
    }
    if (render) this._render();
  }

  _target(key) { return this._tweens.get(key)?.to ?? this._state[key]; }

  _tick() {
    if (this._frame) return;
    const step = now => {
      this._frame = 0;
      let busy = false;
      for (const [key, t] of this._tweens) {
        if (now < t.start) { busy = true; continue; }
        const p = t.duration <= 0 ? 1 : clamp((now - t.start) / t.duration, 0, 1);
        this._state[key] = t.from + (t.to - t.from) * t.ease(p);
        if (p >= 1) { this._tweens.delete(key); t.resolve(true); } else busy = true;
      }
      // A drag that ends mid-swipe keeps the phone spinning and lets it slow down.
      if (this._velocity && !this._dragging) {
        const dt = Math.min(48, now - (this._spinAt || now));
        this._spinAt = now;
        this._state.yaw += this._velocity * dt;
        this._velocity *= Math.pow(0.0035, dt / 1000);
        if (Math.abs(this._velocity) < 0.002) this._velocity = 0; else busy = true;
      }
      this._render();
      if (busy) this._frame = requestAnimationFrame(step);
    };
    this._frame = requestAnimationFrame(step);
  }

  // ---------- input ----------

  _describe() {
    this.setAttribute('aria-label', this.getAttribute('label') || 'iPhone Duo');
    if (this.hasAttribute('interactive')) {
      if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
      this.setAttribute('aria-roledescription', 'interactive 3D model');
    } else {
      this.removeAttribute('aria-roledescription');
    }
  }

  _bindInput() {
    if (this._bound) return;
    this._bound = true;
    let drag = null;
    this.addEventListener('pointerdown', e => {
      if (!this.hasAttribute('interactive') || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, at: performance.now(), yaw: this._state.yaw, pitch: this._state.pitch, moved: false, id: e.pointerId };
      this._velocity = 0;
      this._samples = [[drag.at, this._state.yaw]];
    });
    this.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < 5) return;
        drag.moved = true;
        this._dragging = true;
        this.setPointerCapture(e.pointerId);
        for (const key of ['yaw', 'pitch']) { this._tweens.get(key)?.resolve(false); this._tweens.delete(key); }
      }
      const perPx = 205 / Math.max(320, this.clientWidth);
      this._state.yaw = drag.yaw + dx * perPx;
      // Touch drags only turn left and right, so a vertical swipe still scrolls the page.
      if (e.pointerType !== 'touch') this._state.pitch = clamp(drag.pitch + dy * perPx * 0.7, -75, 75);
      const now = performance.now();
      this._samples.push([now, this._state.yaw]);
      while (this._samples.length > 2 && now - this._samples[0][0] > 90) this._samples.shift();
      this._render();
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      this._dragging = false;
      if (d.moved) {
        const [t0, y0] = this._samples[0], [t1, y1] = this._samples[this._samples.length - 1];
        const v = t1 > t0 ? (y1 - y0) / (t1 - t0) : 0;   // degrees per ms
        if (Math.abs(v) > 0.05 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
          this._velocity = clamp(v, -1.8, 1.8);
          this._spinAt = performance.now();
          this._tick();
        }
      } else if (e.type === 'pointerup' && performance.now() - d.at < 400) {
        this._activate();
      }
    };
    this.addEventListener('pointerup', end);
    this.addEventListener('pointercancel', end);
    this.addEventListener('keydown', e => {
      if (!this.hasAttribute('interactive') || e.metaKey || e.ctrlKey || e.altKey) return;
      const yaw = this._target('yaw'), pitch = this._target('pitch');
      const keys = {
        ArrowLeft: () => this.animateTo({ yaw: yaw - 30 }, { duration: 400 }),
        ArrowRight: () => this.animateTo({ yaw: yaw + 30 }, { duration: 400 }),
        ArrowUp: () => this.animateTo({ pitch: clamp(pitch - 15, -75, 75) }, { duration: 400 }),
        ArrowDown: () => this.animateTo({ pitch: clamp(pitch + 15, -75, 75) }, { duration: 400 }),
        Enter: () => this._activate(),
        ' ': () => this._activate(),
        f: () => this.toggle(),
      };
      const run = keys[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (run) { e.preventDefault(); run(); }
    });
  }

  // What a click, Enter or Space does: click="flip" (the default), click="fold" or click="none".
  _activate() {
    const action = this.getAttribute('click') || 'flip';
    if (action === 'fold') this.toggle();
    else if (action !== 'none') this.flip();
    this.dispatchEvent(new CustomEvent('activate', { detail: { action } }));
  }

  // ---------- building ----------
  // Device space, in mm: the open phone faces you, the right half (the camera half) is x > 0, the left half x < 0,
  // y runs down and z comes towards you; the inner screen is at z = 0 and the backs at z = -depth. The left half
  // turns about the hinge line, which runs half the closed gap in front of the screen.

  _build() {
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><div class="stage" part="stage"><div class="shadow" part="shadow"></div><div class="world"></div></div>`;
    this._world = this.shadowRoot.querySelector('.world');
    this._shadowEl = this.shadowRoot.querySelector('.shadow');
    this._pieces = [];
    this._boxes = [];
    this._screens = [];
    this._overlays = [];
    const W = SPEC.width;
    this._leaves = [{ group: 'base', x0: 0, x1: W }, { group: 'flap', x0: -W, x1: 0 }];
    this._half('base', 0, W, true);
    this._half('flap', -W, 0, false);
    this._camera();
    this._buttons();
    this._spine();
    this._fillScreens();
    this._fillLogo();
  }

  // A flat polygon (3D points, mm) facing `normal`, as an element: its local x runs along the first edge.
  _poly(group, pts, normal, extra = {}) {
    const u = unit(sub(pts[1], pts[0])), v = cross(normal, u);
    const loc = pts.map(p => [dot(sub(p, pts[0]), u), dot(sub(p, pts[0]), v)]);
    const xs = loc.map(q => q[0]), ys = loc.map(q => q[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
    const origin = add(pts[0], add(mulv(u, x0), mulv(v, y0)));
    const clip = loc.map(([x, y]) => [x - x0, y - y0]);
    // A piece that (nearly) fills its own rectangle needs no clip, which saves the browser work.
    const square = pts.length === 4 && clip.every(([x, y]) => Math.min(x, w - x) < 0.15 && Math.min(y, h - y) < 0.15);
    return this._piece(group, { origin, u, v, w, h, clip: square ? null : clip, ...extra });
  }

  // An element in the plane through `origin` spanned by u (its x) and v (its y), w by h mm.
  _piece(group, { origin, u, v, w, h, clip, radius, className = 'part', ...extra }) {
    const el = document.createElement('div');
    el.className = className;
    this._world.append(el);
    const n = cross(u, v);
    const piece = { el, group, origin, u, v, n, w, h, clip, radius, color: '', ...extra };
    this._pieces.push(piece);
    return piece;
  }

  // A flat four-sided piece facing away from `centre`.
  _quad(group, p, centre, extra) {
    if (Math.hypot(...sub(p[1], p[0])) < 0.005) return null;
    let n = unit(cross(sub(p[3], p[0]), sub(p[1], p[0])));
    const mid = mulv(add(add(p[0], p[1]), add(p[2], p[3])), 0.25);
    if (dot(n, sub(mid, centre)) < 0) n = mulv(n, -1);
    return this._poly(group, p, n, extra);
  }

  // Lights a strip with a gradient across it, from the surface normal along one long edge (the one through `p`) to
  // the normal along the other.
  _rolled(strip, p, nA, nB) {
    const y = dot(sub(p, strip.origin), strip.v);
    strip.roll = y < strip.h / 2 ? [nA, nB] : [nB, nA];   // [top, bottom] in the strip's own space
  }

  // Strips joining two closed rings of 3D points with the same count, each facing away from `centre`.
  _loft(group, a, b, centre, extra = {}, skip) {
    const out = [];
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      if (skip?.(i, j)) continue;
      const q = this._quad(group, [a[i], a[j], b[j], b[i]], centre, extra);
      if (q) out.push(q);
    }
    return out;
  }

  // One half: the inner screen in front, the camera back or the cover screen behind, the polished band between.
  _half(group, x0, x1, hingeLeft) {
    const W = SPEC.width, H = SPEC.height, T = SPEC.depth, ov = SPEC.overlap, r = SPEC.hingeCorner;
    const outline = halfOutline(x0, x1, hingeLeft);
    const hingeX = hingeLeft ? x0 : x1, inward = hingeLeft ? 1 : -1, centre = [(x0 + x1) / 2, 0, -T / 2];
    const onHinge = (i, j) => Math.abs(outline[i].p[0] - hingeX) < 1e-6 && Math.abs(outline[j].p[0] - hingeX) < 1e-6;
    const rings = SPEC.band.map(([depth, inset]) => ring(outline, inset, depth));

    // The band: polished strips between the rings, except along the hinge. Each strip knows the surface normal along
    // both its long edges, so it is lit as a smooth roll rather than a flat facet.
    const B = SPEC.band, tilt = B.map((_, b) => {
      const seg = c => { const [[d0, i0], [d1, i1]] = [B[c], B[c + 1]], l = Math.hypot(d1 - d0, i1 - i0); return [(d1 - d0) / l, -(i1 - i0) / l]; };
      const a = seg(Math.max(0, b - 1)), c = seg(Math.min(B.length - 2, b));
      const m = [a[0] + c[0], a[1] + c[1]], l = Math.hypot(m[0], m[1]);
      return [m[0] / l, m[1] / l];   // [outward, towards the inner screen]
    });
    const edgeNormal = (n2, b) => [n2[0] * tilt[b][0], n2[1] * tilt[b][0], tilt[b][1]];
    for (let b = 0; b < rings.length - 1; b++) {
      for (let i = 0; i < outline.length; i++) {
        const j = (i + 1) % outline.length;
        if (onHinge(i, j)) continue;
        const strip = this._quad(group, [rings[b][i], rings[b][j], rings[b + 1][j], rings[b + 1][i]], centre, { paint: 'metal', shine: 'polished', depths: [B[b][0], B[b + 1][0]] });
        if (!strip) continue;
        const n2 = unit([outline[i].n[0] + outline[j].n[0], outline[i].n[1] + outline[j].n[1], 0]);
        this._rolled(strip, rings[b][i], edgeNormal(n2, b), edgeNormal(n2, b + 1));
        this._edgeMarks(strip, hingeLeft);
      }
    }
    // Along the hinge the band only wraps the back edge; in front of that is the dark hinge mechanism.
    const ya = -H / 2 + r, yb = H / 2 - r, at = (d, i) => [[hingeX + inward * i, ya, -d], [hingeX + inward * i, yb, -d]];
    const first = B.findIndex(([d]) => d >= SPEC.mechanism);
    this._quad(group, [...at(0, 0.05), ...at(SPEC.mechanism, B[first][1]).reverse()], centre, { paint: 'mechanism', shine: 'matte', hingeSide: true });
    for (let b = first; b < B.length - 1; b++) {
      const [p0, p1] = at(...B[b]), [p3, p2] = at(...B[b + 1]);
      const strip = this._quad(group, [p0, p1, p2, p3], centre, { paint: 'metal', shine: 'polished', hingeSide: true });
      const n2 = [-inward, 0, 0];
      if (strip) this._rolled(strip, p0, edgeNormal(n2, b), edgeNormal(n2, b + 1));
    }
    // Closed, the gap between the halves shows as a dark line all the way round.
    if (hingeLeft) this._loft(group, ring(outline, 0.75, -SPEC.gap), ring(outline, 0.75, 0), centre, { paint: 'gap', shine: 'flat', gap: true }, onHinge);

    // The inner screen. Along the hinge its corners are square and it runs on past the hinge, under the other half.
    const inset = SPEC.band[0][1], front = ring(outline, inset, 0), fx = hingeLeft ? x0 - ov : x0, fw = W + ov;
    const keep = outline.map(q => !q.hinge);
    const run = front.filter((q, i) => keep[i]).map(q => [q[0] - fx, q[1] + H / 2]);
    const edge = hingeLeft ? 0 : fw;
    const half = run.length / 2;
    const clip = hingeLeft ? [[edge, inset], ...run, [edge, H - inset]] : [...run.slice(0, half), [edge, inset], [edge, H - inset], ...run.slice(half)];
    const inner = this._piece(group, { origin: [fx, -H / 2, 0], u: [1, 0, 0], v: [0, 1, 0], w: fw, h: H, clip, className: 'face front', sandwiched: true });
    this._buildInner(inner, hingeLeft, fw, H, ov);

    // The back, seen from behind: frosted glass on the camera half, the cover screen on the other.
    const origin = [x1, -H / 2, -T], back = ring(outline, SPEC.band[SPEC.band.length - 1][1], T);
    const face = this._piece(group, { origin, u: [-1, 0, 0], v: [0, 1, 0], w: W, h: H, clip: back.map(q => [origin[0] - q[0], q[1] + H / 2]), className: 'face back', face: hingeLeft ? 'camera' : 'cover' });
    if (hingeLeft) this._buildBack(face); else this._buildCover(face, W, H);
  }

  // Antenna lines and openings painted onto the straight runs of the band.
  _edgeMarks(s, hingeLeft) {
    const H = SPEC.height, W = SPEC.width, A = SPEC.antennas, P = SPEC.ports;
    const along = s.u, axis = Math.abs(along[0]) > 0.99 ? 0 : Math.abs(along[1]) > 0.99 ? 1 : -1;
    if (axis < 0 || s.w < 5) return;
    const mid = add(s.origin, add(mulv(s.u, s.w / 2), mulv(s.v, s.h / 2)));
    const local = p => [dot(sub(p, s.origin), s.u), dot(sub(p, s.origin), s.v)];
    const marks = [];
    const line = pos => marks.push({ type: 'line', at: pos });
    const isTop = axis === 0 && mid[1] < 0, isBottom = axis === 0 && mid[1] > 0, isSide = axis === 1;
    if (isTop) A.top.forEach(x => line([x - W, mid[1], mid[2]]));
    if (isBottom) A.bottom.forEach(x => line([x - W, mid[1], mid[2]]));
    if (isSide && Math.abs(Math.abs(mid[0]) - W) < 2) A.sides.forEach(y => line([mid[0], -H / 2 + y, mid[2]]));
    const [d0, d1] = s.depths, crosses = (depth, size) => depth + size / 2 > d0 && depth - size / 2 < d1;
    const dots = (spec, cx, y) => crosses(spec.depth, spec.size) && spec.dots.forEach(d => marks.push({ type: 'dot', at: [cx + d, y, -spec.depth], size: spec.size }));
    if (isTop && !hingeLeft) dots(P.leftTop, -W / 2, mid[1]);
    if (isBottom && !hingeLeft) {
      dots(P.leftBottom, -W / 2, mid[1]);
      const slot = P.leftBottom.slot;
      if (crosses(slot.depth, slot.height)) marks.push({ type: 'slot', at: [-W / 2, mid[1], -slot.depth], width: slot.width, height: slot.height });
    }
    if (isBottom && hingeLeft) dots(P.rightBottom, W / 2, mid[1]);
    if (!marks.length) return;
    s.marks = marks.map(m => { const [x, y] = local(m.at); return { ...m, x, y }; }).filter(m => m.x > -2 && m.x < s.w + 2);
  }

  _buildInner(face, hingeLeft, w, h, ov) {
    const S = SPEC.inner, W = SPEC.width;
    const glass = this._layer(face.el, 'glass');
    this._box(glass, { x: 0, y: 0, w, h }, { hingeGlass: { left: hingeLeft, top: S.screen, bottom: S.screen, width: ov + 4 } });
    const screen = this._layer(glass, 'screen');
    screen.part = 'screen';
    // The picture spans both halves; each half shows its side of it. Along the hinge the screen runs 1 mm past the
    // face, which clips it, so the face's own edge is the only edge there (Safari darkens doubled edges).
    const sx = hingeLeft ? -1 : S.screen, sw = w - S.screen + 1, sh = h - 2 * S.screen;
    const r = S.radius;
    this._box(screen, { x: sx, y: S.screen, w: sw, h: sh }, { clip: hingeLeft ? rrect(0, 0, sw, sh, [0, r, r, 0]) : rrect(0, 0, sw, sh, [r, 0, 0, r]) });
    const media = this._layer(screen, 'media');
    const full = 2 * (W - S.screen);
    this._box(media, { x: hingeLeft ? -(W - S.screen) + ov + 1 : 0, y: 0, w: full, h: sh });
    // Waking: as the phone opens, a soft shadow slides off the screen towards the cover side. It is one shadow laid
    // out across both halves like the picture, so the two halves always match at the fold.
    const sweep = this._layer(screen, 'sweep');
    this._box(sweep, { x: hingeLeft ? -(W - S.screen) + ov + 1 : 0, y: 0, w: full, h: sh });
    const shade = this._layer(sweep, 'shade');
    const dark = this._layer(screen, 'veil dark');
    const glare = this._layer(glass, 'glare');
    this._box(glare, { x: hingeLeft ? -W + ov : 0, y: -h * 0.5, w: 2 * W, h: h * 2 });
    face.inner = { shade, dark, glare, hingeLeft };
    this._screens.push({ kind: 'inner', media, w: full, h: sh, follower: !hingeLeft });
  }

  _buildCover(face, w, h) {
    const C = SPEC.cover, s = C.screen;
    const glass = this._layer(face.el, 'glass');
    this._box(glass, { x: 0, y: 0, w, h });
    const screen = this._layer(glass, 'screen');
    screen.part = 'screen';
    const sw = w - s.hinge - s.outer, sh = h - s.top - s.bottom, R = C.radius, r = C.hingeRadius;
    this._box(screen, { x: s.hinge, y: s.top, w: sw, h: sh }, { clip: rrect(0, 0, sw, sh, [r, R, R, r]) });
    const media = this._layer(screen, 'media');
    this._box(media, { x: 0, y: 0, w: sw, h: sh });
    const hole = this._layer(screen, 'hole');
    this._box(hole, { x: sw - C.hole.x - C.hole.size / 2, y: C.hole.y - C.hole.size / 2, w: C.hole.size, h: C.hole.size });
    const glare = this._layer(glass, 'glare');
    this._box(glare, { x: -w * 0.5, y: -h * 0.5, w: w * 2, h: h * 2 });
    face.cover = { glare };
    this._screens.push({ kind: 'cover', media, w: sw, h: sh });
  }

  _buildBack(face) {
    const cam = SPEC.camera, base = cam.plateau[0];
    face.el.part = 'back-glass';
    const tone = this._layer(face.el, 'tone');
    face.tone = tone;
    const foot = this._layer(face.el, 'footprint');
    this._box(foot, { x: base[1] + 0.6, y: base[2] + 1.2, w: base[3] - 1.2, h: base[4] - 0.6 }, { blur: 2.2, radius: base[4] / 2 });
    const logo = document.createElement('img'); logo.className = 'logo'; logo.alt = ''; logo.hidden = true;
    face.el.append(logo);
    this._logo = logo;
    const L = SPEC.logo;
    this._box(logo, { x: L.x - L.size / 2, y: L.y - L.size / 2, w: L.size, h: L.size });
  }

  // The camera plateau, a soft pillow of frosted glass standing out of the back, and the two lenses standing out of it.
  _camera() {
    const W = SPEC.width, H = SPEC.height, T = SPEC.depth, cam = SPEC.camera;
    const at = (lx, ly, h) => [W - lx, -H / 2 + ly, -T - h];
    const stadium = ([h, x, y, len, hgt]) => {
      const r = hgt / 2, pts = [], steps = 10;
      for (let i = 0; i <= steps; i++) { const a = -90 + 180 * (i / steps); pts.push(at(x + len - r + r * Math.cos(a * DEG), y + r + r * Math.sin(a * DEG), h)); }
      for (let i = 0; i <= steps; i++) { const a = 90 + 180 * (i / steps); pts.push(at(x + r + r * Math.cos(a * DEG), y + r + r * Math.sin(a * DEG), h)); }
      return pts;
    };
    const rings = cam.plateau.map(stadium);
    const top = cam.plateau[cam.plateau.length - 1];
    const centre = at(top[1] + top[3] / 2, top[2] + top[4] / 2, 0);
    for (let i = 0; i < rings.length - 1; i++) this._loft('base', rings[i], rings[i + 1], centre, { paint: 'back', shine: 'matte', onBack: true });
    const [h, x, y, len, hgt] = top;
    const plateau = this._piece('base', { origin: at(x, y, h), u: [-1, 0, 0], v: [0, 1, 0], w: len, h: hgt, radius: hgt / 2, className: 'part plateau', paint: 'back', shine: 'matte', onBack: true });
    plateau.el.part = 'camera';
    const mic = this._layer(plateau.el, 'mic');
    this._box(mic, { x: cam.mic.x - x - cam.mic.width / 2, y: cam.mic.y - y - cam.mic.height / 2, w: cam.mic.width, h: cam.mic.height });
    const flash = this._layer(plateau.el, 'flash');
    this._box(flash, { x: cam.flash.x - x - cam.flash.size / 2, y: cam.flash.y - y - cam.flash.size / 2, w: cam.flash.size, h: cam.flash.size });

    // The lenses: a polished ring rising out of the plateau, then the sapphire cover.
    for (const lx of cam.lenses) {
      const R = cam.ring / 2, circle = (r, h2) => Array.from({ length: 22 }, (_, i) => at(lx + r * Math.cos(i / 22 * 2 * Math.PI), cam.lensY + r * Math.sin(i / 22 * 2 * Math.PI), h2));
      const c = at(lx, cam.lensY, h);
      this._loft('base', circle(R, h - 0.05), circle(R, h + cam.ringHeight - 0.35), c, { paint: 'metal', shine: 'polished', onBack: true });
      this._loft('base', circle(R, h + cam.ringHeight - 0.35), circle(R - 0.45, h + cam.ringHeight), c, { paint: 'metal', shine: 'polished', onBack: true });
      const lens = this._piece('base', { origin: at(lx - (R - 0.45), cam.lensY - (R - 0.45), h + cam.ringHeight), u: [-1, 0, 0], v: [0, 1, 0], w: 2 * (R - 0.45), h: 2 * (R - 0.45), radius: R, className: 'part lens', paint: 'metal', shine: 'polished', onBack: true });
      const d = 2 * (R - 0.45);
      const glass = this._layer(lens.el, 'lensglass');
      this._box(glass, { x: (d - cam.aperture) / 2, y: (d - cam.aperture) / 2, w: cam.aperture, h: cam.aperture });
      const sapphire = this._layer(lens.el, 'sapphire');
      this._box(sapphire, { x: (d - cam.sapphire) / 2, y: (d - cam.sapphire) / 2, w: cam.sapphire, h: cam.sapphire });
    }
  }

  // Buttons stand proud of the band: volume on the top edge, the side button and Camera Control on the outer edge.
  _buttons() {
    const W = SPEC.width, H = SPEC.height, B = SPEC.buttons;
    const box = (pts, n, sides, extra) => {
      const face = this._poly('base', pts, n, { paint: 'metal', shine: 'polished', ...extra });
      for (const s of sides) this._poly('base', s.pts, s.n, { paint: 'metal', shine: 'polished' });
      return face;
    };
    const [d0, d1] = B.volume.depth, pv = B.volume.proud, yv = -H / 2;
    for (const [from, to] of B.volume.at) {
      const xa = W - to, xb = W - from;
      box([[xa, yv - pv, -d0], [xb, yv - pv, -d0], [xb, yv - pv, -d1], [xa, yv - pv, -d1]], [0, -1, 0], [
        { pts: [[xa, yv - pv, -d0], [xb, yv - pv, -d0], [xb, yv, -d0], [xa, yv, -d0]], n: [0, 0, 1] },
        { pts: [[xa, yv - pv, -d1], [xb, yv - pv, -d1], [xb, yv, -d1], [xa, yv, -d1]], n: [0, 0, -1] },
      ], { radiusMm: (d1 - d0) / 2 });
    }
    const side = (spec, extra, withSides) => {
      const [a, b] = spec.at, [e0, e1] = spec.depth, p = spec.proud, x = W + p, ya = -H / 2 + a, yb = -H / 2 + b;
      return box([[x, ya, -e0], [x, yb, -e0], [x, yb, -e1], [x, ya, -e1]], [1, 0, 0], withSides ? [
        { pts: [[W, ya, -e0], [x, ya, -e0], [x, yb, -e0], [W, yb, -e0]], n: [0, 0, 1] },
        { pts: [[W, ya, -e1], [x, ya, -e1], [x, yb, -e1], [W, yb, -e1]], n: [0, 0, -1] },
      ] : [], { radiusMm: (e1 - e0) / 2, ...extra });
    };
    side(B.side, {}, true);
    side(B.control, { className: 'part control', shine: 'control' }, false);
  }

  // The hinge cover: a rounded slab that turns half as far as the left half, about the same line. Closed, it is the
  // spine down the hinge side; open, it sinks in behind the screen.
  _spine() {
    const S = SPEC.spine, z0 = SPEC.gap / 2, y0 = -SPEC.height / 2 + S.end, y1 = SPEC.height / 2 - S.end;
    // The section, open: x across the hinge, z back from the hinge line.
    const prof = [[-S.half, S.in]];
    const arc = (cx, cz, a0, a1) => { for (let i = 0; i <= 4; i++) { const a = (a0 + (a1 - a0) * i / 4) * DEG; prof.push([cx + S.radius * Math.cos(a), cz + S.radius * Math.sin(a)]); } };
    arc(-S.half + S.radius, -S.out + S.radius, 180, 270);
    arc(S.half - S.radius, -S.out + S.radius, 270, 360);
    prof.push([S.half, S.in]);
    const P = (x, y, z) => [x, y, z0 + z], centre = P(0, 0, (S.in - S.out) / 2);
    for (let i = 0; i < prof.length - 1; i++) {
      const [ax, az] = prof[i], [bx, bz] = prof[i + 1];
      if (Math.hypot(bx - ax, bz - az) > 0.01) this._quad('spine', [P(ax, y0, az), P(bx, y0, bz), P(bx, y1, bz), P(ax, y1, az)], centre, { paint: 'hinge', shine: 'matte' });
    }
    for (const [y, ny] of [[y0, -1], [y1, 1]]) {
      const pts = prof.map(([x, z]) => P(x, y, z));
      this._poly('spine', ny < 0 ? pts : pts.slice().reverse(), [0, ny, 0], { paint: 'hinge', shine: 'matte' });
    }
  }

  // ---------- 2D content inside a face ----------

  _layer(parent, className) {
    const el = document.createElement('div');
    el.className = `layer ${className}`;
    parent.append(el);
    return el;
  }

  _box(el, box, extra) { this._boxes.push({ el, box, ...extra }); }

  // ---------- screens ----------

  _fillScreens() {
    if (!this._screens) return;
    const videos = [];
    for (const s of this._screens) {
      const src = this.getAttribute(s.kind);
      const current = s.media.firstElementChild;
      if (current && current.getAttribute('src') === src) { if (current.tagName === 'VIDEO') videos.push([s, current]); continue; }
      s.media.replaceChildren();
      s.aspect = 0;
      s.media.parentElement.style.background = src ? 'transparent' : '';
      if (!src) continue;
      let node;
      const blob = [...(this._blobs?.values() || [])].find(b => b.url === src);
      if (blob ? blob.video : VIDEO.test(src) || src.startsWith('data:video/')) {
        node = document.createElement('video');
        node.muted = true; node.loop = true; node.playsInline = true; node.autoplay = true;
        node.setAttribute('muted', ''); node.setAttribute('playsinline', '');
        node.addEventListener('loadedmetadata', () => { s.aspect = node.videoWidth / node.videoHeight; this._orient(); });
        videos.push([s, node]);
      } else {
        node = document.createElement('img');
        node.alt = ''; node.decoding = 'async'; node.draggable = false;
        node.addEventListener('load', () => { s.aspect = node.naturalWidth / node.naturalHeight; this._orient(); });
      }
      node.setAttribute('src', src);
      s.media.append(node);
    }
    // The inner screen is two videos, one per half: the left half follows the right.
    const inner = videos.filter(([s]) => s.kind === 'inner');
    if (inner.length === 2) {
      const follower = inner.find(([s]) => s.follower)[1], leader = inner.find(([s]) => !s.follower)[1];
      const sync = () => {
        if (Math.abs(follower.currentTime - leader.currentTime) > 0.06) follower.currentTime = leader.currentTime;
        if (leader.paused !== follower.paused) leader.paused ? follower.pause() : follower.play().catch(() => {});
        if (leader.isConnected && 'requestVideoFrameCallback' in leader) leader.requestVideoFrameCallback(sync);
      };
      if ('requestVideoFrameCallback' in leader) leader.requestVideoFrameCallback(sync); else leader.addEventListener('timeupdate', sync);
      leader.addEventListener('seeked', sync);
    }
    this._orient();
  }

  // A picture that is the other way round to its screen (a portrait shot on the open inner screen, or a landscape
  // one on the cover) is turned a quarter, so it stands upright when the phone is held that way.
  _orient() {
    for (const s of this._screens || []) {
      const turn = s.aspect > 0 && (s.aspect > 1) !== (s.w > s.h);
      for (const node of [s.media.firstElementChild]) {
        if (!node) continue;
        const grow = 1;
        Object.assign(node.style, turn
          ? { inset: 'auto', left: '50%', top: '50%', width: `${s.h * this._k * grow}px`, height: `${s.w * this._k * grow}px`, transform: `translate(-50%, -50%) rotate(${s.kind === 'inner' ? 90 : -90}deg)` }
          : { inset: '', left: '', top: '', width: '', height: '', transform: '' });
      }
    }
  }

  _fillLogo() {
    if (!this._logo) return;
    const src = this.getAttribute('logo');
    this._logo.hidden = !src;
    if (src) this._logo.src = src; else this._logo.removeAttribute('src');
  }

  // ---------- layout: whenever the size or finish changes ----------

  _layout() {
    if (!this._world) return;
    const w = this.clientWidth, h = this.clientHeight;
    if (!w || !h) return;
    const sw = SPEC.width * 2, sh = SPEC.height;
    // Sized so the open phone in landscape fills the element; other postures scale down to fit as they move.
    const fit = Math.min(w / (sw * 1.16), h / (sh * 1.3));
    const k = (this._k = (parseFloat(this.getAttribute('zoom')) || 1) * fit);
    this._room = [w / fit, h / fit];
    // A move under way was framed for the old size: aim it at the new one.
    if (FRAMING.some(f => this._tweens.has(f))) {
      const end = this._framing(Object.fromEntries(GEOMETRY.map(g => [g, this._target(g)])));
      for (const f of FRAMING) { const t = this._tweens.get(f); if (t) t.to = end[f]; }
    }
    this._eye = sw * 3.4;   // viewer distance in mm
    this.shadowRoot.querySelector('.stage').style.perspective = `${(this._eye * k).toFixed(0)}px`;

    const finish = FINISHES[this.getAttribute('finish')] || FINISHES['star-white'];
    const style = getComputedStyle(this), pick = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    this._colors = {
      metal: rgb(pick('--unfold-metal', finish.metal)),
      back: rgb(pick('--unfold-back', finish.back)),
      hinge: rgb(pick('--unfold-hinge', finish.hinge)),
      mechanism: [34, 34, 37],
      gap: [10, 10, 12],
    };
    const antenna = pick('--unfold-antenna', finish.antenna);
    const px = v => `${(v * k).toFixed(3)}px`;

    for (const p of this._pieces) {
      const s = p.el.style;
      s.width = px(p.w); s.height = px(p.h);
      if (p.clip) s.clipPath = polygon(p.clip, k);
      if (p.radius) s.borderRadius = px(p.radius);
      if (p.radiusMm) s.borderRadius = px(p.radiusMm);
      // Matrix from the element's own pixels to device pixels.
      p.local = [p.u[0], p.u[1], p.u[2], 0, p.v[0], p.v[1], p.v[2], 0, p.n[0], p.n[1], p.n[2], 0, p.origin[0] * k, p.origin[1] * k, p.origin[2] * k, 1];
      p.color = '';
      if (p.marks) p.marksCss = p.marks.map(m => {
        if (m.type === 'line') return `linear-gradient(90deg, transparent ${px(m.x - SPEC.antennas.width / 2)}, ${antenna} ${px(m.x - SPEC.antennas.width / 2)}, ${antenna} ${px(m.x + SPEC.antennas.width / 2)}, transparent ${px(m.x + SPEC.antennas.width / 2)})`;
        if (m.type === 'slot') {
          const r = m.height / 2, c = '#0b0b0d', end = x => `radial-gradient(${px(r)} ${px(r)} at ${px(x)} ${px(m.y)}, ${c} 0 92%, transparent 100%)`;
          return `${end(m.x - m.width / 2 + r)}, ${end(m.x + m.width / 2 - r)}, linear-gradient(${c}, ${c}) ${px(m.x - m.width / 2 + r)} ${px(m.y - r)} / ${px(m.width - 2 * r)} ${px(2 * r)} no-repeat`;
        }
        return `radial-gradient(${px(m.size / 2)} ${px(m.size / 2)} at ${px(m.x)} ${px(m.y)}, #0c0c0e 0 70%, rgba(0,0,0,.25) 86%, transparent 100%)`;
      }).join(', ');
      if (p.marks && !p.roll) s.backgroundImage = p.marksCss;
      if (p.face === 'camera') s.background = css(this._colors.back);
    }
    for (const b of this._boxes) {
      const s = b.el.style;
      Object.assign(s, { left: px(b.box.x), top: px(b.box.y), width: px(b.box.w), height: px(b.box.h) });
      if (b.clip) s.clipPath = polygon(b.clip, k);
      if (b.radius) s.borderRadius = px(b.radius);
      if (b.blur) s.filter = `blur(${px(b.blur)})`;
      if (b.hingeGlass) {
        // Black everywhere except a strip along the hinge behind the picture; the bezel bands still run across.
        const { left, top, bottom, width } = b.hingeGlass, g = '#050507';
        s.background = `linear-gradient(${g}, ${g}) top / 100% ${px(top + 0.3)} no-repeat, linear-gradient(${g}, ${g}) bottom / 100% ${px(bottom + 0.3)} no-repeat, `
          + `linear-gradient(to ${left ? 'right' : 'left'}, transparent ${px(width)}, ${g} ${px(width)})`;
      }
    }
    this._orient();
    this._last = '';
    this._render();
  }

  // ---------- rendering: every frame something moves ----------

  // Where a shape of the phone sits: the middle of its box once folded and held (mm), and the scale (at most 1) that
  // keeps it inside the element with a margin.
  _framing({ fold, roll, anchor, lean }) {
    const H = SPEC.height, T = SPEC.depth, z0 = SPEC.gap / 2, psi = 180 - fold;
    const hold = mm(rotZ(roll), rotY(lean - anchor * psi));
    const place = { base: hold, flap: mm(hold, mm(tr(0, 0, z0), mm(rotY(psi), tr(0, 0, -z0)))) };
    const corners = [];
    for (const leaf of this._leaves || [{ group: 'base', x0: 0, x1: SPEC.width }, { group: 'flap', x0: -SPEC.width, x1: 0 }]) {
      for (const x of [leaf.x0, leaf.x1]) for (const y of [-H / 2, H / 2]) for (const z of [-T, 0]) corners.push(apply(place[leaf.group], [x, y, z]));
    }
    const lo = [0, 1, 2].map(i => Math.min(...corners.map(c => c[i]))), hi = [0, 1, 2].map(i => Math.max(...corners.map(c => c[i])));
    const room = this._room || [SPEC.width * 2 * 1.16, SPEC.height * 1.3];
    const fit = Math.min(1, room[0] / ((hi[0] - lo[0]) * 1.16), room[1] / ((hi[1] - lo[1]) * 1.3));
    return { fit, fx: (lo[0] + hi[0]) / 2, fy: (lo[1] + hi[1]) / 2, fz: (lo[2] + hi[2]) / 2 };
  }

  _render() {
    if (!this._k || !this._world || this._onScreen === false) return;
    const st = this._state, k = this._k, { fold, yaw, pitch, roll, anchor, lean, glow } = st;
    const H = SPEC.height, T = SPEC.depth, z0 = SPEC.gap / 2;
    // The framing follows the shape, unless it is gliding between postures.
    if (!FRAMING.some(f => this._tweens.has(f))) Object.assign(st, this._framing(st));
    const key = [fold, yaw, pitch, roll, anchor, lean, glow, st.fit, st.fx, st.fy, st.fz, k].map(v => v.toFixed(3)).join();
    if (key === this._last) return;
    this._last = key;

    // Each half turns about the hinge line: the left half by psi. Then the whole phone turns about the hinge so the
    // right part keeps still (a laptop's base stays on the table, a tent stands even), and rolls on the page.
    const psi = 180 - fold, h = lean - anchor * psi;
    const hold = mm(rotZ(roll), rotY(h));
    const about = a => mm(tr(0, 0, z0 * k), mm(rotY(a), tr(0, 0, -z0 * k)));
    // The hinge cover rides out to the outer corner as the phone folds: closed it stands out of the side, at a right
    // angle it bridges the two backs, and opening further it sinks between them and narrows to the gap they leave.
    const S = SPEC.spine, reach = T + z0, half = psi / 2 * DEG;
    const d = reach * Math.cos(half) + S.out * Math.pow(Math.sin(half), 4), wide = Math.min(S.half, reach * Math.sin(half) + 0.1) / S.half;
    const spine = mm(tr(0, 0, z0 * k), mm(rotY(psi / 2), mm(tr(0, 0, -(d - S.out) * k), mm([wide, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], tr(0, 0, -z0 * k)))));
    const groups = { base: m4(), flap: about(psi), spine };
    const placed = {};
    for (const g in groups) placed[g] = mm(hold, groups[g]);

    // Turn around the framing point, at the framing scale.
    const corners = [];
    for (const leaf of this._leaves) {
      for (const x of [leaf.x0, leaf.x1]) for (const y of [-H / 2, H / 2]) for (const z of [-T, 0]) corners.push(apply(placed[leaf.group], [x * k, y * k, z * k]));
    }
    const mid = [st.fx * k, st.fy * k, st.fz * k], f = st.fit;
    const view = mm(sc(f), mm(rotX(-pitch), mm(rotY(yaw), tr(-mid[0], -mid[1], -mid[2]))));
    const full = {};
    for (const g in groups) full[g] = mm(view, placed[g]);

    const eye = [0, 0, this._eye * k], closed = fold < 2, flat = fold > 172, C = this._colors;
    const facing = (m, p) => {
      const n = unit([m[8], m[9], m[10]]), v = unit(sub(eye, apply(m, p)));
      return [dot(n, v), n, v];
    };
    // How a direction in a group's own space faces the eye from a point in it.
    const looks = (g, dir, at) => {
      const m = full[g], n = unit([m[0] * dir[0] + m[4] * dir[1] + m[8] * dir[2], m[1] * dir[0] + m[5] * dir[1] + m[9] * dir[2], m[2] * dir[0] + m[6] * dir[1] + m[10] * dir[2]]);
      return dot(n, unit(sub(eye, apply(m, at))));
    };
    // The camera stands on the back and the hinge cover sits behind the inner screen; Safari would draw them through
    // whatever is in front, so they only show when that side can be seen.
    const backSeen = looks('base', [0, 0, -1], [SPEC.width * k / 2, 0, -T * k]);
    const screenInView = looks('base', [0, 0, 1], [20 * k, 0, 0]) > 0 && looks('flap', [0, 0, 1], [-20 * k, 0, 0]) > 0;

    for (const p of this._pieces) {
      const m = mm(full[p.group], p.local);
      const [d, n, v] = facing(m, [p.w * k / 2, p.h * k / 2, 0]);
      let visible = d > 0;
      if (p.sandwiched && closed) visible = false;               // the inner screen is shut
      if (p.gap && fold > 4) visible = false;                    // the dark gap only shows when it is closed
      if ((p.group === 'spine' || p.hingeSide) && (flat || screenInView)) visible = false;
      if (p.onBack && backSeen < -0.08) visible = false;
      const s = p.el.style;
      if (visible !== p.shown) { s.visibility = visible ? 'visible' : 'hidden'; p.shown = visible; }
      if (!visible) continue;
      s.transform = `matrix3d(${m.map(x => +x.toFixed(4)).join(',')})`;
      if (p.roll) {
        const r = m, turn = q => unit([r[0] * q[0] + r[4] * q[1] + r[8] * q[2], r[1] * q[0] + r[5] * q[1] + r[9] * q[2], r[2] * q[0] + r[6] * q[1] + r[10] * q[2]]);
        const base = C[p.paint];
        const g = `linear-gradient(${css(polished(base, turn(p.roll[0]), v))}, ${css(polished(base, turn(p.roll[1]), v))})`;
        if (g !== p.color) { s.backgroundColor = ''; p.gradient = g; s.backgroundImage = p.marksCss ? `${p.marksCss}, ${g}` : g; p.color = g; }
      } else if (p.paint) {
        const base = C[p.paint];
        const c = p.shine === 'polished' ? polished(base, n, v) : p.shine === 'control' ? polished(base.map(x => x * 0.82), n, v) : p.shine === 'matte' ? matte(base, n, v) : base;
        const col = css(c);
        if (col !== p.color) { s.backgroundColor = col; p.color = col; }
      }
      if (p.tone) {
        // The frosted back takes the light softly: darker turned away, lighter towards the key light.
        const t = 0.93 + 0.18 * Math.max(0, dot(n, KEY)) - 1;
        p.tone.style.background = t < 0 ? '#000' : '#fff';
        p.tone.style.opacity = Math.abs(t).toFixed(3);
      }
      if (p.inner) this._screenLight(p, n, fold, glow);
      if (p.cover) this._glare(p.cover.glare, n);
    }

    // A soft shadow below, as wide as the phone looks from here.
    const s = this._shadowEl.style;
    if (this.getAttribute('shadow') === 'none') s.display = 'none';
    else {
      const seen = corners.map(c => apply(view, c));
      const xs = seen.map(c => c[0]), width = Math.max(...xs) - Math.min(...xs), bottom = Math.max(...seen.map(c => c[1]));
      s.display = '';
      s.width = `${(width * 0.92).toFixed(1)}px`;
      s.height = `${(width * 0.11 + 8).toFixed(1)}px`;
      s.transform = `translate(${(this.clientWidth / 2 - width * 0.46).toFixed(1)}px, ${(this.clientHeight / 2 + bottom + width * 0.03).toFixed(1)}px)`;
    }

    this.dispatchEvent(new CustomEvent('change', { detail: this.state }));
  }

  // The inner screen as it opens: the shadow slides off with the hinge angle, so it runs backwards when it closes.
  _screenLight(p, n, fold, glow) {
    const o = p.inner, wake = smooth(12, 132, fold);
    const t = `translateX(${(-200 * wake / 3).toFixed(2)}%)`;
    if (o.shade._t !== t) { o.shade.style.transform = t; o.shade._t = t; }
    const off = (1 - glow).toFixed(3);
    if (o.dark._o !== off) { o.dark.style.opacity = off; o.dark._o = off; }
    this._glare(o.glare, n);
  }

  _glare(el, n) {
    const t = `translate(${(-n[0] * 38).toFixed(1)}%, ${(-n[1] * 38).toFixed(1)}%)`;
    if (el._t !== t) { el.style.transform = t; el._t = t; }
  }
}

if (!customElements.get('unfold-device')) customElements.define('unfold-device', UnfoldDevice);
