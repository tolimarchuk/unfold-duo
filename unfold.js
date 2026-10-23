// Unfold: iPhone Duo in HTML and CSS 3D. Open it, close it, turn it and pose it. No dependencies.
//
//   <script type="module" src="unfold.js"></script>
//   <unfold-device inner="open.png" cover="closed.png" posture="landscape-ajar" interactive></unfold-device>
//
// Everything is in millimetres and scaled to fit the element. The body follows Apple's published size, 84.1 x 117.8
// x 11.3 mm closed and 164.6 x 117.8 mm open. The camera, buttons and hole punch are measured from Apple's product
// photos. Each half is 5.65 mm deep so it closes to 11.3 mm; the halves turn about the line where the two sides of
// the inner screen meet, so the fold never opens a gap in the picture.

export const SPEC = {
  width: 82.3,            // one half
  height: 117.8,
  depth: 5.65,            // one half
  radius: 12.4,           // outer corners
  hingeRadius: 0.5,       // corners along the hinge
  rim: 1.2,               // metal band around the glass on each face
  // Screens: insets from each edge of the face and corner radii, in mm.
  inner: { top: 3.5, bottom: 3.5, outer: 3.55, hinge: 0, radius: 8.7, hingeRadius: 0 },
  // The cover screen's hole punch: its centre from the screen's outer and top edges, and its diameter.
  cover: { top: 2.8, bottom: 2.8, outer: 3.44, hinge: 1.8, radius: 9.5, hingeRadius: 1.1, hole: { x: 7.2, y: 6.9, size: 4.6 } },
  // The camera plateau on the back of the right half, from the outer and top edges of the body. Lens centres and
  // the mic and flash are measured from the plateau's outer end and top.
  camera: {
    x: 4.2, y: 4.0, width: 56.5, height: 21.8, raise: 0.9,
    lens: { at: [10.3, 28.4], size: 16.1, glass: 13.4, raise: 0.7 },
    mic: { x: 45.3, y: 6.5, width: 3.3, height: 1.36 },
    flash: { x: 45.3, y: 15.3, size: 3.6 },
  },
  logo: 17,               // height of the optional logo on the back
  // Buttons, as [from, to] in mm: volume along the top edge from the outer corner, the side button (Touch ID) and
  // Camera Control down the outer edge from the top. All on the camera half.
  buttons: { volume: [[24, 33], [35, 45]], side: [[43, 60]], control: [[82, 98]] },
};

export const FINISHES = {
  'star-white': { metal: '#d6d5d2', back: '#f2f1ed', hinge: '#c6c5c1', ring: '#e6e5e2' },
  'night-sky': { metal: '#2f3b4d', back: '#47535f', hinge: '#3b4657', ring: '#334055' },
};

// Ways to hold it. `fold` is the angle between the two halves of the inner screen (0 shut, 180 flat), `roll` turns
// it on the page, `yaw` and `pitch` are where you look from (pitch above zero looks down on it). `anchor` and `lean` set which half keeps still as it
// folds: each half turns about the hinge, and the whole phone turns by lean - anchor * (180 - fold) degrees.
export const POSTURES = {
  closed: { fold: 0, roll: 0, anchor: 0, lean: 0, yaw: -22, pitch: 8 },
  landscape: { fold: 180, roll: 0, anchor: 0, lean: 0, yaw: -16, pitch: 8 },
  'landscape-ajar': { fold: 140, roll: 0, anchor: 0.5, lean: 0, yaw: -10, pitch: 6 },
  portrait: { fold: 180, roll: -90, anchor: 0, lean: 0, yaw: -16, pitch: 8 },
  'portrait-ajar': { fold: 140, roll: -90, anchor: 0.5, lean: 0, yaw: -16, pitch: 6 },
  laptop: { fold: 105, roll: -90, anchor: 1, lean: 90, yaw: -24, pitch: 16 },
  tent: { fold: 70, roll: 90, anchor: 0.5, lean: 90, yaw: -28, pitch: 12 },
};

// Every <unfold-device> on the page, so a new finish reaches the ones already showing.
const live = new Set();

/** Adds a finish: { metal, back, hinge, ring } colours. */
export function addFinish(name, colors) {
  FINISHES[name] = colors;
  for (const el of live) if (el.getAttribute('finish') === name) el._layout();
}

const VIDEO = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const DEG = Math.PI / 180;
const SEAM = 0.35;   // mm each half of the inner screen runs on past the hinge, under the other, so no hairline shows
const LIGHT = norm([-0.35, -0.6, 0.72]);   // fixed to the viewer: up and to the left
const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
// How each surface takes the light.
const POLISHED = { amb: 0.42, dif: 0.62, spec: 0.55, pow: 18 };
const GLASS = { amb: 0.8, dif: 0.24, spec: 0.22, pow: 40 };
const MATTE = { amb: 0.52, dif: 0.5, spec: 0.08, pow: 6 };

// ---------- small maths ----------

function norm(v) { const l = Math.hypot(...v) || 1; return v.map(x => x / l); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function mul(m, v) { return [dot(m[0], v), dot(m[1], v), dot(m[2], v)]; }
function mmul(a, b) { return a.map(row => [0, 1, 2].map(j => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])); }
// The same matrices CSS uses for rotateX/Y/Z (y points down, z towards the viewer).
function rx(a) { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
function ry(a) { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
function rz(a) { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; }
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

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

// Lights a surface of colour `base` facing `n` (view space): diffuse plus a highlight.
function light(base, n, m, scale = 1) {
  const d = Math.max(0, dot(n, LIGHT)), s = Math.pow(Math.max(0, dot(n, HALF)), m.pow);
  const k = (m.amb + m.dif * d) * scale;
  return base.map(c => Math.round(clamp(c * k + 255 * s * m.spec, 0, 255)));
}
const paint = c => `rgb(${c.join(',')})`;

// Points along a rounded rectangle, clockwise from the top-left, with radii [tl, tr, br, bl].
function outline(x0, y0, x1, y1, radii, step = 1.6) {
  const corners = [[x0, y0, 180], [x1, y0, 270], [x1, y1, 0], [x0, y1, 90]];
  const pts = [];
  corners.forEach(([cx, cy, start], i) => {
    const r = radii[i], ox = cx === x0 ? x0 + r : x1 - r, oy = cy === y0 ? y0 + r : y1 - r;
    const n = r > 0.5 ? Math.max(2, Math.round(r / step)) : 1;
    for (let j = 0; j <= n; j++) {
      const a = (start + (90 * j) / n) * DEG;
      pts.push([ox + r * Math.cos(a), oy + r * Math.sin(a)]);
    }
  });
  return pts;
}

const STYLE = `
:host { display: block; position: relative; width: 100%; aspect-ratio: 16 / 10; contain: layout style; -webkit-user-select: none; user-select: none; }
:host([interactive]) { cursor: grab; touch-action: pan-y; }
:host([interactive]:active) { cursor: grabbing; }
:host(:focus-visible) { outline: 2px solid currentColor; outline-offset: 4px; border-radius: 8px; }
.stage { position: absolute; inset: 0; }
.shadow { position: absolute; left: 0; top: 0; border-radius: 50%; pointer-events: none;
  background: radial-gradient(closest-side, rgba(0, 0, 0, var(--unfold-shadow, .3)), rgba(0, 0, 0, 0)); filter: blur(6px); }
.world { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform-style: preserve-3d; }
.world > * { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.face { overflow: hidden; }
.metal { position: absolute; }
.glass { position: absolute; overflow: hidden; background: #020203; }
.screen { position: absolute; overflow: hidden; background: #050608; }
.media { position: absolute; left: 0; top: 0; }
.media > img, .media > video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.hole { position: absolute; border-radius: 50%; z-index: 2; background: radial-gradient(circle at 42% 40%, #1b2130 0 14%, #05060a 26% 100%); }
.glare { position: absolute; inset: 0; pointer-events: none; z-index: 3; mix-blend-mode: screen; background-size: 320% 320%;
  background-image: linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.16) 48%, rgba(255,255,255,.05) 52%, rgba(255,255,255,0) 60%); }
.backglass { position: absolute; overflow: hidden; }
.backglass::after { content: ""; position: absolute; inset: 0; background: linear-gradient(160deg, rgba(255,255,255,.12), rgba(255,255,255,0) 45%, rgba(0,0,0,.08)); }
.footprint { position: absolute; border-radius: 999px; background: rgba(0, 0, 0, .2); }
.logo { position: absolute; object-fit: contain; }
.plateau { overflow: hidden; }
.plateau::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(170deg, rgba(255,255,255,.18), rgba(255,255,255,0) 40%, rgba(0,0,0,.06)); }
.mic { position: absolute; border-radius: 999px; background: #17191d; }
.flash { position: absolute; border-radius: 50%; background: radial-gradient(circle at 42% 38%, #fffaf0, #e9dcc0 45%, #b9a986 75%, #8f8470); }
.lensglass { position: absolute; border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, rgba(170, 195, 255, .55) 0 4%, rgba(0,0,0,0) 10%),
    radial-gradient(circle at 63% 67%, rgba(140, 100, 220, .4) 0 5%, rgba(0,0,0,0) 12%),
    radial-gradient(circle, #06070a 0 20%, #18202e 21% 30%, #07080b 31% 50%, #252a33 51% 56%, #08090c 57% 100%); }
.control { box-sizing: border-box; background: linear-gradient(90deg, #1c1f25, #2c3038 50%, #1c1f25); }
.knob { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .18), inset 0 1px 0 rgba(255, 255, 255, .35); }
.lens::after { content: ""; position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(0,0,0,0) 0 79%, rgba(0,0,0,.35) 81%, rgba(255,255,255,.55) 85%, rgba(255,255,255,0) 90%, rgba(0,0,0,.22) 97%); }
`;

export class UnfoldDevice extends HTMLElement {
  static observedAttributes = ['posture', 'fold', 'yaw', 'pitch', 'roll', 'finish', 'inner', 'cover', 'logo',
    'interactive', 'zoom', 'shadow', 'label'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const { fold, yaw, pitch, roll, anchor, lean } = POSTURES.landscape;
    this._state = { fold, yaw, pitch, roll, anchor, lean };
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
    return this.animateTo({ ...p, yaw }, { duration: 1200, ...options });
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
  animateTo(target, { duration = 1000, easing: e = 'ease-in-out', delay = 0, force = false } = {}) {
    if (!force && matchMedia('(prefers-reduced-motion: reduce)').matches) { duration = 0; delay = 0; }
    const ease = easing(e);
    const keys = Object.keys(target).filter(k => k in this._state && Number.isFinite(+target[k]));
    return Promise.all(keys.map(key => new Promise(resolve => {
      this._tweens.get(key)?.resolve(false);
      const to = key === 'fold' ? clamp(+target[key], 0, 180) : key === 'pitch' ? clamp(+target[key], -90, 90) : +target[key];
      this._tweens.set(key, { from: this._state[key], to, start: performance.now() + delay, duration, ease, resolve });
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
    if (!this._world) {
      const name = this.getAttribute('posture');
      if (POSTURES[name]) { this._posture = name; Object.assign(this._state, POSTURES[name]); }
      this._readState();
      this._build();
    }
    this._resize = new ResizeObserver(() => this._layout());
    this._resize.observe(this);
    if (this._tweens.size || this._velocity) this._tick();
  }

  disconnectedCallback() {
    live.delete(this);
    this._resize?.disconnect();
    cancelAnimationFrame(this._frame);
    this._frame = 0;
  }

  attributeChangedCallback(name, oldValue, value) {
    if (oldValue === value || !this._world) return;
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
  // Every 3D piece is a direct child of one preserve-3d container and gets its whole transform each frame. Safari
  // drops the children of a rotated 3D container once that container is edge-on, so nothing is nested.

  _build() {
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><div class="stage" part="stage"><div class="shadow" part="shadow"></div><div class="world"></div></div>`;
    this._world = this.shadowRoot.querySelector('.world');
    this._shadowEl = this.shadowRoot.querySelector('.shadow');
    this._pieces = [];   // 3D pieces: { el, group, local } plus culling and lighting data
    this._boxes = [];    // flat boxes inside the faces, in mm
    this._screens = [];

    const W = SPEC.width, R = SPEC.radius, r = SPEC.hingeRadius;
    // The right half goes first, so where the two halves overlap at the hinge the left one is drawn on top.
    this._leaves = [
      this._leaf('base', { x0: 0, x1: W, radii: [r, R, R, r], hinge: 'left', back: 'camera' }),
      this._leaf('flap', { x0: -W, x1: 0, radii: [R, r, r, R], hinge: 'right', back: 'cover' }),
    ];
    this._camera();
    this._buttons();
    this._spine();
    this._fillScreens();
    this._fillLogo();
  }

  _piece(className, group, extra) {
    const el = document.createElement('div');
    el.className = className;
    this._world.append(el);
    const piece = { el, group, ...extra };
    this._pieces.push(piece);
    return piece;
  }

  _box(el, box, extra) { this._boxes.push({ el, box, ...extra }); }

  // A band of strips standing on an outline (device x and y), from depth z0 to z1.
  _walls(group, pts, z0, z1, extra, skip) {
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 0.01 || skip?.(ax, bx)) continue;
      const ang = Math.atan2(by - ay, bx - ax) / DEG, mx = (ax + bx) / 2, my = (ay + by) / 2, z = (z0 + z1) / 2;
      this._piece('wall', group, {
        local: { wall: { mx, my, z, len, ang, t: Math.abs(z1 - z0) } },
        normal: [Math.sin(ang * DEG), -Math.cos(ang * DEG), 0], at: [mx, my, z], ...extra,
      });
    }
  }

  // One half: the inner screen in front, the camera or the cover screen behind, and a polished band around it.
  _leaf(group, { x0, x1, radii, hinge, back }) {
    const H = SPEC.height, t = SPEC.depth;
    for (const side of ['front', 'back']) {
      // A back face is turned around, so its left edge is the leaf's right edge.
      const turned = side === 'back';
      const hingeLeft = (hinge === 'left') !== turned;
      const tuck = turned ? 0 : SEAM, w = x1 - x0 + tuck, cx = (x0 + x1) / 2 + (hingeLeft ? -tuck : tuck) / 2;
      const faceRadii = turned ? [radii[1], radii[0], radii[3], radii[2]] : radii;
      const square = hingeLeft ? [0, faceRadii[1], faceRadii[2], 0] : [faceRadii[0], 0, 0, faceRadii[3]];
      const piece = this._piece(`face ${side}`, group, {
        local: { flat: { cx, cy: 0, z: turned ? -t : 0, w, h: H, turned } }, radii: tuck ? square : faceRadii,
        normal: [0, 0, turned ? -1 : 1], at: [cx, 0, turned ? -t : 0], sandwiched: !turned, face: true,
      });
      const kind = turned ? back : 'inner';
      // The metal around the glass. On the inner screen it is a frame with no side along the hinge, so the face's
      // edge there is pure picture and the two halves meet without a line.
      const metal = document.createElement('div'); metal.className = 'metal';
      piece.el.append(metal);
      piece.metalEl = metal;
      piece.frame = kind === 'inner';
      this._box(metal, { x: 0, y: 0, w, h: H }, { radii: piece.radii, frame: piece.frame ? (hingeLeft ? [1, 1, 1, 0] : [1, 0, 1, 1]) : null });
      if (kind === 'camera') this._buildBack(piece, w, H, piece.radii);
      else this._buildScreen(piece, kind, group, w, H, piece.radii, hingeLeft, tuck);
    }
    // The band: one strip per segment of the outline, except along the hinge, which the spine covers.
    const hingeX = hinge === 'left' ? x0 : x1;
    this._walls(group, outline(x0, -H / 2, x1, H / 2, radii), 0, -t, { paint: 'metal', mat: POLISHED, edge: true },
      (ax, bx) => Math.abs(ax - hingeX) < 0.02 && Math.abs(bx - hingeX) < 0.02);
    return { group, x0, x1 };
  }

  _buildScreen(piece, kind, group, w, h, radii, hingeLeft, tuck) {
    const conf = SPEC[kind], rim = SPEC.rim, face = piece.el;
    const glass = document.createElement('div'); glass.className = 'glass';
    const screen = document.createElement('div'); screen.className = 'screen'; screen.part = 'screen';
    const media = document.createElement('div'); media.className = 'media';
    const glare = document.createElement('div'); glare.className = 'glare';
    screen.append(media); glass.append(screen, glare); face.append(glass);
    piece.glare = glare;

    // The inner screen runs across the hinge with no rim or bezel there.
    const open = kind === 'inner';
    const left = hingeLeft ? conf.hinge : conf.outer, right = hingeLeft ? conf.outer : conf.hinge;
    const rimL = open && hingeLeft ? 0 : rim, rimR = open && !hingeLeft ? 0 : rim;
    const sw = w - left - right, sh = h - conf.top - conf.bottom;
    const sRadii = hingeLeft ? [conf.hingeRadius, conf.radius, conf.radius, conf.hingeRadius] : [conf.radius, conf.hingeRadius, conf.hingeRadius, conf.radius];
    // Where the two halves meet, only the picture may reach the edge: the picture runs 1 mm past the face (which
    // clips it), and the black glass behind it is clear for the last 4 mm, apart from the bezel bands above and
    // below. Any dark layer under that clipped edge would show as a line down the middle of the open screen.
    const ext = open ? 1 : 0, extL = hingeLeft ? ext : 0, gw = w - rimL - rimR + ext;
    this._box(glass, { x: rimL - extL, y: rim, w: gw, h: h - 2 * rim },
      { radii: radii.map((r, i) => Math.max(0, r - (i === 0 || i === 3 ? rimL : rimR))), hingeGlass: open ? { left: hingeLeft, top: conf.top - rim, bottom: conf.bottom - rim } : null });
    this._box(screen, { x: left - rimL, y: conf.top - rim, w: sw + ext, h: sh }, { radii: sRadii });

    // The glare on the inner screen is one streak across both halves, laid out like the picture below.
    if (open) {
      const span = SPEC.width - rim;
      this._box(glare, { x: group === 'base' ? tuck + extL - span : 0, y: 0, w: span * 2, h: h - 2 * rim });
    }

    // Each half of the inner screen shows its side of one picture that is as wide as both halves.
    const half = sw - tuck, full = open ? half * 2 : sw;
    this._box(media, { x: open && group === 'base' ? tuck - half + extL : 0, y: 0, w: full, h: sh });
    if (conf.hole) {
      const { x, y, size } = conf.hole;
      const hole = document.createElement('div'); hole.className = 'hole';
      screen.append(hole);
      this._box(hole, { x: hingeLeft ? sw - x - size / 2 : x - size / 2, y: y - size / 2, w: size, h: size });
    }
    this._screens.push({ kind, screen, media, w: full, h: sh, follower: open && group === 'flap' });
  }

  _buildBack(piece, w, h, radii) {
    const rim = SPEC.rim, cam = SPEC.camera;
    const glass = document.createElement('div'); glass.className = 'backglass'; glass.part = 'back-glass';
    piece.el.append(glass);
    piece.backEl = glass;
    this._box(glass, { x: rim, y: rim, w: w - 2 * rim, h: h - 2 * rim }, { radii: radii.map(r => Math.max(0, r - rim)) });
    // A soft shadow where the camera plateau stands on the glass.
    const foot = document.createElement('div'); foot.className = 'footprint';
    glass.append(foot);
    this._box(foot, { x: cam.x - rim + 0.3, y: cam.y - rim + 0.6, w: cam.width - 0.6, h: cam.height - 0.2 }, { blur: 1.4 });
    const logo = document.createElement('img'); logo.className = 'logo'; logo.alt = ''; logo.hidden = true;
    glass.append(logo);
    this._logo = logo;
    this._box(logo, { x: (w - SPEC.logo) / 2 - rim, y: (h - SPEC.logo) / 2 - rim, w: SPEC.logo, h: SPEC.logo });
  }

  // The camera plateau stands proud of the back of the right half, and the two lenses stand proud of it.
  _camera() {
    const W = SPEC.width, H = SPEC.height, t = SPEC.depth, cam = SPEC.camera, lens = cam.lens;
    // Seen from the back, the plateau starts at the outer edge (x = W) and runs towards the hinge.
    const x1 = W - cam.x, x0 = x1 - cam.width, y0 = -H / 2 + cam.y, y1 = y0 + cam.height, r = cam.height / 2;
    const top = -t - cam.raise;
    const plateau = this._piece('plateau', 'base', {
      local: { flat: { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, z: top, w: cam.width, h: cam.height, turned: true } },
      radii: [r, r, r, r], normal: [0, 0, -1], at: [(x0 + x1) / 2, (y0 + y1) / 2, top], paint: 'back', mat: GLASS, onBack: true,
    });
    plateau.el.part = 'camera';
    const mic = document.createElement('div'); mic.className = 'mic';
    const flash = document.createElement('div'); flash.className = 'flash';
    plateau.el.append(mic, flash);
    this._box(mic, { x: cam.mic.x - cam.mic.width / 2, y: cam.mic.y - cam.mic.height / 2, w: cam.mic.width, h: cam.mic.height });
    this._box(flash, { x: cam.flash.x - cam.flash.size / 2, y: cam.flash.y - cam.flash.size / 2, w: cam.flash.size, h: cam.flash.size });
    this._walls('base', outline(x0, y0, x1, y1, [r, r, r, r], 2.2), -t + 0.1, top, { paint: 'back', mat: GLASS, shade: 0.94, onBack: true });

    const lensTop = top - lens.raise;
    for (const at of lens.at) {
      const cx = x1 - at, cy = (y0 + y1) / 2, lr = lens.size / 2;
      const ring = this._piece('lens', 'base', {
        local: { flat: { cx, cy, z: lensTop, w: lens.size, h: lens.size, turned: true } },
        radii: [lr, lr, lr, lr], normal: [0, 0, -1], at: [cx, cy, lensTop], paint: 'ring', mat: POLISHED, onBack: true,
      });
      const glassEl = document.createElement('div'); glassEl.className = 'lensglass';
      ring.el.append(glassEl);
      this._box(glassEl, { x: (lens.size - lens.glass) / 2, y: (lens.size - lens.glass) / 2, w: lens.glass, h: lens.glass });
      this._walls('base', outline(cx - lr, cy - lr, cx + lr, cy + lr, [lr, lr, lr, lr], 2.6), top + 0.1, lensTop, { paint: 'ring', mat: POLISHED, onBack: true });
    }
  }

  // Volume along the top edge, the side button and Camera Control down the outer edge; all on the camera half.
  _buttons() {
    const W = SPEC.width, H = SPEC.height, t = SPEC.depth, b = SPEC.buttons, z = -t / 2;
    const knob = (x, y, len, axis, extra) => this._piece(`knob${extra?.control ? ' control' : ''}`, 'base', {
      local: { knob: { x, y, z, len, t: t * 0.46, axis } }, normal: axis === 'y-' ? [0, -1, 0] : [1, 0, 0], at: [x, y, z],
      paint: 'metal', mat: POLISHED, ...extra,
    });
    for (const [from, to] of b.volume) knob(W - (from + to) / 2, -H / 2 - 0.5, to - from, 'y-');
    for (const [from, to] of b.side) knob(W + 0.5, -H / 2 + (from + to) / 2, to - from, 'x+');
    for (const [from, to] of b.control) knob(W + 0.15, -H / 2 + (from + to) / 2, to - from, 'x+', { control: true });
  }

  // The hinge: a rounded cover that sits behind the halves when open and becomes the spine when closed.
  _spine() {
    const R = SPEC.depth - 0.06, H = SPEC.height - 0.8, n = 14, e = 3;
    // A squarish half-section: x across, z back from the hinge line.
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (-90 + (180 * i) / n) * DEG, s = Math.sin(a), c = Math.cos(a);
      pts.push([R * Math.sign(s) * Math.pow(Math.abs(s), 2 / e), -R * Math.pow(Math.abs(c), 2 / e)]);
    }
    for (let i = 0; i < n; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const nx = (bz - az) / len, nz = -(bx - ax) / len;   // outward, away from the hinge line
      this._piece('wall', 'spine', { local: { strip: { mx, mz, chord: len + 0.1, H, theta: Math.atan2(nx, nz) / DEG } },
        normal: [nx, 0, nz], at: [mx, 0, mz], paint: 'hinge', mat: MATTE });
    }
    for (const end of [-1, 1]) {
      this._piece('cap', 'spine', { local: { cap: { R, y: (end * H) / 2, end, pts } }, normal: [0, end, 0], at: [0, (end * H) / 2, -R / 2], paint: 'hinge', mat: MATTE });
    }
  }

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
      s.screen.style.background = src ? 'transparent' : '';
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
      const node = s.media.firstElementChild;
      if (!node) continue;
      const turn = s.aspect > 0 && (s.aspect > 1) !== (s.w > s.h);
      Object.assign(node.style, turn
        ? { inset: 'auto', left: '50%', top: '50%', width: `${s.h * this._k}px`, height: `${s.w * this._k}px`, transform: `translate(-50%, -50%) rotate(${s.kind === 'inner' ? 90 : -90}deg)` }
        : { inset: '', left: '', top: '', width: '', height: '', transform: '' });
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
    this._eye = sw * 3.4;   // viewer distance in mm
    this.shadowRoot.querySelector('.stage').style.perspective = `${(this._eye * k).toFixed(0)}px`;

    const finish = FINISHES[this.getAttribute('finish')] || FINISHES['star-white'];
    const style = getComputedStyle(this), pick = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    this._colors = {
      metal: rgb(pick('--unfold-metal', finish.metal)),
      back: rgb(pick('--unfold-back', finish.back)),
      hinge: rgb(pick('--unfold-hinge', finish.hinge)),
      ring: rgb(pick('--unfold-ring', finish.ring)),
    };
    const px = v => `${(v * k).toFixed(3)}px`;

    for (const p of this._pieces) {
      const s = p.el.style, L = p.local;
      if (L.flat) {
        const { cx, cy, z, w: fw, h: fh, turned } = L.flat;
        Object.assign(s, { width: px(fw), height: px(fh), borderRadius: p.radii ? p.radii.map(px).join(' ') : '' });
        p.css = `translate3d(${px(cx)}, ${px(cy)}, ${px(z)})${turned ? ' rotateY(180deg)' : ''} translate(${px(-fw / 2)}, ${px(-fh / 2)})`;
      } else if (L.wall) {
        const { mx, my, z, len, ang, t } = L.wall, ww = len + 0.08;
        Object.assign(s, { width: px(ww), height: px(t) });
        p.css = `translate3d(${px(mx)}, ${px(my)}, ${px(z)}) rotateZ(${ang}deg) rotateX(90deg) translate(${px(-ww / 2)}, ${px(-t / 2)})`;
      } else if (L.knob) {
        const { x, y, z, len, t, axis } = L.knob;
        if (axis === 'y-') {
          Object.assign(s, { width: px(len), height: px(t), borderRadius: px(t / 2) });
          p.css = `translate3d(${px(x)}, ${px(y)}, ${px(z)}) rotateX(90deg) translate(${px(-len / 2)}, ${px(-t / 2)})`;
        } else {
          Object.assign(s, { width: px(t), height: px(len), borderRadius: px(t / 2) });
          p.css = `translate3d(${px(x)}, ${px(y)}, ${px(z)}) rotateY(90deg) translate(${px(-t / 2)}, ${px(-len / 2)})`;
        }
        if (p.control) s.border = `${px(0.35)} solid ${paint(this._colors.metal)}`;
      } else if (L.strip) {
        const { mx, mz, chord, H, theta } = L.strip;
        Object.assign(s, { width: px(chord), height: px(H) });
        p.css = `translate3d(${px(mx)}, 0px, ${px(mz)}) rotateY(${theta}deg) translate(${px(-chord / 2)}, ${px(-H / 2)})`;
      } else if (L.cap) {
        const { R, y, end, pts } = L.cap;
        Object.assign(s, { width: px(2 * R), height: px(R) });
        // The cap is the spine's section: x across, and depth back from the hinge line.
        s.clipPath = `polygon(${pts.map(([x, z]) => `${px(x + R)} ${px(end > 0 ? -z : z + R)}`).join(', ')})`;
        p.css = end > 0 ? `translate3d(0px, ${px(y)}, 0px) rotateX(-90deg) translate(${px(-R)}, 0px)`
          : `translate3d(0px, ${px(y)}, 0px) rotateX(90deg) translate(${px(-R)}, ${px(-R)})`;
      }
    }
    for (const b of this._boxes) {
      const s = b.el.style;
      Object.assign(s, { left: px(b.box.x), top: px(b.box.y), width: px(b.box.w), height: px(b.box.h) });
      if (b.radii) s.borderRadius = b.radii.map(px).join(' ');
      if (b.blur) s.filter = `blur(${px(b.blur)})`;
      if (b.frame) Object.assign(s, { boxSizing: 'border-box', borderStyle: 'solid', borderWidth: b.frame.map(on => (on ? px(SPEC.rim + 0.3) : '0')).join(' ') });
      if (b.hingeGlass) {
        // Black everywhere except a strip along the hinge behind the picture; the bezel bands still run across.
        const { left, top, bottom } = b.hingeGlass, g = '#020203';
        s.background = `linear-gradient(${g}, ${g}) top / 100% ${px(top + 0.3)} no-repeat, linear-gradient(${g}, ${g}) bottom / 100% ${px(bottom + 0.3)} no-repeat, `
          + `linear-gradient(to ${left ? 'right' : 'left'}, transparent ${px(4)}, ${g} ${px(4)})`;
      }
    }
    this._orient();
    this._last = '';
    this._render();
  }

  // ---------- rendering: every frame something moves ----------

  _render() {
    if (!this._k) return;
    const k = this._k, { fold, yaw, pitch, roll, anchor, lean } = this._state;
    const H = SPEC.height, t = SPEC.depth;
    const key = [fold, yaw, pitch, roll, anchor, lean, k].map(v => v.toFixed(3)).join();
    if (key === this._last) return;
    this._last = key;

    // Each half turns about the hinge line: the left half by psi. Then the whole phone turns about the hinge so the
    // right part keeps still (a laptop's base stays on the table, a tent stands even), and rolls on the page.
    const psi = 180 - fold, h = lean - anchor * psi;
    const hold = mmul(rz(roll), ry(h));
    const groups = { base: ry(0), flap: ry(psi), spine: ry(psi / 2) };
    const place = (g, p) => mul(hold, mul(groups[g], p));

    // Turn around the middle of the phone as it is right now, and scale it down if this posture needs more room.
    const corners = [];
    for (const leaf of this._leaves) {
      for (const x of [leaf.x0, leaf.x1]) for (const y of [-H / 2, H / 2]) for (const z of [-t, 0]) corners.push(place(leaf.group, [x, y, z]));
    }
    const lo = [0, 1, 2].map(i => Math.min(...corners.map(c => c[i]))), hi = [0, 1, 2].map(i => Math.max(...corners.map(c => c[i])));
    const mid = lo.map((v, i) => (v + hi[i]) / 2);
    const f = Math.min(1, this._room[0] / ((hi[0] - lo[0]) * 1.16), this._room[1] / ((hi[1] - lo[1]) * 1.3));
    const view = mmul(rx(-pitch), ry(yaw));
    const toView = p => mul(view, [p[0] - mid[0], p[1] - mid[1], p[2] - mid[2]]).map(v => v * f);

    const px = v => `${(v * k).toFixed(3)}px`;
    const fs = f.toFixed(4);
    const prefix = `scale3d(${fs}, ${fs}, ${fs}) rotateX(${-pitch}deg) rotateY(${yaw}deg) `
      + `translate3d(${px(-mid[0])}, ${px(-mid[1])}, ${px(-mid[2])}) rotateZ(${roll}deg) rotateY(${h}deg)`;
    const cssFor = { base: prefix, flap: `${prefix} rotateY(${psi}deg)`, spine: `${prefix} rotateY(${psi / 2}deg)` };
    const turnFor = {};
    for (const g in groups) turnFor[g] = mmul(view, mmul(hold, groups[g]));

    // Show only what faces the eye (perspective included), light every surface and slide the glare across the glass.
    const eye = [0, 0, this._eye], closed = fold < 2, flat = fold > 172, C = this._colors;
    const facing = (n, v) => dot(n, [eye[0] - v[0], eye[1] - v[1], eye[2] - v[2]]) / Math.hypot(eye[0] - v[0], eye[1] - v[1], eye[2] - v[2]);
    // The camera stands on the back, so it only shows when the back is in view or nearly edge-on. (Safari would
    // otherwise draw its sides through the screen.)
    const backInView = facing(mul(turnFor.base, [0, 0, -1]), toView(place('base', [SPEC.width / 2, 0, -SPEC.depth]))) > -0.08;
    // Likewise the spine sits behind the inner screen: when both halves of the screen face you, it is out of sight.
    const screenInView = ['base', 'flap'].every(g => facing(mul(turnFor[g], [0, 0, 1]), toView(place(g, [g === 'base' ? 20 : -20, 0, 0]))) > 0);
    for (const p of this._pieces) {
      const n = mul(turnFor[p.group], p.normal), v = toView(place(p.group, p.at));
      let visible = facing(n, v) > 0;
      if (p.sandwiched && closed) visible = false;               // the inner screen is shut
      if (p.group === 'spine' && (flat || screenInView)) visible = false;
      if (p.onBack && !backInView) visible = false;
      const s = p.el.style;
      s.visibility = visible ? 'visible' : 'hidden';
      if (!visible) continue;
      s.transform = `${cssFor[p.group]} ${p.css}`;
      if (p.face) {
        p.metalEl.style[p.frame ? 'borderColor' : 'background'] = paint(light(C.metal, n, POLISHED));
        if (p.backEl) p.backEl.style.background = paint(light(C.back, n, GLASS));
        if (p.glare) {
          p.glare.style.backgroundPosition = `${(50 - n[0] * 140).toFixed(1)}% ${(50 - n[1] * 140).toFixed(1)}%`;
          p.glare.style.opacity = (0.35 + 0.65 * Math.max(0, n[2])).toFixed(3);
        }
      } else if (p.paint && !p.control) {
        const c = light(C[p.paint], n, p.mat, p.shade);
        // The polished band is rounded front and back: it darkens towards both edges and catches a bright line.
        if (p.edge) {
          const tone = f => paint(c.map(x => Math.round(clamp(x * f + (f > 1 ? 24 : 0), 0, 255))));
          s.background = `linear-gradient(${tone(0.62)}, ${tone(0.95)} 18%, ${tone(1.12)} 36%, ${tone(1)} 52%, ${tone(0.86)} 78%, ${tone(0.6)})`;
        } else s.background = paint(c);
      }
    }

    // A soft shadow below, as wide as the phone looks from here.
    const s = this._shadowEl.style;
    if (this.getAttribute('shadow') === 'none') s.display = 'none';
    else {
      const seen = corners.map(toView);
      const xs = seen.map(c => c[0]), width = (Math.max(...xs) - Math.min(...xs)) * k, bottom = Math.max(...seen.map(c => c[1])) * k;
      s.display = '';
      s.width = `${(width * 0.92).toFixed(1)}px`;
      s.height = `${(width * 0.11 + 8).toFixed(1)}px`;
      s.transform = `translate(${(this.clientWidth / 2 - width * 0.46).toFixed(1)}px, ${(this.clientHeight / 2 + bottom + width * 0.03).toFixed(1)}px)`;
    }

    this.dispatchEvent(new CustomEvent('change', { detail: this.state }));
  }
}

if (!customElements.get('unfold-device')) customElements.define('unfold-device', UnfoldDevice);
