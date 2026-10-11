import gsap from 'gsap';
import { story, PAGE_COUNT, ACT_KEY } from '../story';
import { el } from '../engine/dom';
import type { BookEngine } from '../engine/BookEngine';

/**
 * Pagination as a little journey: a winding dotted path with one printed stop for every
 * page (a book for the cover, pocket watches for the Fall, bottles for Wrong Sizes,
 * toadstools for the Woods, hearts for the Court, a star for the designer). Tenniel's White
 * Rabbit hops along it to the page you're on. Hand-drawn arrows step back and forth, and
 * the count reads like a book: "page vii of xxiii".
 */

const ICON: Record<string, string> = {
  book: '<path d="M3 4.5c2.6-.9 5-.6 7 1v10c-2-1.4-4.4-1.6-7-.8zM17 4.5c-2.6-.9-5-.6-7 1v10c2-1.4 4.4-1.6 7-.8z"/>',
  fall: '<circle cx="10" cy="11" r="6.2"/><path d="M10 4.8V3M8.6 2.6h2.8" fill="none"/><path d="M10 11l2.4 1.6M10 11V7.6" fill="none" stroke-width="1.3"/>',
  sizes: '<path d="M8 2.5h4v3.2c2 .9 3 2.3 3 4.3v5.6c0 1-.8 1.9-1.9 1.9H6.9C5.8 17.5 5 16.6 5 15.6V10c0-2 1-3.4 3-4.3z"/><path d="M7 11h6v3H7z" fill="#fbf4e2" stroke="none"/>',
  woods: '<path d="M2.8 10.2C3.4 5.6 6.4 3 10 3s6.6 2.6 7.2 7.2c-4.6 1.2-9.8 1.2-14.4 0z"/><path d="M8.4 10.6h3.2l.6 6.4H7.8z"/><circle cx="7" cy="7" r="1" fill="#fbf4e2" stroke="none"/><circle cx="12.4" cy="6.2" r="1.1" fill="#fbf4e2" stroke="none"/>',
  court: '<path d="M10 17s-6.6-4.2-6.6-8.6c0-2.2 1.6-3.8 3.6-3.8 1.4 0 2.4.8 3 1.8.6-1 1.6-1.8 3-1.8 2 0 3.6 1.6 3.6 3.8C16.6 12.8 10 17 10 17z"/>',
  star: '<path d="M10 2.6l2 5.2 5.4.4-4.2 3.4 1.4 5.4L10 14l-4.6 3 1.4-5.4L2.6 8.2 8 7.8z"/>',
};

/** The White Rabbit, running left, in a red waistcoat with his gold watch. */
const RABBIT_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g stroke="#2b2118" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      // ears
      '<path d="M15.5 15.5C14.6 9.8 16.4 4.6 19.4 2.4c1.1 4.1-.4 9.2-2.2 13.3z" fill="#fbf1d6"/>' +
      '<path d="M17.6 16.2C19.6 10.6 23 6.3 26.4 4.9c-.3 4.5-3.5 9.2-6.6 12.2z" fill="#fbf1d6"/>' +
      '<path d="M17.2 13.6c-.2-3.4.6-6.6 2-8.4" fill="none" stroke="#e86a9a" stroke-width="1.2"/>' +
      // tail and back leg
      '<circle cx="39.5" cy="26" r="2.8" fill="#fbf1d6"/>' +
      '<path d="M33 33c2.6 3.4 6.4 5.4 11 5.2" fill="none" stroke-width="2.6"/>' +
      '<path d="M33 33c2.6 3.4 6.4 5.4 11 5.2" fill="none" stroke="#fbf1d6" stroke-width="1"/>' +
      // body
      '<path d="M14.5 28c-.4-7.6 7.4-11 15.4-9 6.8 1.8 10 7.2 8.2 12.3-1.9 5.2-11.6 6.4-17.6 4.6-3.8-1.1-5.8-3.9-6-7.9z" fill="#fbf1d6"/>' +
      // waistcoat
      '<path d="M18.2 22.6c3.2-2.2 8.3-1.2 9.4 2.9 1 4.1-1.7 7.9-6.1 8-2.3-1.4-3.9-6.2-3.3-10.9z" fill="#c8324f"/>' +
      // the watch on its chain
      '<path d="M21 25.2c1.6.9 2.5 1.6 3 2.6" fill="none" stroke="#e8b84a" stroke-width="1"/>' +
      '<circle cx="24.6" cy="28.6" r="2.6" fill="#f2c95a"/>' +
      // front leg, reaching
      '<path d="M18 33.2c-3.8 1.9-7.6 2.6-11.4 2" fill="none" stroke-width="2.6"/>' +
      '<path d="M18 33.2c-3.8 1.9-7.6 2.6-11.4 2" fill="none" stroke="#fbf1d6" stroke-width="1"/>' +
      // head
      '<path d="M7.6 21.2c-.3-4.7 3.4-7.9 7.6-7.2 3.3.6 5 3.7 4.3 7-.7 3.6-4.6 5.7-8 4.9-2.4-.6-3.8-2.4-3.9-4.7z" fill="#fbf1d6"/>' +
      '</g>' +
      // pink eye, nose and whiskers
      '<circle cx="11.6" cy="19.2" r="1.25" fill="#e0457b"/>' +
      '<circle cx="8" cy="21.6" r=".8" fill="#e0457b"/>' +
      '<path d="M8.6 22.4l-4 .6M8.8 23.2l-3.6 1.8" stroke="#2b2118" stroke-width=".6" stroke-linecap="round"/>' +
      '</svg>',
  );

const ROMAN: [number, string][] = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
const roman = (n: number) => {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) (out += s), (n -= v);
  return out;
};

/** The path's shape, in a 600 x 64 box: a lazy meander. */
const pathY = (x: number) => 34 + Math.sin(x / 47) * 12 + Math.sin(x / 19 + 1) * 3;

const ARROW_L = '<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M36 13c-6-4-13-5-20-3-3 1-6 3-8 5M8 15l1-7M8 15l7 1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW_R = '<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M4 13c6-4 13-5 20-3 3 1 6 3 8 5M32 15l-1-7M32 15l-7 1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function createTrail(engine: BookEngine) {
  const x0 = 18;
  const x1 = 582;
  const xs = story.map((_, i) => x0 + (i / (PAGE_COUNT - 1)) * (x1 - x0));

  // The dotted path itself.
  let d = `M${x0} ${pathY(x0).toFixed(1)}`;
  for (let x = x0 + 6; x <= x1; x += 6) d += ` L${x} ${pathY(x).toFixed(1)}`;
  const svg = el('div', { class: 'trail__path', 'aria-hidden': 'true' });
  svg.innerHTML = `<svg viewBox="0 0 600 64" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="1 7" stroke-linecap="round"/></svg>`;

  const stops = story.map((page, i) => {
    const kind = page.n === 1 ? 'book' : page.n === PAGE_COUNT ? 'star' : ACT_KEY[page.act];
    const b = el('button', {
      class: `trail__stop trail__stop--${kind}`,
      type: 'button',
      'aria-label': `Page ${page.n}: ${page.title}`,
      'data-title': page.title,
      style: `left:${((xs[i] / 600) * 100).toFixed(2)}%;top:${((pathY(xs[i]) / 64) * 100).toFixed(2)}%`,
    });
    b.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true">${ICON[kind]}</svg>`;
    b.addEventListener('click', () => engine.goTo(page.n));
    return b;
  });

  // The Rabbit marker: the White Rabbit in a red waistcoat, running, drawn crisp enough to
  // read at this size (a printed figure this small turns to a blur).
  const rabbit = el('img', { class: 'trail__rabbit', alt: '', 'aria-hidden': 'true', src: RABBIT_SVG });

  const track = el('div', { class: 'trail__track' }, [svg, ...stops, rabbit]);
  const prev = el('button', { class: 'trail__step', type: 'button', 'aria-label': 'Previous page' });
  prev.innerHTML = ARROW_L;
  const next = el('button', { class: 'trail__step', type: 'button', 'aria-label': 'Next page' });
  next.innerHTML = ARROW_R;
  prev.addEventListener('click', () => engine.prev());
  next.addEventListener('click', () => engine.next());
  const count = el('p', { class: 'trail__count' });

  const root = el('nav', { class: 'trail', 'aria-label': 'Pages' }, [el('div', { class: 'trail__row' }, [prev, track, next]), count]);

  let at = -1;
  const place = (i: number, animate: boolean) => {
    const left = (xs[i] / 600) * 100;
    const top = (pathY(xs[i]) / 64) * 100;
    if (!animate || at < 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(rabbit, { left: `${left}%`, top: `${top}%`, y: 0 });
    } else {
      // Hop: along the path, up and down in little bounds, facing the way he goes.
      const hops = Math.max(1, Math.min(6, Math.abs(i - at)));
      gsap.set(rabbit, { scaleX: i > at ? -1 : 1 });
      gsap.to(rabbit, { left: `${left}%`, top: `${top}%`, duration: 0.35 + hops * 0.14, ease: 'power1.inOut', overwrite: 'auto' });
      gsap.fromTo(rabbit, { y: 0 }, { y: -12, duration: (0.35 + hops * 0.14) / (hops * 2), ease: 'sine.out', yoyo: true, repeat: hops * 2 - 1 });
    }
    at = i;
  };

  return {
    root,
    update(n: number) {
      const page = story[n - 1];
      stops.forEach((s, i) => {
        s.classList.toggle('is-past', i < n - 1);
        if (i === n - 1) s.setAttribute('aria-current', 'page');
        else s.removeAttribute('aria-current');
      });
      prev.disabled = n === 1;
      next.disabled = n === PAGE_COUNT;
      count.textContent = `page ${roman(n)} of ${roman(PAGE_COUNT)} · ${page.act === 'The Court and Home' ? 'The Court' : page.act}`;
      place(n - 1, true);
    },
  };
}
