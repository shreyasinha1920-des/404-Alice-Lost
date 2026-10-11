import { story } from '../story';
import { designer } from '../designer';
import { coverArt } from './cover';
import { KEY, WATCH, WAND } from '../ui/icons';
import { music } from '../audio/music';
import { portraitBloom } from './bloom';
import site from '../site.config';
import { el } from '../engine/dom';
import { createIllustration } from '../engine/illustration';
import type { PageModule, PageSlots, PageContext } from '../engine/types';

const DEV = import.meta.env.DEV;
/** Pages whose interactions are built; their dev notes are hidden. */
const BUILT = new Set(Array.from({ length: 23 }, (_, i) => i + 1));

/** A nudge to the reader, with a little wand that twinkles. */
export function hint(text: string): HTMLElement {
  const p = el('p', { class: 'text__hint' }, [el('span', { class: 'text__hint-wand', 'aria-hidden': 'true' }), el('span', {}, text)]);
  p.firstElementChild!.innerHTML = WAND;
  return p;
}

/** The text half of a spread: act label, Carroll's words, our 404 line, folio. */
export function renderText(n: number): HTMLElement {
  const page = story[n - 1];
  return el('div', { class: 'text' }, [
    el('h2', { class: 'sr-only' }, `Page ${n}: ${page.title}`),
    el('p', { class: 'text__act', 'aria-hidden': 'true' }, page.act),
    page.bridge ? el('p', { class: 'text__bridge' }, page.bridge) : null,
    el('div', { class: 'text__quote' }, page.quote.map((q) => el('p', {}, q))),
    page.line ? el('p', { class: 'text__fleuron', 'aria-hidden': 'true' }, '\u2766\uFE0E') : null,
    page.line ? el('p', { class: 'text__line' }, page.line) : null,
    page.hint ? hint(page.hint) : null,
    DEV && !BUILT.has(n) ? el('p', { class: 'text__dev', 'aria-hidden': 'true' }, page.interaction) : null,
  ]);
}

/**
 * A standard spread: illustration on the left, text on the right,
 * with cursor parallax while the page is current.
 * Act phases replace these with richer page modules.
 */
export function storyPage(n: number): PageModule {
  const page = story[n - 1];
  let stopParallax = () => {};
  let ctx: PageContext;
  const illus = createIllustration(n, page.alt, DEV ? page.interaction : undefined);

  return {
    mount({ left, right }: PageSlots, context) {
      ctx = context;
      left.append(illus.root);
      right.append(renderText(n));
    },
    onEnter() {
      if (!ctx.reducedMotion) stopParallax = illus.startParallax();
    },
    onLeave() {
      stopParallax();
    },
    unmount() {
      stopParallax();
    },
  };
}

/** Page 1: the closed front cover, printed in riso like the pages, with a giant 404. */
export function frontCover(): PageModule {
  let cover: HTMLElement;
  let ctx: PageContext;
  let art: ReturnType<typeof coverArt>;
  const onMove = (e: PointerEvent) => {
    const r = cover.getBoundingClientRect();
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    // Tilt toward the cursor, gently.
    cover.style.setProperty('--tx', clamp(((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    cover.style.setProperty('--ty', clamp(((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };

  return {
    mount({ right }, context) {
      ctx = context;
      art = coverArt(() => ctx.reducedMotion);
      // A golden key that turns in its lock as the book opens.
      const open = el('button', { class: 'cover__open', type: 'button' }, [el('span', { class: 'cover__key', 'aria-hidden': 'true' }), el('span', {}, 'Open the book')]);
      open.querySelector('.cover__key')!.innerHTML = KEY;
      open.addEventListener('click', (e) => {
        art.burst(e.clientX, e.clientY, 12);
        music.chime(4, 1);
        // The key turns as the cover opens.
        open.classList.add('is-turning');
        ctx.next();
      });
      cover = el('div', { class: 'cover cover--front' }, [
        art.canvas,
        el('div', { class: 'cover__door' }, [
          el('h1', { class: 'cover__title' }, [
            el('span', { class: 'sr-only' }, 'Error 404. '),
            el('span', { class: 'cover__title-small' }, 'Alice\u2019s Adventures in'),
            el('span', { class: 'cover__title-large' }, 'the Missing Page'),
          ]),
          el('p', { class: 'cover__sub' }, story[0].line ?? ''),
          el('p', { class: 'cover__bridge' }, story[0].bridge ?? ''),
          open,
        ]),
        el('p', { class: 'cover__credit' }, 'After Lewis Carroll & John Tenniel, 1865'),
      ]);
      cover.addEventListener('click', (e) => {
        if ((e.target as Element).closest('button')) return;
        art.burst(e.clientX, e.clientY, 11);
        music.chime(Math.floor(Math.random() * 6), 1);
      });
      right.append(cover);
    },
    onEnter() {
      art.start();
      if (!ctx.reducedMotion) addEventListener('pointermove', onMove, { passive: true });
    },
    onLeave() {
      art.stop();
      removeEventListener('pointermove', onMove);
    },
    unmount() {
      art?.stop();
      art?.dispose();
      removeEventListener('pointermove', onMove);
    },
  };
}

/** Page 23: about the designer, with her engraved portrait (which blooms when you hover it). */
export function designerPage(): PageModule {
  const page = story[22];
  let stopParallax = () => {};
  let ctx: PageContext;
  let bloom: ReturnType<typeof portraitBloom> | null = null;
  let placeContact = () => {};
  let unplace = () => {};
  const illus = createIllustration(23, page.alt);

  return {
    mount({ left, right }, context) {
      ctx = context;
      illus.root.classList.add('illus--designer');
      left.append(illus.root);
      const frame = illus.root.querySelector<HTMLElement>('.illus__frame');
      if (frame) bloom = portraitBloom(frame, () => ctx.reducedMotion);

      const again = el('button', { class: 'designer__again', type: 'button' }, [el('span', { class: 'designer__watch', 'aria-hidden': 'true' }), el('span', {}, 'Begin at the beginning')]);
      again.querySelector('.designer__watch')!.innerHTML = WATCH;
      again.addEventListener('click', () => ctx.goTo(1));

      const row = (label: string, href: string, text: string, external = true) =>
        el('li', { class: 'contact__row' }, [
          el('span', { class: 'contact__label' }, label),
          el('a', external ? { href, target: '_blank', rel: 'noopener' } : { href }, text),
        ]);
      const contact = el('section', { class: 'contact', 'aria-label': 'Contact' }, [
        el('h3', { class: 'contact__title' }, 'Write to her, or wander over'),
        el('ul', { class: 'contact__list' }, [
          row('Website', site.homeUrl, 'shreyasinha.co.in'),
          row('Email', `mailto:${site.contact.email}`, site.contact.email, false),
          row('LinkedIn', site.contact.linkedin, 'shreyasinhadesigns'),
          row('Behance', site.contact.behance, 'shreyasinha1920'),
          row('Résumé', site.contact.resume, 'Download the PDF'),
        ]),
      ]);

      const text = el('div', { class: 'text text--designer', 'data-scrollable': '' }, [
        el('p', { class: 'text__act' }, 'Colophon · this edition was designed by'),
        el('h2', { class: 'designer__name' }, designer.name),
        el('div', { class: 'designer__bio' }, designer.bio.map((p) => el('p', {}, p))),
        hint('Hover over her portrait.'),
        el('blockquote', { class: 'designer__epigraph' }, [el('p', {}, page.quote[0]), el('cite', {}, 'Alice, to the Gryphon')]),
      ]);
      const foot = el('div', { class: 'designer__foot' }, [again]);
      right.append(text, foot);
      // Her contact details sit under the portrait on the left page, with room to breathe;
      // on a phone (where the portrait is a short strip) they join the words instead.
      const narrow = matchMedia('(max-width: 820px)');
      placeContact = () => (narrow.matches ? text.append(contact) : left.append(contact));
      placeContact();
      narrow.addEventListener('change', placeContact);
      unplace = () => narrow.removeEventListener('change', placeContact);
    },
    onEnter() {
      if (!ctx.reducedMotion) stopParallax = illus.startParallax();
    },
    onLeave() {
      stopParallax();
      bloom?.reset();
    },
    unmount() {
      stopParallax();
      bloom?.destroy();
      unplace();
    },
  };
}
