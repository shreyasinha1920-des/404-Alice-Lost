export interface Pointer {
  x: number;
  y: number;
  /** Smoothed pointer velocity in px/s. */
  vx: number;
  vy: number;
  /** False until the visitor moves, and after the pointer leaves the window. */
  active: boolean;
}

/** One act's living background. Coordinates are CSS pixels. */
export interface Scene {
  resize(w: number, h: number): void;
  /** dt in seconds, t in seconds since the scene started. */
  update(dt: number, t: number, pointer: Pointer): void;
  draw(ctx: CanvasRenderingContext2D): void;
  /** A page turned: push everything in the turn's direction. */
  gust(dir: 1 | -1): void;
}

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Push a body away from the pointer, and drag it a little along the pointer's motion,
 * so a quick sweep stirs things rather than just repelling them.
 */
export function stir(b: Body, p: Pointer, radius: number, strength: number, dt: number) {
  if (!p.active) return 0;
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const d2 = dx * dx + dy * dy;
  if (d2 > radius * radius) return 0;
  const d = Math.sqrt(d2) || 1;
  const falloff = 1 - d / radius;
  const push = strength * falloff * falloff;
  b.vx += (dx / d) * push * dt + p.vx * 0.9 * falloff * dt;
  b.vy += (dy / d) * push * dt + p.vy * 0.9 * falloff * dt;
  return falloff;
}

/** Keep a body inside the canvas by wrapping it to the other side. */
export function wrap(b: Body, w: number, h: number, margin: number) {
  if (b.x < -margin) b.x = w + margin;
  else if (b.x > w + margin) b.x = -margin;
  if (b.y < -margin) b.y = h + margin;
  else if (b.y > h + margin) b.y = -margin;
}

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Frame-rate independent damping: keep `perSecond` of the velocity each second. */
export const damp = (perSecond: number, dt: number) => Math.pow(perSecond, dt);

/** Fewer things on small or modest devices. */
export function density(w: number, h: number) {
  const area = Math.min(1, (w * h) / (1440 * 900));
  const cores = navigator.hardwareConcurrency || 4;
  return Math.max(0.35, area) * (cores <= 4 ? 0.6 : 1);
}

/** Pale ink on the dark room: the colour everything in the backdrop is drawn with. */
export const LINE = (a: number) => `rgba(232, 214, 176, ${a})`;
