import { ACT_KEY, type Act } from '../story';
import type { Pointer, Scene } from './types';
import { FallScene } from './fall';
import { SizesScene } from './sizes';
import { WoodsScene } from './woods';
import { CourtScene } from './court';
import { SwirlScene, LanternScene } from './mood';

type Kind = 'fall' | 'sizes' | 'woods' | 'court' | 'swirl' | 'lantern';

const SCENES: Record<Kind, () => Scene> = {
  fall: () => new FallScene(),
  sizes: () => new SizesScene(),
  woods: () => new WoodsScene(),
  court: () => new CourtScene(),
  swirl: () => new SwirlScene(),
  lantern: () => new LanternScene(),
};

/** Each act's default room. */
const ACT_ROOM: Record<Act, { kind: Kind; room: string; warm: string }> = {
  'The Fall': { kind: 'fall', room: '#17110c', warm: '#2c2117' },
  'Wrong Sizes': { kind: 'sizes', room: '#161112', warm: '#2b1d22' },
  'The Woods': { kind: 'woods', room: '#0f140f', warm: '#1c2619' },
  'The Court and Home': { kind: 'court', room: '#190d0e', warm: '#2f1517' },
};

/** Pages whose room is tuned to the open spread: its colours, and a scene that echoes it. */
const PAGE_ROOM: Record<number, { kind: Kind; room: string; warm: string }> = {
  1: { kind: 'fall', room: '#100f2c', warm: '#2a2768' },
  2: { kind: 'woods', room: '#0d1a10', warm: '#2f4a1f' },
  3: { kind: 'swirl', room: '#0b1238', warm: '#22348c' },
  4: { kind: 'fall', room: '#08081e', warm: '#2c1b62' },
  5: { kind: 'sizes', room: '#100d2a', warm: '#33205e' },
  6: { kind: 'lantern', room: '#120b07', warm: '#3d2513' },
  7: { kind: 'sizes', room: '#1e0b17', warm: '#5a1f45' },
  8: { kind: 'sizes', room: '#150c22', warm: '#43205f' },
  9: { kind: 'swirl', room: '#05132b', warm: '#173f78' },
  10: { kind: 'sizes', room: '#17130a', warm: '#4f3d16' },
  11: { kind: 'sizes', room: '#1a0c08', warm: '#552714' },
  12: { kind: 'woods', room: '#120e1e', warm: '#3b2c5e' },
  13: { kind: 'woods', room: '#0a1610', warm: '#25502c' },
  14: { kind: 'woods', room: '#140c1a', warm: '#4a2156' },
  15: { kind: 'swirl', room: '#140a18', warm: '#5a1f50' },
  16: { kind: 'woods', room: '#1a140a', warm: '#5a4418' },
  17: { kind: 'lantern', room: '#0c120a', warm: '#3a4a1a' },
  18: { kind: 'court', room: '#120d0a', warm: '#3d4a1a' },
  19: { kind: 'court', room: '#1e080c', warm: '#6a1626' },
  20: { kind: 'court', room: '#180a12', warm: '#4f1d3a' },
  21: { kind: 'court', room: '#1a0a0e', warm: '#5a1a2a' },
  22: { kind: 'woods', room: '#1a1208', warm: '#6a4a16' },
  23: { kind: 'lantern', room: '#140c0c', warm: '#4a2a26' },
};

const FADE_SECONDS = 1.4;
const MAX_DPR = 1.5;

interface Layer {
  kind: Kind;
  scene: Scene;
  alpha: number;
  /** +1 fading in, -1 fading out. */
  fade: 1 | -1;
  born: number;
}

/**
 * The room behind the book. Each act has its own scene; changing act crossfades
 * between them. The cursor stirs whatever is there, and page turns send a gust.
 * With reduced motion it renders one still frame per act and never animates.
 */
export class Backdrop {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  private layers: Layer[] = [];
  private pointer: Pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };
  private w = 0;
  private h = 0;
  private raf = 0;
  private last = 0;
  private clock = 0;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'backdrop';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d')!;
    host.prepend(this.canvas);

    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => this.onPointer(e), { passive: true });
    addEventListener('pointerdown', (e) => this.onPointer(e), { passive: true });
    document.documentElement.addEventListener('pointerleave', () => (this.pointer.active = false));
    document.addEventListener('visibilitychange', () => this.syncLoop());
    this.reducedMq.addEventListener('change', () => this.syncLoop());
  }

  /** Set the room for a page: its colours and scene follow the open spread. */
  setPage(n: number, act: Act) {
    document.documentElement.dataset.act = ACT_KEY[act];
    const room = PAGE_ROOM[n] ?? ACT_ROOM[act];
    const root = document.documentElement.style;
    root.setProperty('--room', room.room);
    root.setProperty('--room-warm', room.warm);
    const current = this.layers.find((l) => l.fade === 1);
    if (current?.kind === room.kind) return;

    for (const layer of this.layers) layer.fade = -1;
    const scene = SCENES[room.kind]();
    scene.resize(this.w, this.h);
    this.layers.push({ kind: room.kind, scene, alpha: this.layers.length ? 0 : 1, fade: 1, born: this.clock });
    this.syncLoop();
  }

  /** dir: +1 when turning forward, -1 when turning back. */
  gust(dir: 1 | -1) {
    for (const layer of this.layers) layer.scene.gust(dir);
  }

  private get still() {
    return this.reducedMq.matches;
  }

  private onPointer(e: PointerEvent) {
    const p = this.pointer;
    const now = performance.now();
    if (p.active) {
      const dt = Math.max(1, now - this.lastPointerTime) / 1000;
      // Smooth velocity so one jittery event doesn't fling everything.
      p.vx += ((e.clientX - p.x) / dt - p.vx) * 0.3;
      p.vy += ((e.clientY - p.y) / dt - p.vy) * 0.3;
    }
    p.x = e.clientX;
    p.y = e.clientY;
    p.active = true;
    this.lastPointerTime = now;
  }
  private lastPointerTime = 0;

  private resize() {
    const dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const layer of this.layers) layer.scene.resize(this.w, this.h);
    if (this.still) this.renderStill();
  }

  private syncLoop() {
    if (this.still) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.layers = this.layers.filter((l) => l.fade === 1);
      for (const l of this.layers) l.alpha = 1;
      this.renderStill();
      return;
    }
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.clock += dt;

    // Pointer velocity decays when the cursor rests.
    this.pointer.vx *= Math.pow(0.02, dt);
    this.pointer.vy *= Math.pow(0.02, dt);

    for (const layer of this.layers) {
      layer.alpha = Math.min(1, Math.max(0, layer.alpha + (layer.fade * dt) / FADE_SECONDS));
      layer.scene.update(dt, this.clock - layer.born, this.pointer);
    }
    this.layers = this.layers.filter((l) => l.fade === 1 || l.alpha > 0);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const layer of this.layers) {
      ctx.globalAlpha = easeInOut(layer.alpha);
      ctx.save();
      layer.scene.draw(ctx);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** Settle each scene for a moment off-screen, then draw it once. */
  private renderStill() {
    const resting: Pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };
    for (const layer of this.layers) {
      for (let i = 0; i < 30; i++) layer.scene.update(1 / 30, i / 30, resting);
    }
    this.draw();
  }
}

const easeInOut = (t: number) => t * t * (3 - 2 * t);
