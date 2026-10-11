import gsap from 'gsap';
import { curvy, wobble, handEllipse, ribbon, type Pt } from '../print/brush';
import { stamp } from '../print/escape';
import type { Press, Tones } from '../print/press';

/** Shared bits for Act 2, Wrong Sizes (pages 7 to 11). */

/** A chequered floor, drawn by hand in perspective, from `top` to `bottom`. */
export function floor(press: Press, w: number, top: number, bottom: number, s: number, tones: Tones = { a: 0.5, b: 0.42, c: 0.3 }) {
  const rows = 6;
  const vx = w * 0.5;
  const cols = 9;
  const dark = new Path2D();
  for (let r = 0; r < rows; r++) {
    const y0 = top + (bottom - top) * Math.pow(r / rows, 1.4);
    const y1 = top + (bottom - top) * Math.pow((r + 1) / rows, 1.4);
    for (let c = -cols; c < cols; c++) {
      if ((r + c) % 2) continue;
      const xa = (k: number, y: number) => vx + (k / cols) * w * 1.4 * ((y - top) / (bottom - top) + 0.35);
      const quad: Pt[] = [[xa(c, y0), y0], [xa(c + 1, y0), y0], [xa(c + 1, y1), y1], [xa(c, y1), y1]];
      curvy(wobble(quad, true, 0.6, r * 31 + c + s, 6), dark);
    }
  }
  press.fill(dark, tones);
}

/** A drop of liquid (potion, tears, pool water), printed once per colour. */
export const dropStamp = (key: string, tones: Tones) =>
  stamp(`drop-${key}`, (p, S) => {
    const c = S / 2;
    const drop: Pt[] = [[c, c - 30], [c + 14, c + 2], [c + 12, c + 18], [c, c + 26], [c - 12, c + 18], [c - 14, c + 2]];
    p.fill(curvy(wobble(drop, true, 1, 3, 4)), tones);
    p.knock(curvy(handEllipse(c - 5, c + 6, 3, 6, 4, 0.2)));
  });

/** A crumb of cake, or a comfit: a little lumpy sweet. */
export const crumbStamp = (v = 0) =>
  stamp(`crumb${v}`, (p, S) => {
    const c = S / 2;
    const tones = [{ c: 0.9, b: 0.35 }, { b: 0.8 }, { a: 0.7, c: 0.3 }, { c: 1 }][v % 4];
    p.fill(curvy(handEllipse(c, c, S * 0.3, S * 0.24, 20 + v, 3, v)), tones);
    p.fill(ribbon(handEllipse(c, c, S * 0.3, S * 0.24, 20 + v, 3, v), { closed: true, w: 2.4, rough: 0.4, seed: v }), { a: 0.9, b: 0.7 }, { over: true });
    p.knock(curvy(handEllipse(c - S * 0.1, c - S * 0.08, S * 0.06, S * 0.04, 30 + v, 0.5)));
  });

/** A puff of smoke (v 0, 1) or sandy dust (v 2, 3). */
export const puffStamp = (v = 0) =>
  stamp(`puff${v}`, (p, S) => {
    const c = S / 2;
    p.fill(curvy(handEllipse(c, c, S * 0.36, S * 0.3, 40 + v, 9)), v >= 2 ? { c: 0.3, b: 0.12, a: 0.1 } : { a: 0.22, b: 0.12, c: 0.1 });
    p.fill(curvy(handEllipse(c - S * 0.1, c - S * 0.06, S * 0.18, S * 0.14, 50 + v, 3)), { a: 0.1, c: 0.08 });
  });

/** Give the whole book a little shake, as if something big moved inside it. */
export function shakeBook(strength = 1, reduced = false) {
  if (reduced) return;
  const book = document.querySelector<HTMLElement>('.book');
  if (!book) return;
  gsap.fromTo(
    book,
    { x: 0, rotation: 0 },
    {
      keyframes: [
        { x: -6 * strength, rotation: -0.6 * strength, duration: 0.07 },
        { x: 5 * strength, rotation: 0.5 * strength, duration: 0.07 },
        { x: -3 * strength, rotation: -0.3 * strength, duration: 0.07 },
        { x: 2 * strength, rotation: 0.2 * strength, duration: 0.07 },
        { x: 0, rotation: 0, duration: 0.1 },
      ],
      overwrite: 'auto',
      onComplete: () => gsap.set(book, { clearProps: 'transform,translate,rotate' }),
    },
  );
}
