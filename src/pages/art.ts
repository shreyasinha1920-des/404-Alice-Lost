import { story } from '../story';
import { el } from '../engine/dom';
import { renderText } from './shared';
import type { PageContext, PageModule } from '../engine/types';

/**
 * SVG filters for the hand-tinted look: `ink` makes lines wobble like a dip pen,
 * `wash` mottles fills like watercolour. Ids are prefixed per page, because several
 * pages are mounted at once and SVG ids are document-wide.
 */
export const inkDefs = (id: string) => `
  <filter id="${id}-ink" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="${id}-wash" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="8" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.25" result="mottle"/>
    <feComposite in="SourceGraphic" in2="mottle" operator="in" result="tinted"/>
    <feDisplacementMap in="tinted" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;

export const INK = '#2b2118';

export interface Scene {
  /** Goes in the left half, inside the gilt frame. */
  root: Element;
  enter?(): void;
  leave?(): void;
  progress?(p: number, velocity: number): void;
  destroy?(): void;
}

export interface ScenePageOptions {
  /** Makes the page scroll-driven (see PageModule.scrollLength). */
  scrollLength?: number;
  /** Replace the standard text half. */
  text?: (ctx: PageContext) => HTMLElement;
}

/**
 * A spread whose left half is a living scene and whose right half is the story text.
 * Scenes are built on mount, and only animate while their page is current.
 */
export function scenePage(n: number, make: (ctx: PageContext) => Scene, opts: ScenePageOptions = {}): PageModule {
  let scene: Scene | null = null;
  return {
    scrollLength: opts.scrollLength,
    mount({ left, right }, ctx) {
      scene = make(ctx);
      const figure = el('figure', { class: `scene scene--p${n}`, role: 'img', 'aria-label': story[n - 1].alt });
      figure.append(scene.root);
      left.append(figure);
      right.append(opts.text ? opts.text(ctx) : renderText(n));
    },
    // `is-live` lets CSS animations run only while the page is open.
    onEnter() {
      scene?.root.classList.add('is-live');
      scene?.enter?.();
    },
    onLeave() {
      scene?.root.classList.remove('is-live');
      scene?.leave?.();
    },
    onProgress: (p, v) => scene?.progress?.(p, v),
    unmount() {
      scene?.leave?.();
      scene?.destroy?.();
      scene = null;
    },
  };
}

/** Parse static SVG markup into an element. Only ever called with markup from this codebase. */
export function svg(markup: string): SVGSVGElement {
  const holder = document.createElement('div');
  holder.innerHTML = markup.trim();
  return holder.firstElementChild as SVGSVGElement;
}

/** Map pointer position over an element to -1..1 on each axis. */
export function pointerIn(elm: Element, e: PointerEvent) {
  const r = elm.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * 2 - 1,
    y: ((e.clientY - r.top) / r.height) * 2 - 1,
    inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom,
  };
}

/** Run a callback each frame until stopped. dt in seconds. */
export function loop(fn: (dt: number, t: number) => void) {
  let raf = 0;
  let last = 0;
  let t = 0;
  const tick = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    t += dt;
    fn(dt, t);
    raf = requestAnimationFrame(tick);
  };
  return {
    start() {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

/** A canvas that matches its box at a capped pixel ratio. */
export function fitCanvas(canvas: HTMLCanvasElement) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

export interface SpreadPageOptions {
  /** Makes the page scroll-driven (see PageModule.scrollLength). */
  scrollLength?: number;
  /** Replace the standard text. */
  text?: (ctx: PageContext) => HTMLElement;
  /** Where the copy sits on desktop, as fractions of the spread [x, y, w, h]; must lie in the right half. */
  copy?: [number, number, number, number];
  /** Called with the progress of scroll-driven pages. */
  progress?: (p: number, v: number) => void;
  destroy?: () => void;
}

/**
 * A spread illustrated edge to edge, like a picture book: one printed scene runs across
 * both pages, and the copy sits in a clearing the picture leaves for it.
 */
export function spreadPage(
  n: number,
  make: (ctx: PageContext) => import('../print/scene').SpreadScene,
  opts: SpreadPageOptions = {},
): PageModule {
  let scene: import('../print/scene').SpreadScene | null = null;
  return {
    scrollLength: opts.scrollLength,
    mount({ left, right }, ctx) {
      scene = make(ctx);
      left.classList.add('page--art');
      right.classList.add('page--art');
      left.append(scene.left, el('p', { class: 'sr-only' }, story[n - 1].alt));
      right.append(scene.right);
      const text = opts.text ? opts.text(ctx) : renderText(n);
      text.classList.add('text--over');
      const c = opts.copy;
      if (c) {
        // Copy coordinates are spread fractions; convert to fractions of the right half.
        text.style.setProperty('--copy-x', `${((c[0] - 0.5) / 0.5) * 100}%`);
        text.style.setProperty('--copy-y', `${c[1] * 100}%`);
        text.style.setProperty('--copy-w', `${(c[2] / 0.5) * 100}%`);
        text.style.setProperty('--copy-h', `${c[3] * 100}%`);
      }
      right.append(text);
      // Print a still now (and again once the engravings have loaded), so the picture is
      // already there on the leaf as the page turns in, not blank until it lands.
      requestAnimationFrame(() => scene?.prime());
      setTimeout(() => scene?.prime(), 700);
    },
    onEnter: () => scene?.enter(),
    onLeave: () => scene?.leave(),
    onProgress: (p, v) => opts.progress?.(p, v),
    unmount() {
      scene?.leave();
      scene?.dispose();
      opts.destroy?.();
      scene = null;
    },
  };
}
