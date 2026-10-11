import { type Scene, type Pointer, stir, wrap, rand, damp, density, LINE } from './types';

type Kind = 'bottle' | 'cake' | 'key' | 'cup' | 'watch';

interface Thing {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  base: number;
  scale: number;
  vs: number;
  /** DRINK ME things shrink as you approach; EAT ME things grow. */
  grows: boolean;
  phase: number;
}

const KINDS: Kind[] = ['bottle', 'cake', 'key', 'cup', 'watch'];

/** Act 2, Wrong Sizes: bottles, cakes, keys and teacups that swell or shrink near the cursor. */
export class SizesScene implements Scene {
  private w = 0;
  private h = 0;
  private things: Thing[] = [];

  resize(w: number, h: number) {
    const first = this.w === 0;
    this.w = w;
    this.h = h;
    if (!first) return;
    const count = Math.max(9, Math.round(20 * density(w, h)));
    this.things = Array.from({ length: count }, (_, i) => {
      const kind = KINDS[i % KINDS.length];
      const base = rand(1.1, 2.1);
      return {
        kind,
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-8, 8),
        vy: rand(-6, 6),
        rot: rand(-0.6, 0.6),
        vr: rand(-0.08, 0.08),
        base,
        scale: base,
        vs: 0,
        grows: kind === 'cake' ? true : kind === 'bottle' ? false : Math.random() < 0.5,
        phase: rand(0, Math.PI * 2),
      };
    });
  }

  update(dt: number, t: number, p: Pointer) {
    for (const th of this.things) {
      const near = stir(th, p, 260, 50, dt);
      const target = th.base * (th.grows ? 1 + near * 1.6 : 1 - near * 0.6);
      // A spring with a little overshoot, so sizes wobble into place.
      th.vs += (target - th.scale) * 60 * dt;
      th.vs *= damp(0.02, dt);
      th.scale += th.vs * dt;

      th.vx = th.vx * damp(0.6, dt) + Math.cos(t * 0.3 + th.phase) * 3 * dt;
      th.vy = th.vy * damp(0.6, dt) + Math.sin(t * 0.25 + th.phase) * 3 * dt;
      th.vr *= damp(0.5, dt);
      th.x += th.vx * dt;
      th.y += (th.vy + Math.sin(t * 0.8 + th.phase) * 4) * dt;
      th.rot += th.vr * dt + Math.sin(t * 0.5 + th.phase) * 0.05 * dt;
      wrap(th, this.w, this.h, 80);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const th of this.things) {
      ctx.save();
      ctx.translate(th.x, th.y);
      ctx.rotate(th.rot);
      ctx.scale(th.scale, th.scale);
      ctx.lineWidth = 1.4 / th.scale;
      ctx.strokeStyle = LINE(0.2);
      ctx.fillStyle = LINE(0.04);
      DRAW[th.kind](ctx);
      ctx.restore();
    }
  }

  gust(dir: 1 | -1) {
    for (const th of this.things) {
      th.vx -= dir * rand(50, 120);
      th.vr -= dir * rand(0.4, 1.2);
    }
  }
}

/** Little engraved silhouettes, each about 50px tall at scale 1, centred on the origin. */
const DRAW: Record<Kind, (c: CanvasRenderingContext2D) => void> = {
  bottle(c) {
    c.beginPath();
    c.moveTo(-5, -26);
    c.lineTo(5, -26);
    c.lineTo(5, -14);
    c.quadraticCurveTo(15, -10, 15, 0);
    c.lineTo(15, 20);
    c.quadraticCurveTo(15, 25, 10, 25);
    c.lineTo(-10, 25);
    c.quadraticCurveTo(-15, 25, -15, 20);
    c.lineTo(-15, 0);
    c.quadraticCurveTo(-15, -10, -5, -14);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeRect(-10, 2, 20, 11); // the paper label
    c.beginPath();
    c.moveTo(-6, -28);
    c.lineTo(6, -28);
    c.stroke();
  },
  cake(c) {
    c.beginPath();
    c.ellipse(0, -6, 20, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(-20, -6);
    c.lineTo(-20, 12);
    c.ellipse(0, 12, 20, 6, 0, Math.PI, 0, true);
    c.lineTo(20, -6);
    c.stroke();
    c.beginPath(); // currants on the top
    for (const [x, y] of [[-8, -7], [3, -4], [10, -8], [-2, -9]]) {
      c.moveTo(x + 1.2, y);
      c.arc(x, y, 1.2, 0, Math.PI * 2);
    }
    c.stroke();
  },
  key(c) {
    c.beginPath();
    c.arc(0, -16, 8, 0, Math.PI * 2);
    c.moveTo(0, -8);
    c.lineTo(0, 24);
    c.moveTo(0, 16);
    c.lineTo(7, 16);
    c.moveTo(0, 22);
    c.lineTo(9, 22);
    c.stroke();
    c.beginPath();
    c.arc(0, -16, 3, 0, Math.PI * 2);
    c.stroke();
  },
  cup(c) {
    c.beginPath();
    c.moveTo(-16, -8);
    c.lineTo(16, -8);
    c.quadraticCurveTo(14, 12, 0, 12);
    c.quadraticCurveTo(-14, 12, -16, -8);
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(18, -1, 5, -Math.PI / 2, Math.PI / 2);
    c.stroke();
    c.beginPath();
    c.ellipse(0, 15, 22, 4, 0, 0, Math.PI * 2);
    c.stroke();
  },
  watch(c) {
    c.beginPath();
    c.arc(0, 2, 17, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(0, -19, 3, 0, Math.PI * 2);
    c.moveTo(0, -16);
    c.lineTo(0, -15);
    // Hands at 4:04, of course.
    c.moveTo(0, 2);
    c.lineTo(Math.sin((4 / 12) * Math.PI * 2) * 8, 2 - Math.cos((4 / 12) * Math.PI * 2) * 8);
    c.moveTo(0, 2);
    c.lineTo(Math.sin((4 / 60) * Math.PI * 2) * 13, 2 - Math.cos((4 / 60) * Math.PI * 2) * 13);
    c.stroke();
  },
};
