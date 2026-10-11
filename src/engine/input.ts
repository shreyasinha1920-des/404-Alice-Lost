import type { BookEngine } from './BookEngine';

const WHEEL_THRESHOLD = 40;
/** A trackpad keeps sending wheel events after a flick; wait for quiet before the next turn. */
const WHEEL_QUIET_MS = 220;
const SWIPE_MIN_PX = 45;

/** Wheel, keyboard and swipe each turn exactly one page. */
export function bindInput(engine: BookEngine, surface: HTMLElement) {
  // Wheel
  let acc = 0;
  let locked = false;
  let quietTimer = 0;
  addEventListener(
    'wheel',
    (e) => {
      if (isInsideScrollable(e.target)) return;
      e.preventDefault();
      clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => {
        locked = false;
        acc = 0;
        engine.armEdge();
      }, WHEEL_QUIET_MS);
      if (locked || engine.isTurning) return;
      const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const delta = e.deltaMode === 1 ? raw * 16 : raw;
      if (engine.isCapturing) {
        const result = engine.scrollBy(delta);
        if (result === 'consumed') return;
        locked = true;
        result > 0 ? engine.next() : engine.prev();
        return;
      }
      acc += delta;
      if (Math.abs(acc) < WHEEL_THRESHOLD) return;
      locked = true;
      acc > 0 ? engine.next() : engine.prev();
      acc = 0;
    },
    { passive: false },
  );

  // Keyboard
  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
    const onPageBody = e.target === document.body || e.target === document.documentElement;
    // On scroll-driven pages, Down/Up/Space move through the scene in steps before turning.
    if (engine.isCapturing && /^(ArrowDown|ArrowUp|PageDown|PageUp| )$/.test(e.key) && (e.key !== ' ' || onPageBody)) {
      const back = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
      const result = engine.scrollBy(back ? -400 : 400, true);
      if (result !== 'consumed') result > 0 ? engine.next() : engine.prev();
      e.preventDefault();
      return;
    }
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        engine.next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        engine.prev();
        break;
      case ' ':
        if (!onPageBody) return;
        e.shiftKey ? engine.prev() : engine.next();
        break;
      case 'Home':
        engine.goTo(1);
        break;
      case 'End':
        engine.goTo(Number.MAX_SAFE_INTEGER);
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  // Swipe (touch and pen only; mice click the page edges instead)
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let lastY = 0;
  let dragged = false;
  surface.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    // A gesture that starts on a picture belongs to the picture (brushing the willow, tracing
    // the thread, painting a rose), not to turning the page. Scroll-driven pages are the
    // exception: there, dragging anywhere is the fall.
    if (!engine.isCapturing && startsOnPicture(e.target)) return;
    tracking = true;
    dragged = false;
    startX = e.clientX;
    startY = lastY = e.clientY;
  });
  surface.addEventListener('pointermove', (e) => {
    if (!tracking || !engine.isCapturing) return;
    const result = engine.scrollBy((lastY - e.clientY) * 3);
    lastY = e.clientY;
    if (result === 'consumed') dragged = true;
  });
  surface.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    if (engine.isCapturing) {
      engine.armEdge();
      if (dragged) return;
    }
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    dx < 0 ? engine.next() : engine.prev();
  });
  surface.addEventListener('pointercancel', () => (tracking = false));
}

/** On a printed illustration, but not on its words, links or buttons. */
function startsOnPicture(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return !!target.closest('.page--art') && !target.closest('.text, a, button, input');
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/** Let elements that genuinely scroll (e.g. a long suggestion list) keep their wheel. */
function isInsideScrollable(target: EventTarget | null) {
  for (let node = target as HTMLElement | null; node && node !== document.body; node = node.parentElement) {
    if (node.dataset?.scrollable !== undefined && node.scrollHeight > node.clientHeight) return true;
  }
  return false;
}
