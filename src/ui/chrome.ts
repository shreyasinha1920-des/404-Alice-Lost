import { story, PAGE_COUNT } from '../story';
import { el } from '../engine/dom';
import type { BookEngine } from '../engine/BookEngine';
import { music } from '../audio/music';
import { createTrail } from './trail';
import { WATCH, STRING } from './icons';

/**
 * The always-on UI around the book: back to the first page, meet the designer,
 * the page counter, prev/next, page dots, and the page-change announcer.
 */
export function createChrome(root: HTMLElement, engine: BookEngine) {
  // On narrow phones only the arrow shows, so the name lives in aria-label too.
  // The Rabbit's watch, whose hands run backwards when you hover.
  const restart = el('button', { class: 'ui-restart', type: 'button', 'aria-label': 'Begin at the beginning' }, [
    el('span', { class: 'ui-restart__arrow', 'aria-hidden': 'true' }),
    el('span', { class: 'ui-restart__label' }, 'Begin at the beginning'),
  ]);
  restart.querySelector('.ui-restart__arrow')!.innerHTML = WATCH;
  restart.addEventListener('click', () => engine.goTo(1));
  // A luggage tag on a string, swaying: "Meet the designer".
  const meet = el('button', { class: 'ui-designer', type: 'button' }, [
    el('span', { class: 'ui-designer__string', 'aria-hidden': 'true' }),
    el('span', { class: 'ui-designer__tag' }, 'Meet the designer'),
  ]);
  meet.querySelector('.ui-designer__string')!.innerHTML = STRING;
  meet.addEventListener('click', () => engine.goTo(PAGE_COUNT));
  // Music: off and on, remembered. Sound only ever starts after the visitor interacts.
  // While it plays, little notes float up out of it.
  const sound = el('button', { class: 'ui-sound', type: 'button' }, [
    el('span', { class: 'ui-sound__bars', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i'), el('i')]),
    el('span', { class: 'ui-sound__label' }, 'Music'),
    el('span', { class: 'ui-sound__notes', 'aria-hidden': 'true' }, [el('i', {}, '♪'), el('i', {}, '♫'), el('i', {}, '♪')]),
  ]);
  const syncSound = (on: boolean) => {
    sound.setAttribute('aria-pressed', String(on));
    sound.setAttribute('aria-label', on ? 'Music on. Turn music off' : 'Music off. Turn music on');
    // The bars only dance once sound is actually playing.
    sound.classList.toggle('is-playing', music.playing);
  };
  syncSound(music.enabled);
  music.onChange(syncSound);
  sound.addEventListener('click', () => music.toggle());

  const header = el('header', { class: 'ui-top' }, [
    el('div', { class: 'ui-top__left' }, [
      el('p', { class: 'ui-mark' }, [el('span', { class: 'ui-mark__code' }, '404'), el('span', { class: 'ui-mark__text' }, ' Page not found')]),
      sound,
    ]),
    el('div', { class: 'ui-top__actions' }, [restart, meet]),
  ]);

  const trail = createTrail(engine);
  const footer = el('footer', { class: 'ui-bottom' }, trail.root);

  // Large invisible hit areas on the outer edges of the book, for mouse users.
  // Keyboard and screen reader users get the prev/next buttons in the footer instead.
  const edgePrev = el('div', { class: 'book-edge book-edge--prev', 'aria-hidden': 'true' });
  const edgeNext = el('div', { class: 'book-edge book-edge--next', 'aria-hidden': 'true' });
  edgePrev.addEventListener('click', () => engine.prev());
  edgeNext.addEventListener('click', () => engine.next());
  engine.book.append(edgePrev, edgeNext);

  const live = el('p', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });

  root.prepend(header);
  root.append(footer, live);

  let first = true;
  return {
    update(n: number) {
      const page = story[n - 1];
      trail.update(n);
      edgePrev.hidden = n === 1;
      edgeNext.hidden = n === PAGE_COUNT;
      restart.hidden = n === 1;
      meet.hidden = n === PAGE_COUNT;
      document.title = `${page.title} · Page not found`;
      // The first page is announced by the document itself; announce turns only.
      if (!first) live.textContent = `Page ${n} of ${PAGE_COUNT}: ${page.title}`;
      first = false;
    },
  };
}
