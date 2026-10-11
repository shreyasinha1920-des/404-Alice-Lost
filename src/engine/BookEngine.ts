import gsap from 'gsap';
import { story, PAGE_COUNT, ACT_KEY } from '../story';
import { ornament } from './ornament';
import { el } from './dom';
import type { PageFactory, PageModule, PageContext } from './types';

const loaders = import.meta.glob<{ default: PageFactory }>('../pages/page-*.ts');

interface View {
  n: number;
  module: PageModule;
  spread: HTMLElement;
  left: HTMLElement;
  right: HTMLElement;
}

export type Direction = 1 | -1;

export interface EngineOptions {
  /** Element the book is built inside. */
  host: HTMLElement;
  /** Called after every completed turn (and once on start). */
  onChange(n: number): void;
  /** Called as a turn begins, before any animation. */
  onTurnStart?(from: number, to: number, dir: Direction): void;
}

const MOBILE_QUERY = '(max-width: 820px)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Owns the book: which page is current, which pages are mounted,
 * and how one page turns into the next.
 *
 * Only the current page and its two neighbours are mounted. Every other
 * page is unmounted and its DOM removed, so its effects stop completely.
 */
export class BookEngine {
  current = 0;
  readonly book: HTMLElement;
  private readonly body: HTMLElement;
  private readonly sheets: HTMLElement;
  private readonly leaf: HTMLElement;
  private readonly leafFront: HTMLElement;
  private readonly leafBack: HTMLElement;
  private readonly views = new Map<number, View>();
  private readonly pending = new Map<number, Promise<View>>();
  private readonly mobileMq = matchMedia(MOBILE_QUERY);
  private readonly reducedMq = matchMedia(REDUCED_QUERY);
  private busy = false;
  /** Scroll-driven pages: where scrolling is heading, and where the page has eased to. */
  private scroll = { target: 0, value: 0, velocity: 0, armed: false, raf: 0, last: 0 };
  /** The page the in-flight turn is heading to. */
  private target: number | null = null;
  private queued: number | null = null;

  constructor(private readonly opts: EngineOptions) {
    this.leafFront = el('div', { class: 'leaf__face leaf__face--front' }, el('div', { class: 'leaf__shade' }));
    this.leafBack = el('div', { class: 'leaf__face leaf__face--back' }, el('div', { class: 'leaf__shade' }));
    this.leaf = el('div', { class: 'leaf', 'aria-hidden': 'true' }, [this.leafFront, this.leafBack]);
    this.sheets = el('div', { class: 'book__sheets' });
    this.body = el('div', { class: 'book__body' }, [
      el('div', { class: 'book__spine', 'aria-hidden': 'true' }),
      this.sheets,
      this.leaf,
    ]);
    this.book = el('div', { class: 'book', role: 'region', 'aria-roledescription': 'book', 'aria-label': 'Alice’s Adventures in the Missing Page' }, this.body);
    opts.host.append(this.book);
  }

  get isMobile() {
    return this.mobileMq.matches;
  }

  get reducedMotion() {
    return this.reducedMq.matches;
  }

  get isTurning() {
    return this.busy;
  }

  /** True while the current page is driven by scrolling instead of turning on scroll. */
  get isCapturing() {
    return !this.busy && !this.reducedMotion && !!this.views.get(this.current)?.module.scrollLength;
  }

  /**
   * Feed scrolling to a scroll-driven page. Returns 'consumed', or the direction to turn
   * when the page is already at that end and the gesture is a fresh one (see armEdge).
   */
  scrollBy(deltaPx: number, fresh = false): 'consumed' | 1 | -1 {
    const module = this.views.get(this.current)?.module;
    if (!module?.scrollLength) return deltaPx > 0 ? 1 : -1;
    const s = this.scroll;
    const before = s.target;
    s.target = Math.min(1, Math.max(0, s.target + deltaPx / module.scrollLength));
    if (s.target !== before) {
      s.armed = false;
      this.runScroll();
      return 'consumed';
    }
    if (s.armed || fresh) return deltaPx > 0 ? 1 : -1;
    return 'consumed';
  }

  /** The visitor paused; the next scroll past an end may turn the page. */
  armEdge() {
    this.scroll.armed = true;
  }

  private startScroll(view: View, dir: Direction) {
    cancelAnimationFrame(this.scroll.raf);
    const start = dir === 1 ? 0 : 1;
    this.scroll = { target: start, value: start, velocity: 0, armed: false, raf: 0, last: 0 };
    document.documentElement.classList.toggle('is-capturing', !!view.module.scrollLength && !this.reducedMotion);
    if (view.module.scrollLength) view.module.onProgress?.(this.reducedMotion ? 1 : start, 0);
  }

  private runScroll() {
    const s = this.scroll;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - s.last) / 1000) || 1 / 60;
      s.last = now;
      const prev = s.value;
      s.value += (s.target - s.value) * (1 - Math.pow(0.004, dt));
      if (Math.abs(s.target - s.value) < 0.0005) s.value = s.target;
      s.velocity = (s.value - prev) / dt;
      this.views.get(this.current)?.module.onProgress?.(s.value, s.velocity);
      s.raf = s.value === s.target ? 0 : requestAnimationFrame(tick);
      if (!s.raf) this.views.get(this.current)?.module.onProgress?.(s.value, 0);
    };
    s.raf = requestAnimationFrame(tick);
  }

  async start(n: number) {
    const target = clamp(n);
    const view = await this.ensureView(target);
    this.current = target;
    this.setCoverState(target);
    this.showOnly(view);
    this.startScroll(view, 1);
    view.module.onEnter?.();
    this.opts.onChange(target);
    this.settle();
  }

  next() {
    this.goTo(this.heading + 1);
  }

  prev() {
    this.goTo(this.heading - 1);
  }

  /** Where the book will end up once queued and in-flight turns finish. */
  private get heading() {
    return this.queued ?? this.target ?? this.current;
  }

  /** Turn to page n. Requests made mid-turn are queued; the latest wins. */
  async goTo(n: number) {
    const target = clamp(n);
    if (this.busy) {
      this.queued = target === this.target ? null : target;
      return;
    }
    if (target === this.current) return;

    this.busy = true;
    this.target = target;
    const from = this.views.get(this.current)!;
    try {
      const to = await this.ensureView(target);
      const dir: Direction = target > this.current ? 1 : -1;
      from.module.onLeave?.();
      cancelAnimationFrame(this.scroll.raf);
      this.scroll.raf = 0;
      this.opts.onTurnStart?.(from.n, target, dir);
      this.setCoverState(target);
      if (this.reducedMotion) await this.crossfade(from, to);
      else if (this.isMobile) await this.slideFold(from, to, dir);
      else await this.turnLeaf(from, to, dir);
      this.current = target;
      this.showOnly(to);
      this.startScroll(to, dir);
      to.module.onEnter?.();
      this.opts.onChange(target);
    } catch (err) {
      console.error(`Could not turn to page ${target}`, err);
      this.showOnly(from);
    } finally {
      this.busy = false;
      this.target = null;
    }

    this.settle();
    if (this.queued !== null) {
      const q = this.queued;
      this.queued = null;
      this.goTo(q);
    }
  }

  /** Context handed to each page module. Values are read live. */
  private contextFor(n: number): PageContext {
    const engine = this;
    return {
      page: story[n - 1],
      get reducedMotion() {
        return engine.reducedMotion;
      },
      get isMobile() {
        return engine.isMobile;
      },
      next: () => engine.next(),
      prev: () => engine.prev(),
      goTo: (p: number) => engine.goTo(p),
    };
  }

  private ensureView(n: number): Promise<View> {
    const existing = this.views.get(n);
    if (existing) return Promise.resolve(existing);
    const inflight = this.pending.get(n);
    if (inflight) return inflight;

    const load = (async () => {
      const key = `../pages/page-${String(n).padStart(2, '0')}.ts`;
      const factory = (await loaders[key]()).default;
      const page = story[n - 1];
      const left = el('div', { class: `page page--left${page.cover === 'front' ? ' page--blank' : ''}` });
      const right = el('div', { class: 'page page--right' });
      const spread = el('section', { class: 'spread', 'data-page': String(n), 'aria-hidden': 'true' }, [left, right]);
      // On the halves too: mid-turn they travel on the leaf, outside the spread.
      spread.dataset.act = left.dataset.act = right.dataset.act = ACT_KEY[page.act];
      if (page.cover) spread.classList.add(`spread--${page.cover}`);
      else for (const half of [left, right]) half.append(ornament());
      spread.inert = true;
      this.sheets.append(spread);
      const module = factory();
      await module.mount({ left, right }, this.contextFor(n));
      // The page number: every spread but the cover, always in the same place (bottom outer corner).
      if (!page.cover) right.append(el('p', { class: 'folio folio--page', 'aria-hidden': 'true' }, String(n)));
      const view: View = { n, module, spread, left, right };
      this.views.set(n, view);
      return view;
    })();

    this.pending.set(n, load);
    load.finally(() => this.pending.delete(n));
    return load;
  }

  /** Unmount pages outside current ±1, then preload the neighbours. */
  private settle() {
    const keep = new Set([this.current - 1, this.current, this.current + 1]);
    for (const [n, view] of this.views) {
      if (keep.has(n)) continue;
      view.module.unmount();
      view.spread.remove();
      this.views.delete(n);
    }
    for (const n of keep) {
      if (n >= 1 && n <= PAGE_COUNT) this.ensureView(n).catch((err) => console.error(err));
    }
  }

  private showOnly(view: View) {
    for (const v of this.views.values()) {
      const isCurrent = v === view;
      v.spread.classList.toggle('is-current', isCurrent);
      v.spread.classList.remove('is-turning');
      v.spread.inert = !isCurrent;
      v.spread.setAttribute('aria-hidden', String(!isCurrent));
      gsap.set(v.spread, { clearProps: 'all' });
    }
  }

  /** A closed book shows only its cover, so the body shifts to keep it centred. */
  private setCoverState(n: number) {
    this.book.dataset.cover = story[n - 1].cover ?? 'none';
  }

  /** Desktop: one leaf lifts from the spine and turns over, with light falling across it. */
  private turnLeaf(from: View, to: View, dir: Direction): Promise<void> {
    const forward = dir === 1;
    const frontPage = forward ? from.right : from.left;
    const backPage = forward ? to.left : to.right;
    const frontShade = this.leafFront.querySelector<HTMLElement>('.leaf__shade')!;
    const backShade = this.leafBack.querySelector<HTMLElement>('.leaf__shade')!;

    this.leaf.className = `leaf leaf--${forward ? 'right' : 'left'} is-active`;
    this.leafFront.prepend(frontPage);
    this.leafBack.prepend(backPage);
    from.spread.classList.add('is-turning');
    to.spread.classList.add('is-turning');

    const restore = () => {
      // Put each half back in its own spread, left before right.
      if (forward) {
        from.spread.append(frontPage);
        to.spread.prepend(backPage);
      } else {
        from.spread.prepend(frontPage);
        to.spread.append(backPage);
      }
      this.leaf.className = 'leaf';
      gsap.set([this.leaf, frontShade, backShade], { clearProps: 'all' });
    };

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
          restore();
          resolve();
        },
      });
      tl.fromTo(this.leaf, { rotationY: 0 }, { rotationY: forward ? -180 : 180, duration: 1.05 }, 0)
        // A gentle lift off the page in the middle of the turn.
        .to(this.leaf, { z: 36, duration: 0.5, ease: 'sine.out' }, 0)
        .to(this.leaf, { z: 0, duration: 0.55, ease: 'sine.in' }, 0.5)
        // Light: the front darkens as it tilts away, the back brightens as it lands.
        .fromTo(frontShade, { opacity: 0 }, { opacity: 0.55, duration: 0.52, ease: 'sine.in' }, 0)
        .fromTo(backShade, { opacity: 0.55 }, { opacity: 0, duration: 0.53, ease: 'sine.out' }, 0.52);
      finish(tl);
    });
  }

  /** Mobile: the page slides away while folding back, the next slides in. */
  private slideFold(from: View, to: View, dir: Direction): Promise<void> {
    from.spread.classList.add('is-turning');
    to.spread.classList.add('is-turning');
    return new Promise((resolve) => {
      const tl = gsap
        .timeline({ onComplete: resolve })
        .set(from.spread, { transformOrigin: dir === 1 ? 'left center' : 'right center', zIndex: 2 })
        .to(from.spread, { xPercent: -28 * dir, rotationY: 32 * dir, opacity: 0, duration: 0.55, ease: 'power2.in' }, 0)
        .fromTo(to.spread, { xPercent: 18 * dir, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.4)' }, 0.22);
      finish(tl);
    });
  }

  /** Reduced motion: a plain crossfade. */
  private crossfade(from: View, to: View): Promise<void> {
    from.spread.classList.add('is-turning');
    to.spread.classList.add('is-turning');
    return new Promise((resolve) => {
      const tl = gsap
        .timeline({ onComplete: resolve })
        .to(from.spread, { opacity: 0, duration: 0.25, ease: 'none' }, 0)
        .fromTo(to.spread, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'none' }, 0);
      finish(tl);
    });
  }
}

/**
 * Play a page-turn timeline to its end, whatever the frame rate: if frames stall (a busy
 * machine, a background tab), the turn snaps to its end instead of leaving the book stuck.
 */
function finish(tl: gsap.core.Timeline) {
  const limit = (tl.duration() + 1.5) * 1000;
  const timer = window.setTimeout(() => {
    if (tl.progress() < 1) tl.progress(1);
  }, limit);
  tl.eventCallback('onInterrupt', () => clearTimeout(timer));
  return tl;
}

function clamp(n: number) {
  return Math.min(PAGE_COUNT, Math.max(1, Math.round(n) || 1));
}
