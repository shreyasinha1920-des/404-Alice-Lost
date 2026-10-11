import { type Scene, type Pointer, stir, wrap, rand, damp, density, LINE } from './types';

/** Fog is drawn small and scaled up: cheaper, and the upscale softens it for free. */
const FOG_SCALE = 1 / 6;

interface Blob {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  drift: number;
  phase: number;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  fall: number;
  phase: number;
}

/** Act 1, The Fall: fog that parts around the cursor, dust drifting down the well. */
export class FallScene implements Scene {
  private w = 0;
  private h = 0;
  private blobs: Blob[] = [];
  private motes: Mote[] = [];
  private fog = document.createElement('canvas');
  private fctx = this.fog.getContext('2d')!;
  /** The clearing in the fog eases after the cursor rather than snapping to it. */
  private hole = { x: 0, y: 0, r: 0 };

  resize(w: number, h: number) {
    const first = this.w === 0;
    this.w = w;
    this.h = h;
    this.fog.width = Math.ceil(w * FOG_SCALE);
    this.fog.height = Math.ceil(h * FOG_SCALE);
    if (!first) return;

    const k = density(w, h);
    const span = Math.max(w, h);
    this.blobs = Array.from({ length: 9 }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.18, 0.34) * span,
      vx: rand(-6, 6),
      vy: rand(-3, 3),
      drift: rand(4, 10),
      phase: rand(0, Math.PI * 2),
    }));
    this.motes = Array.from({ length: Math.round(70 * k) }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: 0,
      vy: 0,
      size: rand(0.6, 1.9),
      fall: rand(8, 26),
      phase: rand(0, Math.PI * 2),
    }));
    this.hole = { x: w / 2, y: h / 2, r: 0 };
  }

  update(dt: number, t: number, p: Pointer) {
    for (const b of this.blobs) {
      stir(b, p, b.r * 0.8, 40, dt);
      b.vx = (b.vx + Math.cos(t * 0.05 + b.phase) * b.drift * dt) * damp(0.7, dt);
      b.vy = (b.vy + Math.sin(t * 0.04 + b.phase) * b.drift * 0.5 * dt) * damp(0.7, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      wrap(b, this.w, this.h, b.r);
    }

    const speed = Math.hypot(p.vx, p.vy);
    const targetR = p.active ? Math.min(260, 150 + speed * 0.08) : 0;
    const ease = 1 - Math.pow(0.02, dt);
    this.hole.x += (p.x - this.hole.x) * ease;
    this.hole.y += (p.y - this.hole.y) * ease;
    this.hole.r += (targetR - this.hole.r) * (1 - Math.pow(0.1, dt));

    for (const m of this.motes) {
      stir(m, p, 140, 260, dt);
      m.vx *= damp(0.25, dt);
      m.vy *= damp(0.25, dt);
      m.x += (m.vx + Math.sin(t * 0.6 + m.phase) * 6) * dt;
      m.y += (m.vy + m.fall) * dt;
      wrap(m, this.w, this.h, 10);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const f = this.fctx;
    const s = FOG_SCALE;
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, this.fog.width, this.fog.height);
    for (const b of this.blobs) {
      const g = f.createRadialGradient(b.x * s, b.y * s, 0, b.x * s, b.y * s, b.r * s);
      g.addColorStop(0, 'rgba(214, 192, 152, 0.13)');
      g.addColorStop(0.6, 'rgba(214, 192, 152, 0.05)');
      g.addColorStop(1, 'rgba(214, 192, 152, 0)');
      f.fillStyle = g;
      f.fillRect(0, 0, this.fog.width, this.fog.height);
    }
    if (this.hole.r > 1) {
      const { x, y, r } = this.hole;
      const g = f.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      f.globalCompositeOperation = 'destination-out';
      f.fillStyle = g;
      f.fillRect(0, 0, this.fog.width, this.fog.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fog, 0, 0, this.w, this.h);

    for (const m of this.motes) {
      ctx.fillStyle = LINE(0.22 + 0.18 * Math.sin(m.phase + m.y * 0.02));
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  gust(dir: 1 | -1) {
    for (const b of this.blobs) b.vx -= dir * rand(30, 60);
    for (const m of this.motes) {
      m.vx -= dir * rand(60, 160);
      m.vy -= rand(10, 40);
    }
  }
}
