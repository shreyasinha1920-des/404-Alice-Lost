import { type Scene, type Pointer, stir, wrap, rand, damp, density, LINE } from './types';

interface Branch {
  len: number;
  /** Rest angle relative to the parent, radians. */
  angle: number;
  width: number;
  depth: number;
  children: Branch[];
}

interface Tree {
  x: number;
  y: number;
  /** Direction the trunk grows, radians (0 = right, -PI/2 = up). */
  heading: number;
  root: Branch;
  /** Current lean, eased toward the cursor and kicked by gusts. */
  lean: number;
  leanV: number;
  phase: number;
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  phase: number;
}

const MAX_DEPTH = 6;

function grow(len: number, width: number, depth: number): Branch {
  const children: Branch[] = [];
  if (depth < MAX_DEPTH) {
    const n = depth < 2 ? 2 : Math.random() < 0.7 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const spread = rand(0.25, 0.6) * (i % 2 ? 1 : -1);
      children.push(grow(len * rand(0.66, 0.8), width * 0.68, depth + 1));
      children[i].angle = spread;
    }
  }
  return { len, angle: 0, width, depth, children };
}

/** Act 3, The Woods: branches reaching in from the edges, leaning toward the cursor, leaves drifting down. */
export class WoodsScene implements Scene {
  private w = 0;
  private h = 0;
  private trees: Tree[] = [];
  private leaves: Leaf[] = [];
  private t = 0;

  resize(w: number, h: number) {
    const first = this.w === 0;
    const sx = first ? 1 : w / this.w;
    const sy = first ? 1 : h / this.h;
    this.w = w;
    this.h = h;
    if (!first) {
      for (const tree of this.trees) {
        tree.x *= sx;
        tree.y *= sy;
      }
      return;
    }

    const size = Math.min(w, h);
    const tree = (x: number, y: number, heading: number, scale: number): Tree => ({
      x,
      y,
      heading,
      root: grow(size * 0.17 * scale, 9 * scale, 0),
      lean: 0,
      leanV: 0,
      phase: rand(0, Math.PI * 2),
    });
    this.trees = [
      tree(-10, h * 0.98, -Math.PI / 2 + 0.35, 1.15),
      tree(w + 10, h * 0.95, -Math.PI / 2 - 0.4, 1.05),
      tree(-10, h * 0.25, -0.15, 0.8),
      tree(w + 10, h * 0.3, Math.PI + 0.2, 0.75),
    ];
    this.leaves = Array.from({ length: Math.round(34 * density(w, h)) }, () => this.newLeaf(rand(0, h)));
  }

  private newLeaf(y: number): Leaf {
    return {
      x: rand(0, this.w),
      y,
      vx: 0,
      vy: 0,
      rot: rand(0, Math.PI * 2),
      vr: rand(-1, 1),
      size: rand(5, 10),
      phase: rand(0, Math.PI * 2),
    };
  }

  update(dt: number, t: number, p: Pointer) {
    this.t = t;
    for (const tree of this.trees) {
      // Lean toward the cursor, more when it is close, like wind coming from it.
      let target = 0;
      if (p.active) {
        const dx = p.x - tree.x;
        const dist = Math.hypot(dx, p.y - tree.y);
        target = Math.sign(dx) * Math.max(0, 1 - dist / (this.w * 0.75)) * 0.09;
        target += (p.vx / 3000) * Math.max(0, 1 - dist / this.w);
      }
      tree.leanV += (target - tree.lean) * 9 * dt;
      tree.leanV *= damp(0.08, dt);
      tree.lean += tree.leanV * dt;
    }

    for (const leaf of this.leaves) {
      stir(leaf, p, 170, 220, dt);
      if (Math.hypot(leaf.vx, leaf.vy) > 40) leaf.vr += (Math.random() - 0.5) * 6 * dt;
      leaf.vx *= damp(0.3, dt);
      leaf.vy *= damp(0.3, dt);
      leaf.x += (leaf.vx + Math.sin(t * 1.1 + leaf.phase) * 18) * dt;
      leaf.y += (leaf.vy + 16 + Math.cos(t * 1.3 + leaf.phase) * 6) * dt;
      leaf.rot += (leaf.vr + Math.sin(t * 1.5 + leaf.phase) * 0.8) * dt;
      if (leaf.y > this.h + 20) Object.assign(leaf, this.newLeaf(-20));
      wrap(leaf, this.w, this.h, 20);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = LINE(0.12);
    for (const tree of this.trees) {
      this.drawBranch(ctx, tree, tree.root, tree.x, tree.y, tree.heading);
    }
    for (const leaf of this.leaves) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rot);
      ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(leaf.rot * 1.3)));
      ctx.beginPath();
      ctx.moveTo(-leaf.size, 0);
      ctx.quadraticCurveTo(0, -leaf.size * 0.7, leaf.size, 0);
      ctx.quadraticCurveTo(0, leaf.size * 0.7, -leaf.size, 0);
      ctx.fillStyle = 'rgba(196, 160, 96, 0.2)';
      ctx.fill();
      ctx.strokeStyle = LINE(0.16);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawBranch(ctx: CanvasRenderingContext2D, tree: Tree, b: Branch, x: number, y: number, angle: number) {
    // Thin, high branches move more than the trunk.
    const sway = Math.sin(this.t * 0.7 + tree.phase + b.depth * 0.6) * 0.012 * b.depth;
    const a = angle + b.angle + tree.lean * (b.depth + 1) * 0.5 + sway;
    const x2 = x + Math.cos(a) * b.len;
    const y2 = y + Math.sin(a) * b.len;
    ctx.lineWidth = Math.max(0.6, b.width);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    for (const child of b.children) this.drawBranch(ctx, tree, child, x2, y2, a);
  }

  gust(dir: 1 | -1) {
    for (const tree of this.trees) tree.leanV -= dir * rand(0.25, 0.4);
    for (const leaf of this.leaves) {
      leaf.vx -= dir * rand(80, 200);
      leaf.vy -= rand(20, 60);
      leaf.vr += rand(-3, 3);
    }
  }
}
