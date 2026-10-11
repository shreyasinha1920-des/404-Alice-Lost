import { Press, INKS_FALL } from './press';

/**
 * Things that leap out of the book. A printed sprite (a leaf, a key, a jar) leaves the
 * page and carries on across the room, over everything, before it fades. Sprites are
 * printed once by a small offscreen press, so they keep the riso dots and inks.
 */

interface Sprite {
  img: HTMLCanvasElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  rot: number;
  vr: number;
  s: number;
  vs: number;
  alpha: number;
  fade: number;
  drag: number;
  /** Sideways flutter, for leaves and petals. */
  flutter: number;
  age: number;
}

const STAMP_SIZE = 120;
let stampPress: Press | null = null;
const stamps = new Map<string, HTMLCanvasElement>();

/**
 * Print a small sprite once and keep it. draw() draws into a STAMP_SIZE square, centred.
 * `pitch` is the halftone cell size; finer for sprites with thin lines.
 */
export function stamp(key: string, draw: (p: Press, size: number) => void, pitch = 3.4): HTMLCanvasElement | null {
  const hit = stamps.get(key);
  if (hit) return hit;
  // If the browser dropped our context (too many alive at once), print on a fresh press.
  if (stampPress && !stampPress.ok) stampPress = null;
  if (!stampPress) {
    stampPress = new Press(INKS_FALL);
    stampPress.pitch = 3.4;
    stampPress.resize(STAMP_SIZE, STAMP_SIZE, 2);
  }
  if (!stampPress.ok) return null;
  stampPress.pitch = pitch;
  stampPress.begin();
  draw(stampPress, STAMP_SIZE);
  stampPress.print(0);
  const cv = document.createElement('canvas');
  cv.width = cv.height = STAMP_SIZE * 2;
  cv.getContext('2d')!.drawImage(stampPress.canvas, 0, 0);
  stamps.set(key, cv);
  return cv;
}

class Escape {
  private canvas: HTMLCanvasElement | null = null;
  private g: CanvasRenderingContext2D | null = null;
  private sprites: Sprite[] = [];
  private raf = 0;
  private last = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');

  private ensure() {
    if (this.canvas) return;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'escape';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.append(this.canvas);
    this.g = this.canvas.getContext('2d')!;
    const fit = () => {
      const d = Math.min(devicePixelRatio || 1, 1.5);
      this.canvas!.width = Math.round(innerWidth * d);
      this.canvas!.height = Math.round(innerHeight * d);
      this.g!.setTransform(d, 0, 0, d, 0, 0);
    };
    fit();
    addEventListener('resize', fit);
  }

  /**
   * Send a sprite out of the book from viewport point (x, y).
   * size is its on-screen width in px; the rest is optional motion.
   */
  launch(
    img: HTMLCanvasElement | null,
    x: number,
    y: number,
    o: Partial<Pick<Sprite, 'vx' | 'vy' | 'ax' | 'ay' | 'vr' | 'vs' | 'fade' | 'drag' | 'flutter' | 'rot'>> & { size: number },
  ) {
    if (!img || document.hidden) return;
    this.ensure();
    if (this.reduced.matches) {
      // Reduced motion: no flight. The sprite appears a little way along its path and fades.
      x += (o.vx ?? 0) * 0.2;
      y += (o.vy ?? 0) * 0.2;
      o = { size: o.size, rot: o.rot, fade: 0.7 };
    }
    if (this.sprites.length > 60) this.sprites.shift();
    this.sprites.push({
      img,
      x,
      y,
      vx: o.vx ?? 0,
      vy: o.vy ?? 0,
      ax: o.ax ?? 0,
      ay: o.ay ?? 0,
      rot: o.rot ?? Math.random() * 6.28,
      vr: o.vr ?? 0,
      s: o.size / (img.width / 2),
      vs: o.vs ?? 0,
      alpha: 1,
      fade: o.fade ?? 0.35,
      drag: o.drag ?? 0.6,
      flutter: o.flutter ?? 0,
      age: 0,
    });
    if (!this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  /** Clear everything (when the page turns away). */
  clear() {
    this.sprites = [];
  }

  private tick = (now: number) => {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    const g = this.g!;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of this.sprites) {
      s.age += dt;
      s.vx += (s.ax + Math.sin(s.age * 3.1 + s.rot) * s.flutter) * dt;
      s.vy += s.ay * dt;
      const d = Math.pow(s.drag, dt);
      s.vx *= d;
      s.vy *= d;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      s.s = Math.max(0.01, s.s + s.vs * dt);
      s.alpha -= s.fade * dt;
      if (s.alpha <= 0) continue;
      const w = s.img.width / 2;
      g.save();
      g.globalAlpha = Math.min(1, s.alpha);
      g.translate(s.x, s.y);
      g.rotate(s.rot);
      g.scale(s.s, s.s);
      g.drawImage(s.img, -w / 2, -w / 2, w, w);
      g.restore();
    }
    this.sprites = this.sprites.filter((s) => s.alpha > 0 && s.y < innerHeight + 200 && s.y > -300 && s.x > -300 && s.x < innerWidth + 300);
    this.raf = this.sprites.length ? requestAnimationFrame(this.tick) : 0;
    if (!this.raf) g.clearRect(0, 0, innerWidth, innerHeight);
  };
}

export const escape = new Escape();
