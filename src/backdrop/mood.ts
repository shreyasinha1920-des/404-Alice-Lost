import { type Scene, type Pointer, rand, damp, density } from './types';

/** The White Rabbit's room: faint cobalt strokes circling, drawn toward the cursor. */
export class SwirlScene implements Scene {
  private w = 0;
  private h = 0;
  private pts: { x: number; y: number; r: number }[] = [];
  private cx = 0;
  private cy = 0;
  private t = 0;
  private kick = 0;

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cx = w / 2;
    this.cy = h / 2;
    const n = Math.round(900 * density(w, h));
    this.pts = Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0, 1) }));
  }

  update(dt: number, t: number, p: Pointer) {
    this.t = t;
    const tx = p.active ? p.x : this.w / 2;
    const ty = p.active ? p.y : this.h / 2;
    this.cx += (tx - this.cx) * (1 - damp(0.2, dt));
    this.cy += (ty - this.cy) * (1 - damp(0.2, dt));
    this.kick *= damp(0.3, dt);
  }

  draw(c: CanvasRenderingContext2D) {
    for (const [color, filter, width] of [
      ['rgba(70, 100, 230, 0.32)', (r: number) => r < 0.6, 1.4],
      ['rgba(170, 190, 255, 0.22)', (r: number) => r >= 0.85, 1],
    ] as const) {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = 'round';
      c.beginPath();
      for (const q of this.pts) {
        if (!filter(q.r)) continue;
        const d = Math.hypot(q.x - this.cx, q.y - this.cy);
        const a = Math.atan2(q.y - this.cy, q.x - this.cx) + Math.PI / 2 + 0.25 + Math.sin(this.t * 0.15 + d * 0.006) * 0.3 + this.kick;
        const len = 10 + q.r * 14;
        c.moveTo(q.x - (Math.cos(a) * len) / 2, q.y - (Math.sin(a) * len) / 2);
        c.lineTo(q.x + (Math.cos(a) * len) / 2, q.y + (Math.sin(a) * len) / 2);
      }
      c.stroke();
    }
  }

  gust(dir: 1 | -1) {
    this.kick += dir * 0.9;
  }
}

/** The hall's room: warm dust turning in lantern light that follows the cursor. */
export class LanternScene implements Scene {
  private w = 0;
  private h = 0;
  private motes: { x: number; y: number; vx: number; vy: number; s: number; ph: number }[] = [];
  private lx = 0;
  private ly = 0;
  private t = 0;

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.lx = w / 2;
    this.ly = h / 2;
    const n = Math.round(110 * density(w, h));
    this.motes = Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), vx: 0, vy: 0, s: rand(0.6, 2.2), ph: rand(0, 6) }));
  }

  update(dt: number, t: number, p: Pointer) {
    this.t = t;
    const tx = p.active ? p.x : this.w * 0.5;
    const ty = p.active ? p.y : this.h * 0.5;
    this.lx += (tx - this.lx) * (1 - damp(0.05, dt));
    this.ly += (ty - this.ly) * (1 - damp(0.05, dt));
    for (const m of this.motes) {
      m.vx = (m.vx + Math.sin(t * 0.4 + m.ph) * 4 * dt) * damp(0.5, dt);
      m.vy = (m.vy - 3 * dt + Math.cos(t * 0.3 + m.ph) * 3 * dt) * damp(0.5, dt);
      m.x += m.vx * dt * 10;
      m.y += m.vy * dt * 10;
      if (m.y < -10) m.y = this.h + 10;
      if (m.x < -10) m.x = this.w + 10;
      if (m.x > this.w + 10) m.x = -10;
    }
  }

  draw(c: CanvasRenderingContext2D) {
    const r = Math.min(this.w, this.h) * 0.45;
    const g = c.createRadialGradient(this.lx, this.ly, 0, this.lx, this.ly, r);
    g.addColorStop(0, 'rgba(255, 184, 90, 0.16)');
    g.addColorStop(1, 'rgba(255, 184, 90, 0)');
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);
    for (const m of this.motes) {
      const near = Math.max(0, 1 - Math.hypot(m.x - this.lx, m.y - this.ly) / r);
      const a = 0.12 + near * 0.7 * (0.6 + 0.4 * Math.sin(this.t * 2 + m.ph));
      c.fillStyle = `rgba(255, 214, 140, ${a.toFixed(3)})`;
      c.beginPath();
      c.arc(m.x, m.y, m.s * (1 + near), 0, Math.PI * 2);
      c.fill();
    }
  }

  gust(dir: 1 | -1) {
    for (const m of this.motes) m.vx -= dir * rand(2, 6);
  }
}
