/**
 * Organic marks for the press: everything is drawn by hand, never as perfect primitives.
 * Lines are tapered ribbons with pressure that wobble a little on each boil step;
 * outlines are resampled and wobbled; texture fields are made of leaf-shaped brush dabs.
 * (The ribbon and wobble follow the "animate" skill's riso kit, MIT.)
 */

export type Pt = [number, number];

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function resample(P: Pt[], closed: boolean, step: number): Pt[] {
  const out: Pt[] = [];
  const n = P.length;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = P[i];
    const b = P[(i + 1) % n];
    const k = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  if (!closed) out.push(P[n - 1]);
  return out;
}

/** Wobble a path along its normals, differently for each seed (pass the boil step to make it shimmer). */
export function wobble(P: Pt[], closed: boolean, amt: number, seed: number, step = 6): Pt[] {
  const Q = resample(P, closed, step);
  const n = Q.length;
  const R = rng(seed * 7919 + 13);
  const f1 = 0.012 + R() * 0.018;
  const f2 = 0.05 + R() * 0.05;
  const p1 = R() * 6.283;
  const p2 = R() * 6.283;
  const out: Pt[] = new Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const nx = a[1] - b[1];
    const ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    if (i) s += dist(Q[i - 1], Q[i]);
    const o = amt * (0.75 * Math.sin(s * f1 + p1) + 0.35 * Math.sin(s * f2 + p2));
    out[i] = [Q[i][0] + (nx / l) * o, Q[i][1] + (ny / l) * o];
  }
  return out;
}

/** A smoothed closed shape through points (quadratic curves through the midpoints). */
export function curvy(P: Pt[], path = new Path2D()): Path2D {
  const n = P.length;
  path.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = P[i];
    const q = P[(i + 1) % n];
    path.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  path.closePath();
  return path;
}

/** A hand-drawn outline of an ellipse: never quite round. */
export function handEllipse(cx: number, cy: number, rx: number, ry: number, seed: number, amt = 1.5, rot = 0): Pt[] {
  const k = Math.max(18, Math.round((rx + ry) / 4));
  const R = rng(seed);
  const pts: Pt[] = [];
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2;
    const j = 1 + (R() - 0.5) * 0.06;
    const x = Math.cos(a) * rx * j;
    const y = Math.sin(a) * ry * j;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return wobble(pts, true, amt, seed, 5);
}

export interface RibbonOpts {
  w?: number;
  /** Fraction of the length over which each end tapers to a point. */
  taper?: number;
  /** Pressure variation, 0.15 a brush, 0.5 a dry brush. */
  rough?: number;
  closed?: boolean;
  /** Wobble amount; 0 for none. */
  amt?: number;
  seed?: number;
}

/** A brush line: a tapered ribbon with pressure, wobbled. */
export function ribbon(P: Pt[], o: RibbonOpts = {}, path = new Path2D()): Path2D {
  const closed = !!o.closed;
  const seed = o.seed ?? 1;
  const Q = o.amt === 0 ? resample(P, closed, 5) : wobble(P, closed, o.amt ?? 1.2, seed, 5);
  const n = Q.length;
  if (n < 2) return path;
  let total = 0;
  for (let i = 1; i < n; i++) total += dist(Q[i - 1], Q[i]);
  const R = rng(seed * 31 + 7);
  const f1 = 0.02 + R() * 0.03;
  const f2 = 0.12 + R() * 0.18;
  const p1 = R() * 6.283;
  const p2 = R() * 6.283;
  const rough = o.rough ?? 0.15;
  const w = o.w ?? 3;
  const L: Pt[] = [];
  const Rt: Pt[] = [];
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const c = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let nx = a[1] - c[1];
    let ny = c[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    if (i) s += dist(Q[i - 1], Q[i]);
    const t = s / (total || 1);
    const tp = o.taper ? Math.pow(Math.max(0, Math.min(1, t / o.taper, (1 - t) / o.taper)), 0.7) : 1;
    const hw = Math.max(0, (w / 2) * tp * (1 + rough * (0.6 * Math.sin(s * f1 + p1) + 0.4 * Math.sin(s * f2 + p2))));
    L.push([Q[i][0] + nx * hw, Q[i][1] + ny * hw]);
    Rt.push([Q[i][0] - nx * hw, Q[i][1] - ny * hw]);
  }
  const outline = closed ? L : [...L, ...Rt.reverse()];
  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) path.lineTo(outline[i][0], outline[i][1]);
  path.closePath();
  if (closed) {
    const inner = Rt;
    path.moveTo(inner[0][0], inner[0][1]);
    for (let i = inner.length - 1; i >= 0; i--) path.lineTo(inner[i][0], inner[i][1]);
    path.closePath();
  }
  return path;
}

/**
 * A leaf-shaped brush dab: pointed at both ends, slightly bent, the way a loaded brush
 * leaves a short stroke. Texture fields are made of thousands of these.
 */
export function dab(path: Path2D, x: number, y: number, angle: number, len: number, w: number, bend = 0) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const hx = (c * len) / 2;
  const hy = (s * len) / 2;
  const nx = -s;
  const ny = c;
  const bx = x + nx * bend;
  const by = y + ny * bend;
  path.moveTo(x - hx, y - hy);
  path.quadraticCurveTo(bx + nx * w, by + ny * w, x + hx, y + hy);
  path.quadraticCurveTo(bx - nx * w, by - ny * w, x - hx, y - hy);
  path.closePath();
}

/** Points on a jittered grid inside a region, made once per size. r is fixed per point. */
export interface Seed {
  x: number;
  y: number;
  r: number;
}
export function scatter(w: number, h: number, spacing: number, inside: (x: number, y: number) => boolean, seed = 1): Seed[] {
  const R = rng(seed);
  const pts: Seed[] = [];
  for (let y = -spacing; y < h + spacing; y += spacing) {
    for (let x = -spacing; x < w + spacing; x += spacing) {
      const px = x + (R() - 0.5) * spacing * 0.95;
      const py = y + (R() - 0.5) * spacing * 0.95;
      if (inside(px, py)) pts.push({ x: px, y: py, r: R() });
    }
  }
  return pts;
}

/** A soft, irregular vignette for the press: the print fades out in dots toward a wobbly edge. */
export function softEdge(g: CanvasRenderingContext2D, w: number, h: number, seed: number, inset = 0.06) {
  // Paint white (keep) in the middle, fading to black (no ink) at an irregular edge.
  const R = rng(seed);
  const k = 40;
  const pts: Pt[] = [];
  // A superellipse: nearly rectangular, with soft rounded corners and a wandering edge.
  const sp = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 0.55);
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2;
    const j = 1 - inset - R() * 0.1 - Math.sin(i * 0.9) * 0.025;
    pts.push([w / 2 + (sp(Math.cos(a)) * w * j) / 2, h / 2 + (sp(Math.sin(a)) * h * j) / 2]);
  }
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  // Blur the edge by layering progressively larger, fainter shapes.
  for (let i = 6; i >= 0; i--) {
    const grow = 1 + i * 0.05;
    const ps = pts.map(([x, y]) => [w / 2 + (x - w / 2) * grow, h / 2 + (y - h / 2) * grow] as Pt);
    const v = Math.round(255 * (1 - i / 7));
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fill(curvy(ps));
  }
}
