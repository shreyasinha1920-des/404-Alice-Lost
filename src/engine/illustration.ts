import manifest from 'virtual:illustrations';
import { el } from './dom';

const LAYERS = ['bg', 'mid', 'fg'] as const;
type Layer = (typeof LAYERS)[number];

/** How far each layer drifts with the cursor, in px at the edge of the viewport. */
const DEPTH: Record<Layer, number> = { bg: 4, mid: 9, fg: 16 };

export interface Illustration {
  root: HTMLElement;
  /** Start cursor parallax. Returns a stop function. */
  startParallax(): () => void;
}

/**
 * Renders a page's illustration from /public/illustrations/page-XX/{bg,mid,fg}.
 * Missing layers become a labelled placeholder so the build never breaks.
 */
export function createIllustration(n: number, alt: string, note?: string): Illustration {
  const key = `page-${String(n).padStart(2, '0')}`;
  const files = manifest[key] ?? {};
  const present = LAYERS.filter((layer) => files[layer]);

  const root = el('figure', { class: 'illus' });
  const frame = el('div', { class: 'illus__frame', role: 'img', 'aria-label': alt });
  root.append(frame);

  const layerEls: [HTMLElement, number][] = [];

  if (present.length === 0) {
    const ph = el('div', { class: 'illus__placeholder', 'aria-hidden': 'true' }, [
      el('span', { class: 'illus__label' }, `Plate ${String(n).padStart(2, '0')}`),
      el('span', { class: 'illus__alt' }, alt),
      note ? el('span', { class: 'illus__note' }, note) : null,
      el('span', { class: 'illus__path' }, `/illustrations/${key}/bg.png · fg.png`),
    ]);
    frame.append(ph);
  } else {
    for (const layer of present) {
      const img = el('img', {
        class: `illus__layer illus__layer--${layer}`,
        src: files[layer]!,
        alt: '',
        decoding: 'async',
        draggable: 'false',
      });
      frame.append(img);
      layerEls.push([img, DEPTH[layer]]);
    }
  }

  function startParallax() {
    if (layerEls.length === 0) return () => {};
    let raf = 0;
    let tx = 0, ty = 0, x = 0, y = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      for (const [node, depth] of layerEls) {
        node.style.transform = `translate3d(${(-x * depth).toFixed(2)}px, ${(-y * depth).toFixed(2)}px, 0)`;
      }
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', onMove, { passive: true });
    return () => {
      removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
      raf = 0;
    };
  }

  return { root, startParallax };
}
