import { stamp } from './escape';
import { ribbon, curvy, wobble, dab, handEllipse, type Pt } from './brush';
import { printProp, printKey, type Prop } from './props';

/** Printed sprites for things that leave the book, each made once. */

export const leafStamp = (v = 0) =>
  stamp(`leaf${v}`, (p, S) => {
    const c = S / 2;
    const leaf: Pt[] = [[c - 34, c], [c - 10, c - 13], [c + 30, c - 4], [c + 36, c], [c + 30, c + 4], [c - 10, c + 13]];
    p.fill(curvy(wobble(leaf, true, 1.4, 5 + v, 5)), v % 2 ? { a: 0.4, c: 1 } : { a: 0.85, c: 1 });
    p.fill(ribbon([[c - 32, c], [c + 30, c - 1]], { w: 2, taper: 0.3, amt: 0.5, seed: 7 + v }), { a: 1, c: 0.8 }, { over: true });
  });

export const dashStamp = (v = 0) =>
  stamp(`dash${v}`, (p, S) => {
    const path = new Path2D();
    dab(path, S / 2, S / 2, 0, S * 0.7, 6, 7);
    p.fill(path, v % 2 ? { a: 1 } : { a: 0.7, b: 0.5 });
  });

export const moteStamp = () =>
  stamp('mote', (p, S) => {
    const c = S / 2;
    const glow = new Path2D();
    glow.arc(c, c, S * 0.42, 0, Math.PI * 2);
    p.fill(glow, { c: (g) => { const gr = g.createRadialGradient(c, c, 0, c, c, S * 0.42); gr.addColorStop(0, 'rgb(230,230,230)'); gr.addColorStop(1, 'rgb(0,0,0)'); return gr; } });
    p.fill(curvy(handEllipse(c, c, 7, 7, 3, 0.4)), { c: 1, b: 0.35 });
  });

export const sparkleStamp = (v = 0) =>
  stamp(`sparkle${v}`, (p, S) => {
    const c = S / 2;
    const r = S * 0.42;
    const pts: Pt[] = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 ? r * 0.22 : r;
      pts.push([c + Math.cos(a) * rr, c + Math.sin(a) * rr]);
    }
    p.fill(curvy(wobble(pts, true, 1, 9 + v, 4)), [{ c: 1 }, { b: 1 }, { a: 0.8 }][v % 3]);
  });

export const propStamp = (kind: Prop, tones: Parameters<typeof printProp>[2], v = 0) =>
  stamp(`prop-${kind}-${v}`, (p, S) => {
    p.with({ x: S / 2, y: S / 2, s: S / 64 }, () => printProp(p, kind, tones, 0));
  });

export const keyStamp = () =>
  stamp('key', (p, S) => {
    p.with({ x: S / 2, y: S / 2, s: S / 64 }, () => printKey(p, 0));
  });
