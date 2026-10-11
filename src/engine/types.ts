import type { StoryPage } from '../story';

/** The two halves of a spread. On mobile they stack inside a single page. */
export interface PageSlots {
  left: HTMLElement;
  right: HTMLElement;
}

export interface PageContext {
  page: StoryPage;
  /** Live values: read them when you need them, they change with user settings. */
  readonly reducedMotion: boolean;
  readonly isMobile: boolean;
  next(): void;
  prev(): void;
  goTo(n: number): void;
}

/**
 * Every page in /src/pages exports a default factory returning one of these.
 * A fresh instance is created each time the page is mounted.
 */
export interface PageModule {
  /** Build DOM into the slots. Runs when the page enters the mounted window (current ±1). */
  mount(slots: PageSlots, ctx: PageContext): void | Promise<void>;
  /** Tear down everything: listeners, loops, WebGL resources. */
  unmount(): void;
  /** The page has become the current page and its turn has finished. */
  onEnter?(): void;
  /** The page is about to stop being the current page. */
  onLeave?(): void;
  /**
   * Pages that take over scrolling (the fall, pages 4 and 5) set how much scrolling,
   * in wheel pixels, carries them from 0 to 1. Once at either end, a fresh scroll turns the page.
   * Ignored with reduced motion.
   */
  scrollLength?: number;
  /** Smoothed scroll progress 0..1, and its velocity in progress per second. */
  onProgress?(p: number, velocity: number): void;
}

export type PageFactory = () => PageModule;
