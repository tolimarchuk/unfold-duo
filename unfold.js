// Unfold: a phone you can open, close and turn, drawn with CSS 3D transforms. No dependencies.
//
//   <script type="module" src="unfold.js"></script>
//   <unfold-device inner="open.png" cover="closed.png" interactive></unfold-device>
//
// Geometry is in millimetres and scaled to fit the element. The foldable follows a book-style phone that is
// 164.6 x 117.8 mm open and 84.1 x 117.8 mm closed; the bar model is a generic 6.3-inch phone.

export const MODELS = {
  foldable: {
    foldable: true,       // two halves on a hinge
    width: 82.3,          // one half
    height: 117.8,
    depth: 5.2,           // one half
    gap: 0.9,             // between the halves when closed
    radius: 12.4,         // outer corners
    hingeRadius: 1.2,     // corners along the hinge
    rim: 1.2,             // metal band around the glass on each face
    // Screens: insets from each edge of the face, corner radii, and an optional camera cutout [width, height, top].
    inner: { top: 3.5, bottom: 3.5, outer: 3.55, hinge: 0, radius: 8.7, hingeRadius: 0 },
    cover: { top: 2.8, bottom: 2.8, outer: 3.44, hinge: 1.8, radius: 9.5, hingeRadius: 1.1, cutout: [12, 4.4, 2.1] },
    camera: { x: 5, y: 5, width: 21, height: 46, radius: 9, lens: 9, lenses: [9.5, 21.5, 33.5], flash: 41.6 },
    buttons: [[22, 31], [34, 43], [50, 68]],   // mm from the top, along the outer edge of the camera half
  },
  bar: {
    width: 71.5,
    height: 149.6,
    depth: 8.25,
    radius: 12.85,
    rim: 1.1,
    front: { top: 2.6, bottom: 2.6, outer: 2.64, hinge: 2.64, radius: 10.2, hingeRadius: 10.2, cutout: [15.6, 6.1, 2.3] },
    camera: { x: 4.5, y: 4.5, width: 21, height: 46, radius: 9, lens: 9, lenses: [9.5, 21.5, 33.5], flash: 41.6 },
    buttons: [[45, 70]],
    leftButtons: [[28.4, 36.7], [39.6, 59.8], [62.1, 82.3]],
  },
};

export const FINISHES = {
  black: { metal: '#2b2e35', back: '#1b1d22', plateau: '#141519' },
  silver: { metal: '#c6cad0', back: '#e2e4e8', plateau: '#d2d5da' },
};

// Every <unfold-device> on the page, so new models and finishes reach the ones already showing.
const live = new Set();

/** Adds a model (see MODELS for the shape) and redraws any phone that was waiting for it. */
export function addModel(name, spec) {
  MODELS[name] = spec;
  for (const el of live) if (el.getAttribute('model') === name) { el._build(); el._layout(); el._describe(); }
}

/** Adds a finish: { metal, back, plateau } colours. */
export function addFinish(name, colors) {
  FINISHES[name] = colors;
  for (const el of live) if (el.getAttribute('finish') === name) el._layout();
}

const VIDEO = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const DEG = Math.PI / 180;
const SEAM = 0.35;   // mm the right half of the inner display tucks under the left, so no hairline shows at the hinge
const LIGHT = norm([-0.35, -0.6, 0.72]);   // fixed to the viewer: up and to the left
const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);

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

// Lights a metal surface facing `n` (view space): diffuse plus a soft highlight.
function shade(base, n) {
  const d = Math.max(0, dot(n, LIGHT)), s = Math.pow(Math.max(0, dot(n, HALF)), 18);
  const k = 0.42 + 0.62 * d;
  return `rgb(${base.map(c => Math.round(clamp(c * k + 255 * s * 0.5, 0, 255))).join(',')})`;
}

// Points along a rounded rectangle, clockwise from the top-left, with radii [tl, tr, br, bl].
function outline(x0, y0, x1, y1, radii) {
  const corners = [[x0, y0, 180], [x1, y0, 270], [x1, y1, 0], [x0, y1, 90]];
  const pts = [];
  corners.forEach(([cx, cy, start], i) => {
    const r = radii[i], ox = cx === x0 ? x0 + r : x1 - r, oy = cy === y0 ? y0 + r : y1 - r;
    const n = r > 0.5 ? Math.max(2, Math.round(r / 1.6)) : 1;
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
.cutout { position: absolute; background: #000; border-radius: 999px; z-index: 2; }
.glare { position: absolute; inset: 0; pointer-events: none; z-index: 3; mix-blend-mode: screen; background-size: 320% 320%;
  background-image: linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.16) 48%, rgba(255,255,255,.05) 52%, rgba(255,255,255,0) 60%); }
.backglass { position: absolute; overflow: hidden; }
.backglass::after { content: ""; position: absolute; inset: 0; background: linear-gradient(160deg, rgba(255,255,255,.10), rgba(255,255,255,0) 45%, rgba(0,0,0,.12)); }
.plateau { position: absolute; z-index: 1; }
.lens { position: absolute; border-radius: 50%;
  background: radial-gradient(circle at 38% 34%, rgba(150,180,255,.55) 0 6%, rgba(0,0,0,0) 14%),
    radial-gradient(circle, #07080b 0 30%, #1a2232 31% 42%, #050608 43% 58%, #2a2d33 59% 70%, #0b0c0f 71%); }
.flash { position: absolute; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff8e6, #d9c9a0 60%, #8d826a); }
`;

export class UnfoldDevice extends HTMLElement {
  static observedAttributes = ['model', 'fold', 'yaw', 'pitch', 'roll', 'finish', 'orientation', 'inner', 'cover', 'front',
    'interactive', 'zoom', 'shadow', 'label'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._state = { fold: 180, yaw: -18, pitch: 8, roll: 0 };
    this._tweens = new Map();
    this._frame = 0;
    this._k = 0;
    this._last = '';
  }

  // ---------- public API ----------

  get model() { return MODELS[this.getAttribute('model')] ? this.getAttribute('model') : 'foldable'; }
  get _folds() { return !!MODELS[this.model].foldable; }
  /** The current fold (0 closed to 180 open) and yaw, pitch and roll in degrees. */
  get state() { return { ...this._state }; }
  get fold() { return this._state.fold; }
  set fold(v) { this._set({ fold: v }); }
  get yaw() { return this._state.yaw; }
  set yaw(v) { this._set({ yaw: v }); }
  get pitch() { return this._state.pitch; }
  set pitch(v) { this._set({ pitch: v }); }
  get roll() { return this._state.roll; }
  set roll(v) { this._set({ roll: v }); }

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
   * Sets a screen ("inner", "cover" or "front") to an image or video: a URL, or a File or Blob such as one picked or
   * dropped by the user. Pass null to turn it off.
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
    this._readState();
    if (!this._world) this._build();
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
    if (['fold', 'yaw', 'pitch', 'roll'].includes(name)) { this._readState(); this._render(); }
    else if (name === 'interactive' || name === 'label') this._describe();
    else if (name === 'inner' || name === 'cover' || name === 'front') this._fillScreens();
    else { if (name === 'model') this._build(); this._layout(); }
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
    this.setAttribute('aria-label', this.getAttribute('label') || (this._folds ? 'Foldable phone' : 'Phone'));
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
      if (e.pointerType !== 'touch') this._state.pitch = clamp(drag.pitch - dy * perPx * 0.7, -75, 75);
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
        ArrowUp: () => this.animateTo({ pitch: clamp(pitch + 15, -75, 75) }, { duration: 400 }),
        ArrowDown: () => this.animateTo({ pitch: clamp(pitch - 15, -75, 75) }, { duration: 400 }),
        Enter: () => this._activate(),
        ' ': () => this._activate(),
        f: () => this.toggle(),
      };
      const run = keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] || keys[e.key];
      if (run) { e.preventDefault(); run(); }
    });
  }

  // What a click, Enter or Space does: click="flip" (the default), click="fold" or click="none".
  _activate() {
    const action = this.getAttribute('click') || 'flip';
    if (action === 'fold' && this._folds) this.toggle();
    else if (action !== 'none') this.flip();
    this.dispatchEvent(new CustomEvent('activate', { detail: { action } }));
  }

  // ---------- building ----------
  // Every 3D piece is a direct child of one preserve-3d container and gets its whole transform each frame. Safari
  // drops the children of a rotated 3D container once that container is edge-on, so nothing is nested.

  _build() {
    const spec = (this._spec = MODELS[this.model]);
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><div class="stage" part="stage"><div class="shadow" part="shadow"></div><div class="world"></div></div>`;
    this._world = this.shadowRoot.querySelector('.world');
    this._shadowEl = this.shadowRoot.querySelector('.shadow');
    this._pieces = [];   // 3D pieces: { el, group, local } plus culling and lighting data
    this._boxes = [];    // flat boxes inside the faces, in mm
    this._screens = [];

    const W = spec.width, R = spec.radius, r = spec.hingeRadius;
    if (spec.foldable) {
      // The right half goes first, so where the two halves overlap at the hinge the left one is drawn on top.
      this._leaves = [
        this._leaf('base', { x0: 0, x1: W, radii: [r, R, R, r], hinge: 'left', front: 'inner', back: 'camera', buttons: spec.buttons }),
        this._leaf('flap', { x0: -W, x1: 0, radii: [R, r, r, R], hinge: 'right', front: 'inner', back: 'cover' }),
      ];
      this._spine(spec);
    } else {
      this._leaves = [this._leaf('base', { x0: -W / 2, x1: W / 2, radii: [R, R, R, R], hinge: null, front: 'front', back: 'camera',
        buttons: spec.buttons, leftButtons: spec.leftButtons })];
    }
    this._fillScreens();
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

  // One half of the foldable (or the whole bar phone): a front face, a back face and a wall around the outline.
  _leaf(group, { x0, x1, radii, hinge, front, back, buttons = [], leftButtons = [] }) {
    const spec = this._spec, H = spec.height, t = spec.depth;
    const leaf = { group, x0, x1 };

    for (const side of ['front', 'back']) {
      // A back face is turned around, so its left edge is the leaf's right edge.
      const turned = side === 'back';
      const hingeLeft = hinge ? (hinge === 'left') !== turned : false;
      const tuck = side === 'front' && front === 'inner' && hinge === 'left' ? SEAM : 0;
      const w = x1 - x0 + tuck, cx = (x0 + x1 - tuck) / 2, z = turned ? -t : 0;
      const faceRadii = turned ? [radii[1], radii[0], radii[3], radii[2]] : radii;
      const piece = this._piece(`face ${side}`, group, {
        local: { face: { cx, z, w, h: H, turned } }, radii: tuck ? [0, ...faceRadii.slice(1, 3), 0] : faceRadii,
        normal: [0, 0, turned ? -1 : 1], at: [cx, 0, z], sandwiched: side === 'front' && !!hinge, face: true,
      });
      const kind = side === 'front' ? front : back;
      // The metal around the glass. On the inner display it is a frame with no side along the hinge, so the face's
      // edge there is pure picture and the two halves meet without a line.
      const metal = document.createElement('div'); metal.className = 'metal';
      piece.el.append(metal);
      piece.metalEl = metal;
      piece.frame = kind === 'inner';
      this._box(metal, { x: 0, y: 0, w, h: H }, { radii: piece.radii, frame: kind === 'inner' ? (hingeLeft ? [1, 1, 1, 0] : [1, 0, 1, 1]) : null });
      if (kind === 'camera') this._buildBack(piece, w, H, piece.radii, hingeLeft);
      else this._buildScreen(piece, kind, group, w, H, piece.radii, hingeLeft, tuck);
    }

    // The wall: one strip per segment of the outline, from the front face back by the depth.
    const pts = outline(x0, -H / 2, x1, H / 2, radii);
    const hingeX = hinge === 'left' ? x0 : hinge === 'right' ? x1 : null;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 0.01) continue;
      const ang = Math.atan2(by - ay, bx - ax) / DEG;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      this._piece('wall', group, {
        local: { wall: { mx, my, len, ang, t } },
        normal: [Math.sin(ang * DEG), -Math.cos(ang * DEG), 0], at: [mx, my, -t / 2], metal: 1,
        hingeWall: hingeX !== null && Math.abs(ax - hingeX) < 0.02 && Math.abs(bx - hingeX) < 0.02,
      });
    }

    // Buttons stand proud of the outer edge (and the left edge, for the bar phone).
    const outerX = hinge === 'left' ? x1 : hinge === 'right' ? x0 : x1;
    const button = (x, [from, to], dir) => {
      const y = -H / 2 + (from + to) / 2, bx = x + dir * 0.55;
      this._piece('knob', group, { local: { knob: { x: bx, y, len: to - from, t: t * 0.5, dir } }, normal: [dir, 0, 0], at: [bx, y, -t / 2], metal: 0.86 });
    };
    buttons.forEach(b => button(outerX, b, Math.sign(outerX) || 1));
    leftButtons.forEach(b => button(x0, b, -1));
    return leaf;
  }

  _buildScreen(piece, kind, group, w, h, radii, hingeLeft, tuck) {
    const spec = this._spec, conf = spec[kind], rim = spec.rim, face = piece.el;
    const glass = document.createElement('div'); glass.className = 'glass';
    const screen = document.createElement('div'); screen.className = 'screen'; screen.part = 'screen';
    const media = document.createElement('div'); media.className = 'media';
    const glare = document.createElement('div'); glare.className = 'glare';
    screen.append(media); glass.append(screen, glare); face.append(glass);
    piece.glare = glare;

    // The inner display runs across the hinge with no rim or bezel there.
    const open = kind === 'inner';
    const left = hingeLeft ? conf.hinge : conf.outer, right = hingeLeft ? conf.outer : conf.hinge;
    const rimL = open && hingeLeft ? 0 : rim, rimR = open && !hingeLeft ? 0 : rim;
    const sw = w - left - right, sh = h - conf.top - conf.bottom;
    const sRadii = hingeLeft ? [conf.hingeRadius, conf.radius, conf.radius, conf.hingeRadius] : [conf.radius, conf.hingeRadius, conf.hingeRadius, conf.radius];
    // Where the two halves meet, only the picture may reach the edge: the picture runs 1 mm past the face (which
    // clips it), and the black glass behind it is clear for the last 4 mm, apart from the bezel bands above and
    // below. Any dark layer under that clipped edge would show as a line down the middle of the open display.
    const ext = open ? 1 : 0, extL = hingeLeft ? ext : 0, gw = w - rimL - rimR + ext;
    this._box(glass, { x: rimL - extL, y: rim, w: gw, h: h - 2 * rim },
      { radii: radii.map((r, i) => Math.max(0, r - (i === 0 || i === 3 ? rimL : rimR))), hingeGlass: open ? { left: hingeLeft, top: conf.top - rim, bottom: conf.bottom - rim } : null });
    this._box(screen, { x: left - rimL, y: conf.top - rim, w: sw + ext, h: sh }, { radii: sRadii });

    // The glare on the inner display is one streak across both halves, laid out like the picture below.
    if (open) {
      const span = spec.width - rim;
      this._box(glare, { x: group === 'base' ? tuck + extL - span : 0, y: 0, w: span * 2, h: h - 2 * rim });
    }

    // Each half of the inner display shows its side of one picture that is as wide as both halves.
    const half = sw - tuck, full = open ? half * 2 : sw;
    this._box(media, { x: open && group === 'base' ? tuck - half + extL : 0, y: 0, w: full, h: sh });
    if (conf.cutout) {
      const [cw, ch, top] = conf.cutout;
      const cut = document.createElement('div'); cut.className = 'cutout';
      screen.append(cut);
      this._box(cut, { x: (sw - cw) / 2, y: top, w: cw, h: ch });
    }
    this._screens.push({ kind, screen, media, w: full, h: sh, follower: open && group === 'flap' });
  }

  _buildBack(piece, w, h, radii, hingeLeft) {
    const spec = this._spec, rim = spec.rim, cam = spec.camera;
    const glass = document.createElement('div'); glass.className = 'backglass'; glass.part = 'back-glass';
    const plateau = document.createElement('div'); plateau.className = 'plateau'; plateau.part = 'camera';
    piece.el.append(glass); glass.append(plateau);
    this._box(glass, { x: rim, y: rim, w: w - 2 * rim, h: h - 2 * rim }, { radii: radii.map(r => Math.max(0, r - rim)), paint: 'back' });
    // The camera sits at the top on the outer edge: top left when you look at the back.
    const x = hingeLeft ? w - 2 * rim - cam.x - cam.width : cam.x;
    this._box(plateau, { x, y: cam.y, w: cam.width, h: cam.height }, { radii: [cam.radius, cam.radius, cam.radius, cam.radius], paint: 'plateau' });
    for (const y of cam.lenses) {
      const lens = document.createElement('div'); lens.className = 'lens';
      plateau.append(lens);
      this._box(lens, { x: (cam.width - cam.lens) / 2, y: y - cam.lens / 2, w: cam.lens, h: cam.lens }, { paint: 'lens' });
    }
    const flash = document.createElement('div'); flash.className = 'flash';
    plateau.append(flash);
    this._box(flash, { x: (cam.width - 3.2) / 2, y: cam.flash - 1.6, w: 3.2, h: 3.2 });
  }

  // The hinge: a half tube that tucks in behind the halves when open and becomes the rounded spine when closed.
  _spine(spec) {
    const R = spec.depth + spec.gap / 2 - 0.08, H = spec.height - 0.6, n = 12, span = 80;
    for (let i = 0; i < n; i++) {
      const a = -span + (2 * span * (i + 0.5)) / n, chord = 2 * R * Math.sin((span / n) * DEG) + 0.12;
      const at = [R * Math.sin(a * DEG), 0, -R * Math.cos(a * DEG)];
      this._piece('wall', 'spine', { local: { strip: { a, R, chord, H } }, normal: [Math.sin(a * DEG), 0, -Math.cos(a * DEG)], at, metal: 0.9 });
    }
    for (const end of [-1, 1]) {
      this._piece('cap', 'spine', { local: { cap: { R, y: (end * H) / 2, end } }, normal: [0, end, 0], at: [0, (end * H) / 2, -R / 2], metal: 0.8 });
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
      s.screen.style.background = src ? 'transparent' : '';
      if (!src) continue;
      let node;
      const blob = [...(this._blobs?.values() || [])].find(b => b.url === src);
      if (blob ? blob.video : VIDEO.test(src) || src.startsWith('data:video/')) {
        node = document.createElement('video');
        node.muted = true; node.loop = true; node.playsInline = true; node.autoplay = true;
        node.setAttribute('muted', ''); node.setAttribute('playsinline', '');
        videos.push([s, node]);
      } else {
        node = document.createElement('img');
        node.alt = ''; node.decoding = 'async'; node.draggable = false;
      }
      node.setAttribute('src', src);
      s.media.append(node);
    }
    // The inner display is two videos, one per half: the left half follows the right.
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

  // orientation="portrait": the open phone turns on its side as it unfolds, and the inner picture stands upright.
  _orient() {
    const portrait = this.getAttribute('orientation') === 'portrait' && this._folds;
    for (const s of this._screens || []) {
      const node = s.kind === 'inner' && s.media.firstElementChild;
      if (!node) continue;
      Object.assign(node.style, portrait
        ? { inset: 'auto', left: '50%', top: '50%', width: `${s.h * this._k}px`, height: `${s.w * this._k}px`, transform: 'translate(-50%, -50%) rotate(-90deg)' }
        : { inset: '', left: '', top: '', width: '', height: '', transform: '' });
    }
  }

  // ---------- layout: whenever the size, model or finish changes ----------

  _layout() {
    if (!this._world) return;
    const spec = this._spec, w = this.clientWidth, h = this.clientHeight;
    if (!w || !h) return;
    const portrait = this.getAttribute('orientation') === 'portrait' && this._folds;
    let sw = spec.foldable ? spec.width * 2 : spec.height * 0.62, sh = spec.height;
    if (portrait) sw = sh = Math.max(sw, sh);
    const k = (this._k = (parseFloat(this.getAttribute('zoom')) || 1) * Math.min(w / (sw * 1.16), h / (sh * 1.3)));
    this._eye = Math.max(sw, sh) * 3.4;   // viewer distance in mm
    this.shadowRoot.querySelector('.stage').style.perspective = `${(this._eye * k).toFixed(0)}px`;

    const finish = FINISHES[this.getAttribute('finish')] || FINISHES.black;
    const css = getComputedStyle(this), pick = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    this._metal = rgb(pick('--unfold-metal', finish.metal));
    const paints = { back: pick('--unfold-back', finish.back), plateau: pick('--unfold-plateau', finish.plateau) };
    const px = v => `${(v * k).toFixed(3)}px`;

    for (const p of this._pieces) {
      const s = p.el.style, L = p.local;
      if (L.face) {
        const { cx, z, w: fw, h: fh, turned } = L.face;
        Object.assign(s, { width: px(fw), height: px(fh), borderRadius: p.radii.map(px).join(' ') });
        p.css = `translate3d(${px(cx)}, 0px, ${px(z)})${turned ? ' rotateY(180deg)' : ''} translate(${px(-fw / 2)}, ${px(-fh / 2)})`;
      } else if (L.wall) {
        const { mx, my, len, ang, t } = L.wall, ww = len + 0.08;
        Object.assign(s, { width: px(ww), height: px(t) });
        p.css = `translate3d(${px(mx)}, ${px(my)}, ${px(-t / 2)}) rotateZ(${ang}deg) rotateX(90deg) translate(${px(-ww / 2)}, ${px(-t / 2)})`;
      } else if (L.knob) {
        const { x, y, len, t, dir } = L.knob;
        Object.assign(s, { width: px(t), height: px(len), borderRadius: px(Math.min(t, len) / 2) });
        p.css = `translate3d(${px(x)}, ${px(y)}, ${px(-spec.depth / 2)}) rotateY(${dir * 90}deg) translate(${px(-t / 2)}, ${px(-len / 2)})`;
      } else if (L.strip) {
        const { a, R, chord, H } = L.strip;
        Object.assign(s, { width: px(chord), height: px(H) });
        p.css = `translate3d(${px(R * Math.sin(a * DEG))}, 0px, ${px(-R * Math.cos(a * DEG))}) rotateY(${180 - a}deg) translate(${px(-chord / 2)}, ${px(-H / 2)})`;
      } else if (L.cap) {
        const { R, y, end } = L.cap;
        Object.assign(s, { width: px(2 * R), height: px(R), borderRadius: end > 0 ? `0 0 ${px(R)} ${px(R)}` : `${px(R)} ${px(R)} 0 0` });
        p.css = end > 0 ? `translate3d(0px, ${px(y)}, 0px) rotateX(-90deg) translate(${px(-R)}, 0px)`
          : `translate3d(0px, ${px(y)}, 0px) rotateX(90deg) translate(${px(-R)}, ${px(-R)})`;
      }
    }
    for (const b of this._boxes) {
      const s = b.el.style;
      Object.assign(s, { left: px(b.box.x), top: px(b.box.y), width: px(b.box.w), height: px(b.box.h) });
      if (b.radii) s.borderRadius = b.radii.map(px).join(' ');
      if (b.paint === 'back') s.background = paints.back;
      if (b.frame) Object.assign(s, { boxSizing: 'border-box', borderStyle: 'solid', borderWidth: b.frame.map(on => (on ? px(spec.rim + 0.3) : '0')).join(' ') });
      if (b.hingeGlass) {
        // Black everywhere except a strip along the hinge behind the picture; the bezel bands still run across.
        const { left, top, bottom } = b.hingeGlass, g = '#020203';
        s.background = `linear-gradient(${g}, ${g}) top / 100% ${px(top + 0.3)} no-repeat, linear-gradient(${g}, ${g}) bottom / 100% ${px(bottom + 0.3)} no-repeat, `
          + `linear-gradient(to ${left ? 'right' : 'left'}, transparent ${px(4)}, ${g} ${px(4)})`;
      }
      if (b.paint === 'plateau') {
        s.background = paints.plateau;
        s.boxShadow = `inset 0 ${px(0.3)} 0 rgba(255,255,255,.22), inset 0 ${px(-0.3)} 0 rgba(0,0,0,.28), 0 ${px(0.6)} ${px(1.6)} rgba(0,0,0,.35)`;
      }
      if (b.paint === 'lens') s.boxShadow = `0 0 0 ${px(0.5)} rgba(255,255,255,.14), 0 ${px(0.3)} ${px(0.8)} rgba(0,0,0,.6)`;
    }
    this._orient();
    this._last = '';
    this._render();
  }

  // ---------- rendering: every frame something moves ----------

  _render() {
    if (!this._k) return;
    const spec = this._spec, k = this._k, { fold, yaw, pitch } = this._state;
    const foldable = !!spec.foldable;
    const H = spec.height, t = spec.depth;
    const roll = this._state.roll + (foldable && this.getAttribute('orientation') === 'portrait' ? 90 * (fold / 180) : 0);
    const key = [fold, yaw, pitch, roll, k].map(v => v.toFixed(3)).join();
    if (key === this._last) return;
    this._last = key;

    // The left half turns about the hinge axis, which sits half the closed gap in front of the screens.
    const psi = foldable ? 180 - fold : 0, z0 = foldable ? spec.gap / 2 : 0;
    const groups = {
      base: { m: ry(0), at: p => p },
      flap: { m: ry(psi), at: p => { const q = mul(ry(psi), [p[0], p[1], p[2] - z0]); return [q[0], q[1], q[2] + z0]; } },
      spine: { m: ry(psi / 2), at: p => { const q = mul(ry(psi / 2), p); return [q[0], q[1], q[2] + z0]; } },
    };

    // Turn around the middle of the phone as it is right now.
    const corners = [];
    for (const leaf of this._leaves) {
      for (const x of [leaf.x0, leaf.x1]) for (const y of [-H / 2, H / 2]) for (const z of [-t, 0]) corners.push(groups[leaf.group].at([x, y, z]));
    }
    const span = i => [Math.min(...corners.map(c => c[i])), Math.max(...corners.map(c => c[i]))];
    const [xa, xb] = span(0), [za, zb] = span(2), cx = (xa + xb) / 2, cz = (za + zb) / 2;
    const world = mmul(mmul(rx(pitch), ry(yaw)), rz(roll));

    const px = v => `${(v * k).toFixed(3)}px`;
    const prefix = `rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg) translate3d(${px(-cx)}, 0px, ${px(-cz)})`;
    const css = {
      base: prefix,
      flap: `${prefix} translate3d(0px, 0px, ${px(z0)}) rotateY(${psi}deg) translate3d(0px, 0px, ${px(-z0)})`,
      spine: `${prefix} translate3d(0px, 0px, ${px(z0)}) rotateY(${psi / 2}deg)`,
    };

    // Show only what faces the eye (perspective included), light the metal and slide the glare across the glass.
    const eye = [0, 0, this._eye], closed = fold < 2, flat = fold > 172;
    for (const p of this._pieces) {
      const g = groups[p.group], n = mul(world, mul(g.m, p.normal)), a = g.at(p.at);
      const v = mul(world, [a[0] - cx, a[1], a[2] - cz]);
      let visible = dot(n, [eye[0] - v[0], eye[1] - v[1], eye[2] - v[2]]) > 0;
      if (p.sandwiched && closed) visible = false;               // the inner display is shut
      if ((p.hingeWall || p.group === 'spine') && flat) visible = false;
      if (p.hingeWall && closed) visible = false;
      const s = p.el.style;
      s.visibility = visible ? 'visible' : 'hidden';
      if (!visible) continue;
      s.transform = `${css[p.group]} ${p.css}`;
      if (p.metal) s.background = shade(p.metal === 1 ? this._metal : this._metal.map(c => c * p.metal), n);
      else if (p.face) {
        p.metalEl.style[p.frame ? 'borderColor' : 'background'] = shade(this._metal, n);
        if (p.glare) {
          p.glare.style.backgroundPosition = `${(50 - n[0] * 140).toFixed(1)}% ${(50 - n[1] * 140).toFixed(1)}%`;
          p.glare.style.opacity = (0.35 + 0.65 * Math.max(0, n[2])).toFixed(3);
        }
      }
    }

    // A soft shadow below, as wide as the phone looks from here.
    const s = this._shadowEl.style;
    if (this.getAttribute('shadow') === 'none') s.display = 'none';
    else {
      const view = corners.map(c => mul(world, [c[0] - cx, c[1], c[2] - cz]));
      const xs = view.map(c => c[0]), width = (Math.max(...xs) - Math.min(...xs)) * k, bottom = Math.max(...view.map(c => c[1])) * k;
      s.display = '';
      s.width = `${(width * 0.92).toFixed(1)}px`;
      s.height = `${(width * 0.11 + 8).toFixed(1)}px`;
      s.transform = `translate(${(this.clientWidth / 2 - width * 0.46).toFixed(1)}px, ${(this.clientHeight / 2 + bottom + width * 0.03).toFixed(1)}px)`;
    }

    this.dispatchEvent(new CustomEvent('change', { detail: this.state }));
  }
}

if (!customElements.get('unfold-device')) customElements.define('unfold-device', UnfoldDevice);
