import { type Scene, type Pointer, stir, wrap, rand, damp, density, LINE } from './types';

const SUITS = ['♥', '♠', '♦', '♣'];

interface Card {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  /** Rotation about the card's vertical axis, so it flips as it tumbles. */
  flip: number;
  vf: number;
  suit: string;
  phase: number;
}

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  phase: number;
}

/** Act 4, The Court: playing cards and rose petals drifting through the air, scattered by the cursor. */
export class CourtScene implements Scene {
  private w = 0;
  private h = 0;
  private cards: Card[] = [];
  private petals: Petal[] = [];

  resize(w: number, h: number) {
    const first = this.w === 0;
    this.w = w;
    this.h = h;
    if (!first) return;
    const k = density(w, h);
    this.cards = Array.from({ length: Math.max(6, Math.round(14 * k)) }, (_, i) => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: 0,
      vy: 0,
      rot: rand(-0.5, 0.5),
      vr: rand(-0.2, 0.2),
      flip: rand(0, Math.PI * 2),
      vf: rand(0.3, 0.9),
      suit: SUITS[i % SUITS.length],
      phase: rand(0, Math.PI * 2),
    }));
    this.petals = Array.from({ length: Math.round(36 * k) }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: 0,
      vy: 0,
      rot: rand(0, Math.PI * 2),
      vr: rand(-1.5, 1.5),
      size: rand(3, 6),
      phase: rand(0, Math.PI * 2),
    }));
  }

  update(dt: number, t: number, p: Pointer) {
    for (const c of this.cards) {
      const hit = stir(c, p, 200, 420, dt);
      // Scattered cards spin; calm ones settle back to a slow tumble.
      c.vr += (Math.random() - 0.5) * hit * 10 * dt;
      c.vf += hit * 6 * dt;
      c.vx *= damp(0.35, dt);
      c.vy *= damp(0.35, dt);
      c.vr *= damp(0.4, dt);
      c.vf += (0.6 - c.vf) * 0.5 * dt;
      c.x += (c.vx + Math.sin(t * 0.4 + c.phase) * 10) * dt;
      c.y += (c.vy + 9) * dt;
      c.rot += c.vr * dt;
      c.flip += c.vf * dt;
      wrap(c, this.w, this.h, 50);
    }
    for (const pe of this.petals) {
      stir(pe, p, 150, 300, dt);
      pe.vx *= damp(0.3, dt);
      pe.vy *= damp(0.3, dt);
      pe.x += (pe.vx + Math.sin(t * 1.4 + pe.phase) * 14) * dt;
      pe.y += (pe.vy + 20) * dt;
      pe.rot += pe.vr * dt;
      wrap(pe, this.w, this.h, 20);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '15px Georgia, serif';
    for (const c of this.cards) {
      const face = Math.cos(c.flip);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.scale(Math.max(0.06, Math.abs(face)), 1);
      ctx.beginPath();
      ctx.roundRect(-15, -21, 30, 42, 3);
      ctx.fillStyle = LINE(face > 0 ? 0.1 : 0.05);
      ctx.fill();
      ctx.strokeStyle = LINE(0.24);
      ctx.lineWidth = 1;
      ctx.stroke();
      if (face > 0) {
        const red = c.suit === '♥' || c.suit === '♦';
        ctx.fillStyle = red ? 'rgba(214, 92, 90, 0.55)' : LINE(0.4);
        ctx.fillText(c.suit, 0, 1);
      } else {
        ctx.strokeStyle = LINE(0.12);
        ctx.strokeRect(-10, -16, 20, 32);
      }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(190, 58, 58, 0.42)';
    for (const pe of this.petals) {
      ctx.save();
      ctx.translate(pe.x, pe.y);
      ctx.rotate(pe.rot);
      ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(pe.rot)));
      ctx.beginPath();
      ctx.ellipse(0, 0, pe.size, pe.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  gust(dir: 1 | -1) {
    for (const c of this.cards) {
      c.vx -= dir * rand(80, 180);
      c.vy -= rand(30, 90);
      c.vr += rand(-2, 2);
      c.vf += rand(2, 5);
    }
    for (const pe of this.petals) {
      pe.vx -= dir * rand(100, 220);
      pe.vy -= rand(20, 80);
    }
  }
}
