import './print.css';
import { spreadPage } from './art';
import { brokenPath } from '../engine/dom';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, wobble, handEllipse, rng, type Pt } from '../print/brush';
import { HERALD, HERALD_SCROLL, HERALD_TRUMPET, preload, printFigure, figurePoint } from '../print/tenniel';
import { escape, stamp } from '../print/escape';
import { music } from '../audio/music';
import type { Press } from '../print/press';

/**
 * Page 20: the trial. The White Rabbit, herald of the court, blows his trumpet and unrolls
 * his scroll, and the scroll unrolls right across the gutter: the evidence, read into the
 * record, is the very link that brought the reader here. Below it, the jury of creatures
 * scribble on their slates, rub out, and scribble again. Click the trumpet (or anywhere)
 * and he sounds it again: musical notes fly out of the book.
 */

const COPY: [number, number, number, number] = [0.58, 0.05, 0.36, 0.38];

const noteStamp = (v: number) =>
  stamp(`note${v}`, (p, S) => {
    const c = S / 2;
    p.fill(curvy(handEllipse(c - 8, c + 18, 12, 9, 3 + v, 0.6, -0.4)), v % 2 ? { a: 1, b: 0.8 } : { b: 1, c: 0.3 });
    p.fill(ribbon([[c + 3, c + 16], [c + 4, c - 26]], { w: 3.4, taper: 0.1, amt: 0.3, seed: v }), { a: 1, b: 0.8 });
    if (v % 3) p.fill(ribbon([[c + 4, c - 26], [c + 18, c - 16], [c + 16, c - 6]], { w: 3, taper: 0.4, amt: 0.4, seed: v + 1 }), { a: 1, b: 0.8 });
  });

export default () =>
  spreadPage(
    20,
    (ctx) => {
      let born = 0;
      let blast = -9;
      const evidence = `Exhibit A: ${brokenPath(40)}`;
      preload(HERALD);

      const fig = (f: PrintFrame) => (f.wide ? { x: f.w * 0.24, y: f.h * 0.97, h: f.h * 0.9 } : { x: f.w * 0.32, y: f.h * 0.47, h: f.h * 0.42 });
      const at = (f: PrintFrame, p: [number, number]) => {
        const g = fig(f);
        const q = figurePoint(HERALD, g.h, p[0], p[1]);
        return q ? { x: g.x + q[0], y: g.y + q[1] } : null;
      };

      const toot = (f: PrintFrame) => {
        blast = f.t;
        [7, 9, 11, 14].forEach((d, i) => setTimeout(() => music.chime(d, 0), i * 100));
        const tr = at(f, HERALD_TRUMPET);
        if (!tr) return;
        const v = f.toViewport(tr.x, tr.y);
        for (let i = 0; i < 6; i++) escape.launch(noteStamp(i), v.x, v.y, { size: 22 + Math.random() * 10, vx: -140 - Math.random() * 160, vy: -80 - Math.random() * 120, ay: 40, flutter: 30, vr: (Math.random() - 0.5) * 2, drag: 0.8, fade: 0.35 });
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.6,
        copy: COPY,
        layout() {},
        enter() {
          born = performance.now() / 1000;
        },
        click(_x, _y, f) {
          toot(f);
        },
        draw(f) {
          const { press, w, h, t, boil } = f;
          const s = boil % 3;
          const since = ctx.reducedMotion ? 9 : performance.now() / 1000 - born;

          // The court: a panelled wall in pink, a floor in shadow.
          const air = new Path2D();
          air.rect(0, 0, w, h);
          press.fill(air, { b: 0.18, c: 0.1 });
          const panels = new Path2D();
          for (let i = 0; i < 9; i++) ribbon([[w * (i / 9 + 0.05), h * 0.05], [w * (i / 9 + 0.05), h * 0.62]], { w: 2, taper: 0.1, amt: 0.6, seed: i + s }, panels);
          press.fill(panels, { b: 0.45, a: 0.2 }, { over: true });
          const floor = new Path2D();
          floor.rect(0, h * (f.wide ? 0.66 : 0.34), w, h);
          press.fill(floor, { a: 0.3, b: 0.3, c: 0.2 }, { over: true });

          // The herald, a little puffed when he blows.
          const g = fig(f);
          const puff = Math.max(0, 1 - (t - blast) / 0.6);
          press.with({ x: g.x, y: g.y, s: 1 + puff * 0.02 }, () => printFigure(press, HERALD, g.h, boil));

          // The scroll unrolls from his hand across the gutter: the evidence.
          const sc = at(f, HERALD_SCROLL);
          if (sc) {
            const open = Math.min(1, Math.max(0, (since - 0.8) / 1.6));
            const ease = 1 - Math.pow(1 - open, 3);
            const x1 = sc.x + (w * 0.95 - sc.x) * ease;
            // the scroll falls open below the words, so the evidence can be read
            const sy = f.wide ? Math.max(sc.y, h * 0.64) : sc.y;
            scroll(press, sc.x, sy, x1, f.wide ? h * 0.12 : h * 0.06, s);
            if (open > 0.6) {
              const k = Math.min(1, (open - 0.6) / 0.4);
              const size = Math.round(f.wide ? h * 0.034 : h * 0.02);
              press.text(evidence, (sc.x + x1) / 2 + size, sy + size * 0.35, `italic ${size}px "IM Fell English", Georgia, serif`, { a: 1 * k, b: 0.8 * k });
            }
          }

          // The jury, scribbling on their slates.
          if (f.wide) jury(press, w * 0.56, h * 0.75, w * 0.4, h * 0.22, t, s);
        },
      });
    },
    { copy: COPY },
  );

/** A parchment scroll, rolled at both ends, from x0 to x1, `hgt` tall, centred at y. */
function scroll(press: Press, x0: number, y: number, x1: number, hgt: number, s: number) {
  if (x1 - x0 < 4) return;
  const top = y - hgt / 2;
  const sheet: Pt[] = [[x0, top], [x1, top + 2], [x1, top + hgt], [x0, top + hgt - 2]];
  const shape = curvy(wobble(sheet, true, 0.6, 3 + s, 6));
  press.knock(shape);
  press.fill(shape, { c: 0.2, b: 0.05 });
  press.fill(ribbon(sheet, { closed: true, w: 1.6, rough: 0.4, amt: 0.6, seed: 4 + s }), { a: 0.9, b: 0.7 }, { over: true });
  for (const x of [x0, x1]) {
    const roll = curvy(handEllipse(x, y, hgt * 0.16, hgt * 0.56, 5 + Math.round(x), 0.5));
    press.knock(roll);
    press.fill(roll, { c: 0.35, b: 0.12 });
    press.fill(ribbon(handEllipse(x, y, hgt * 0.16, hgt * 0.56, 6 + Math.round(x), 0.5), { closed: true, w: 1.4, amt: 0.4, seed: 7 }), { a: 0.9, b: 0.7 }, { over: true });
  }
}

/** Twelve jurors' slates in two rows; each scribble writes itself, then is rubbed out and begun again. */
function jury(press: Press, x: number, y: number, wd: number, ht: number, t: number, s: number) {
  const cols = 6;
  const rows = 2;
  const sw = (wd / cols) * 0.8;
  const sh = (ht / rows) * 0.62;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cx = x + (c + 0.5) * (wd / cols) + (r ? wd / cols / 2 : 0) - wd / cols / 4;
      const cy = y + (r + 0.5) * (ht / rows);
      const slate: Pt[] = [[cx - sw / 2, cy - sh / 2], [cx + sw / 2, cy - sh / 2], [cx + sw / 2, cy + sh / 2], [cx - sw / 2, cy + sh / 2]];
      press.fill(curvy(wobble(slate, true, 0.5, 20 + i, 4)), { a: 0.85, b: 0.7, c: 0.75 });
      press.fill(ribbon(slate, { closed: true, w: 2.4, rough: 0.4, amt: 0.4, seed: 30 + i }), { c: 0.6, b: 0.4 }, { over: true });
      // the scribble, written in chalk, a little further every moment
      const cycle = (t * 0.45 + i * 0.37) % 1;
      const R = rng(100 + i + Math.floor(t * 0.45 + i * 0.37) * 13);
      const pts: Pt[] = [];
      for (let k = 0; k < 14; k++) pts.push([cx - sw * 0.38 + (k / 13) * sw * 0.76, cy - sh * 0.25 + (R() - 0.5) * sh * 0.5 + (k % 4 === 3 ? sh * 0.25 : 0)]);
      const n = Math.max(2, Math.floor(pts.length * Math.min(1, cycle * 1.4)));
      if (cycle < 0.85) press.knock(ribbon(pts.slice(0, n), { w: 1.4, taper: 0.2, amt: 0.4, seed: i + s }));
    }
  }
}
