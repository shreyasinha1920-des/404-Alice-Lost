import { stamp } from '../print/escape';
import { ribbon, curvy, wobble, handEllipse, rng, dab, type Pt } from '../print/brush';
import type { Tones } from '../print/press';

/**
 * The hall's four real doors (page 6), printed in the same riso inks as the pictures:
 * a hand-drawn arch, overprinted planks, iron straps and rivets, a candlelit keyhole,
 * a cobwebbed doorway, and, in the peephole, eyes. Each part is printed once as a small
 * sprite; the DOM only stacks and animates them (the leaf swings, the eyes blink).
 *
 * Every sprite is drawn in the same 120 x 120 box, the door standing in its middle.
 */

const C = 60;
const HALF = 33;
const TOP = 3;
const BOTTOM = 118;

/** The door's arch outline, grown by `pad`. */
const arch = (pad = 0): Pt[] => {
  const r = HALF + pad;
  const top = TOP - pad + r;
  const pts: Pt[] = [[C - r, BOTTOM + pad]];
  for (let k = 0; k <= 12; k++) {
    const a = Math.PI + (k / 12) * Math.PI;
    pts.push([C + Math.cos(a) * r, top + Math.sin(a) * r]);
  }
  pts.push([C + r, BOTTOM + pad]);
  return pts;
};

/** Each door is a different old wood, all of it dark. */
const WOODS: Tones[] = [
  { a: 0.62, c: 0.6 }, // verdigris
  { b: 0.72, a: 0.42 }, // madder
  { c: 0.8, b: 0.42, a: 0.18 }, // ochre
  { a: 0.72, b: 0.22 }, // slate
];
/** Doors print on a finer screen than the pictures, so their thin lines survive at this size. */
const PITCH = 2.1;

/** The doorway: darkness beyond, a stone surround, and a cobweb in the corner. */
export const doorwayPrint = (i: number) =>
  stamp(`doorway${i}`, (p) => {
    const surround = curvy(wobble(arch(4), true, 0.9, 3 + i, 4));
    p.fill(surround, { a: 1, b: 0.9, c: 0.75 });
    p.fill(ribbon(arch(4), { closed: true, w: 2.4, rough: 0.5, amt: 1, seed: 4 + i }), { a: 1, b: 1, c: 1 }, { over: true });
  }, PITCH);

/** A cobweb strung across the doorway's top corner, in front of the door (it stays put when the door swings). */
export const doorWebPrint = (i: number) =>
  stamp(`door-web${i}`, (p) => {
    // a cobweb strung across the top corner, pale against the dark
    const web = new Path2D();
    const side = i % 2 ? 1 : -1;
    const cx = C + side * (HALF + 2);
    const cy = TOP + 6;
    const R = 26;
    const spokes: Pt[] = [];
    for (let k = 0; k <= 4; k++) {
      const a = (k / 4) * (Math.PI / 2);
      spokes.push([cx - side * Math.cos(a) * R, cy + Math.sin(a) * R]);
      ribbon([[cx, cy], spokes[k]], { w: 1.1, taper: 0.4, amt: 0.4, seed: 10 + k }, web);
    }
    for (const q of [0.35, 0.62, 0.9]) {
      const ring: Pt[] = spokes.map(([x, y]) => [cx + (x - cx) * q, cy + (y - cy) * q + 1.5 * q]);
      ribbon(ring, { w: 0.9, taper: 0.2, amt: 0.6, seed: 20 + q * 10 }, web);
    }
    p.fill(web, { a: 1, b: 0.55 });
  }, PITCH);

/** Light from beyond, seen when the door swings open. */
export const doorLightPrint = () =>
  stamp('door-light', (p) => {
    p.fill(curvy(wobble(arch(-2), true, 0.6, 7, 4)), { c: 0.95, b: 0.3 });
    p.knock(curvy(handEllipse(C, 82, 18, 26, 8, 2)));
    p.fill(curvy(handEllipse(C, 82, 18, 26, 8, 2)), { c: 0.35 });
  }, PITCH);

/** The door itself. */
export const doorLeafPrint = (i: number) =>
  stamp(`door-leaf${i}`, (p) => {
    const R = rng(31 + i);
    const shape = curvy(wobble(arch(), true, 0.7, 30 + i, 4));
    p.fill(shape, WOODS[i % WOODS.length]);
    // seams between the planks, and the grain
    const seams = new Path2D();
    for (const x of [C - 16, C, C + 16]) ribbon([[x, TOP + 10], [x + (R() - 0.5) * 1.5, BOTTOM - 1]], { w: 1.8, taper: 0.2, amt: 0.4, seed: x }, seams);
    const grain = new Path2D();
    for (let k = 0; k < 46; k++) dab(grain, C - HALF + 4 + R() * (HALF * 2 - 8), TOP + 18 + R() * (BOTTOM - TOP - 22), Math.PI / 2 + (R() - 0.5) * 0.15, 6 + R() * 10, 0.7, 0.3);
    p.fill(seams, { a: 1, b: 0.85 }, { over: true });
    p.fill(grain, { a: 0.95, b: 0.6 }, { over: true });
    // iron straps, with rivets
    const straps = new Path2D();
    const rivets = new Path2D();
    for (const y of [50, 98]) {
      ribbon([[C - HALF + 1, y], [C + HALF - 1, y + (R() - 0.5) * 2]], { w: 4.5, taper: 0.05, rough: 0.5, amt: 0.6, seed: y }, straps);
      for (let k = 0; k < 5; k++) curvy(handEllipse(C - HALF + 7 + k * 13, y, 1.4, 1.4, y + k, 0.2), rivets);
    }
    p.fill(straps, { a: 1, b: 0.9 });
    p.knock(rivets);
    p.fill(rivets, { c: 0.55, b: 0.2 });
    // the peephole, dark (the eyes are printed separately, so they can blink)
    p.fill(curvy(handEllipse(C, 30, 11, 11, 40 + i, 0.5)), { a: 1, b: 1, c: 1 });
    p.fill(ribbon(handEllipse(C, 30, 12.5, 12.5, 41 + i, 0.6), { closed: true, w: 1.6, rough: 0.4, seed: 42 }), { c: 0.7, b: 0.3 }, { over: true });
    // an iron ring for a handle, and a keyhole with candlelight behind it
    p.fill(ribbon(handEllipse(C + 21, 72, 5.5, 6, 43 + i, 0.4), { closed: true, w: 1.6, rough: 0.4, seed: 44 }), { a: 1, b: 0.8, c: 0.6 });
    const key: Pt[] = [[C + 20, 81], [C + 23, 81], [C + 24, 84], [C + 22.5, 86], [C + 24, 92], [C + 19, 92], [C + 20.5, 86], [C + 19, 84]];
    p.knock(curvy(key));
    p.fill(curvy(key), { c: 1, b: 0.3 });
    // the outline, drawn last and boldly
    p.fill(ribbon(arch(), { closed: true, w: 2.2, rough: 0.5, amt: 0.8, seed: 50 + i }), { a: 1, b: 0.9, c: 0.6 }, { over: true });
  }, PITCH);

/** Two yellow eyes with slit pupils, for the peephole. */
export const doorEyesPrint = () =>
  stamp('door-eyes', (p) => {
    for (const side of [-1, 1]) {
      const x = C + side * 27;
      const eye = curvy(handEllipse(x, C, 23, 14, 60 + side, 0.6, side * 0.25));
      p.knock(eye);
      p.fill(eye, { c: 1 });
      p.fill(curvy(handEllipse(x, C, 4.5, 12, 62 + side, 0.3)), { a: 1, b: 1, c: 1 });
      p.knock(curvy(handEllipse(x - 8, C - 5, 3, 2.4, 64 + side, 0.2)));
    }
  }, PITCH);

/** A sprite as an <img>, for the DOM (the same printed canvas can't sit in two places). */
export function printedImg(cv: HTMLCanvasElement | null, cls: string) {
  const img = document.createElement('img');
  img.className = cls;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.draggable = false;
  if (cv) img.src = cv.toDataURL();
  return img;
}
