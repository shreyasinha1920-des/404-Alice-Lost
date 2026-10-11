import { el } from '../engine/dom';
import { Press, INKS_FALL, type InkSet } from './press';

export interface Pointer {
  /** Eased position, CSS px within the spread. */
  x: number;
  y: number;
  rx: number;
  ry: number;
  speed: number;
  inside: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PrintFrame {
  press: Press;
  /** The whole spread (both pages on desktop, the whole sheet on a phone). */
  w: number;
  h: number;
  /** Where the copy sits: keep this part of the picture quiet. */
  copy: Rect;
  /** True when the two halves sit side by side (desktop), false when stacked (phone). */
  wide: boolean;
  t: number;
  dt: number;
  /** Steps ~12 times a second: lines re-wobble and plates shift register, like drawn animation on twos. */
  boil: number;
  pointer: Pointer;
  /** Spread coordinates to viewport coordinates, for things that leap out of the book. */
  toViewport(x: number, y: number): { x: number; y: number };
}

export interface PrintSceneOptions {
  inks?: InkSet;
  /** Halftone cell size in CSS px. */
  pitch?: number;
  /** Desktop copy area as fractions of the spread [x, y, w, h]; on phones the text half is used. */
  copy?: [number, number, number, number];
  layout(f: PrintFrame): void;
  draw(f: PrintFrame): void;
  click?(x: number, y: number, f: PrintFrame): void;
  enter?(): void;
  leave?(): void;
  reducedMotion: () => boolean;
}

export interface SpreadScene {
  /** Display canvases: one goes in each half of the spread. */
  left: HTMLElement;
  right: HTMLElement;
  frame: () => PrintFrame;
  enter(): void;
  leave(): void;
  /** Release the press's WebGL context (when the page is unmounted). */
  dispose(): void;
}

const DEFAULT_COPY: [number, number, number, number] = [0.56, 0.12, 0.38, 0.5];

/**
 * A printed scene that runs across both pages of a spread. One press prints the whole
 * spread (so a tree can grow across the gutter); the print is then cut in two and shown in
 * each half, so each half can still turn on its own leaf. The picture prints straight onto
 * the parchment, quiets itself under the copy, and only animates while its page is open.
 */
export function printScene(o: PrintSceneOptions): SpreadScene {
  const press = new Press(o.inks ?? INKS_FALL);
  if (o.pitch) press.pitch = o.pitch;
  const leftCv = el('canvas', { class: 'art__cv' });
  const rightCv = el('canvas', { class: 'art__cv' });
  const left = el('div', { class: 'art art--left', 'aria-hidden': 'true' }, leftCv);
  const right = el('div', { class: 'art art--right', 'aria-hidden': 'true' }, rightCv);
  const lg = leftCv.getContext('2d')!;
  const rg = rightCv.getContext('2d')!;
  const pointer: Pointer = { x: -9999, y: -9999, rx: -9999, ry: -9999, speed: 0, inside: false };
  // Where each half sits in the spread, measured while the halves are at rest.
  const geo = { L: { x: 0, y: 0, w: 0, h: 0 }, R: { x: 0, y: 0, w: 0, h: 0 }, dpr: 1 };
  const f: PrintFrame = {
    press,
    w: 0,
    h: 0,
    copy: { x: 0, y: 0, w: 0, h: 0 },
    wide: true,
    t: 0,
    dt: 1 / 60,
    boil: 0,
    pointer,
    toViewport(x, y) {
      const sp = spreadEl();
      const r = sp ? sp.getBoundingClientRect() : left.getBoundingClientRect();
      return { x: r.left + x * (r.width / (f.w || 1)), y: r.top + y * (r.height / (f.h || 1)) };
    },
  };
  let raf = 0;
  let last = 0;

  const spreadEl = () => {
    const page = left.parentElement;
    return page && page.parentElement?.classList.contains('spread') ? page.parentElement : null;
  };

  const fit = () => {
    const sp = spreadEl();
    const lp = left.parentElement;
    const rp = right.parentElement;
    // Mid-turn the halves travel on the leaf: keep the last good layout.
    if (!sp || !lp || !rp || rp.parentElement !== sp) return f.w > 0;
    const W = sp.clientWidth;
    const H = sp.clientHeight;
    if (!W || !H) return false;
    const L = { x: lp.offsetLeft, y: lp.offsetTop, w: lp.clientWidth, h: lp.clientHeight };
    const R = { x: rp.offsetLeft, y: rp.offsetTop, w: rp.clientWidth, h: rp.clientHeight };
    const changed = W !== f.w || H !== f.h || L.w !== geo.L.w || L.h !== geo.L.h || R.x !== geo.R.x || R.y !== geo.R.y;
    if (changed) {
      geo.L = L;
      geo.R = R;
      geo.dpr = Math.min(devicePixelRatio || 1, 1.5);
      f.w = W;
      f.h = H;
      f.wide = R.y < H * 0.25;
      const c = o.copy ?? DEFAULT_COPY;
      f.copy = f.wide ? { x: c[0] * W, y: c[1] * H, w: c[2] * W, h: c[3] * H } : { x: R.x + R.w * 0.04, y: R.y, w: R.w * 0.92, h: R.h * 0.8 };
      press.resize(W, H, geo.dpr);
      for (const [cv, r] of [[leftCv, L], [rightCv, R]] as const) {
        cv.width = Math.max(1, Math.round(r.w * geo.dpr));
        cv.height = Math.max(1, Math.round(r.h * geo.dpr));
      }
      o.layout(f);
    }
    return true;
  };

  const render = () => {
    if (!fit()) return;
    press.begin();
    o.draw(f);
    press.clearing(f.copy);
    press.print(f.boil);
    // Cut the print in two: each half shows its own part of the spread.
    const d = geo.dpr;
    for (const [g, r] of [[lg, geo.L], [rg, geo.R]] as const) {
      g.clearRect(0, 0, g.canvas.width, g.canvas.height);
      if (r.w > 0 && r.h > 0) g.drawImage(press.canvas, r.x * d, r.y * d, r.w * d, r.h * d, 0, 0, g.canvas.width, g.canvas.height);
    }
  };

  // Development only: time this scene's draw + print, e.g. __printBench(20) in the console.
  if (import.meta.env.DEV) {
    (window as unknown as { __printBench?: (n?: number) => number }).__printBench = (n = 20) => {
      const t0 = performance.now();
      for (let i = 0; i < n; i++) {
        f.t += 1 / 60;
        f.boil = Math.floor(f.t * 12);
        render();
      }
      return Math.round(((performance.now() - t0) / n) * 10) / 10;
    };
  }

  const tick = (now: number) => {
    f.dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    f.t += f.dt;
    f.boil = Math.floor(f.t * 12);
    const k = 1 - Math.pow(0.002, f.dt);
    if (pointer.rx > -9000) {
      if (pointer.x < -9000) {
        pointer.x = pointer.rx;
        pointer.y = pointer.ry;
      }
      pointer.x += (pointer.rx - pointer.x) * k;
      pointer.y += (pointer.ry - pointer.y) * k;
    }
    pointer.speed *= Math.pow(0.05, f.dt);
    render();
    raf = requestAnimationFrame(tick);
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const sp = spreadEl();
    if (!sp) return null;
    const r = sp.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * f.w, y: ((e.clientY - r.top) / r.height) * f.h, r };
  };
  const onMove = (e: PointerEvent) => {
    const p = local(e);
    if (!p) return;
    pointer.inside = p.x >= 0 && p.y >= 0 && p.x <= f.w && p.y <= f.h;
    if (pointer.rx > -9000) pointer.speed = Math.min(4000, pointer.speed * 0.7 + Math.hypot(p.x - pointer.rx, p.y - pointer.ry) * 18);
    pointer.rx = p.x;
    pointer.ry = p.y;
  };
  const onClick = (e: MouseEvent) => {
    // Clicks on links and buttons in the copy belong to them, not the picture.
    if ((e.target as Element).closest('a, button, input')) return;
    const p = local(e);
    if (p) o.click?.(p.x, p.y, f);
  };

  return {
    left,
    right,
    frame: () => f,
    enter() {
      o.enter?.();
      if (o.reducedMotion()) {
        f.t = 2;
        f.boil = 0;
        requestAnimationFrame(render);
        return;
      }
      last = 0;
      addEventListener('pointermove', onMove, { passive: true });
      if (o.click) {
        left.parentElement?.addEventListener('click', onClick);
        right.parentElement?.addEventListener('click', onClick);
      }
      raf = requestAnimationFrame(tick);
    },
    leave() {
      cancelAnimationFrame(raf);
      raf = 0;
      removeEventListener('pointermove', onMove);
      left.parentElement?.removeEventListener('click', onClick);
      right.parentElement?.removeEventListener('click', onClick);
      pointer.inside = false;
      o.leave?.();
    },
    dispose() {
      press.dispose();
    },
  };
}
