import './print.css';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, handEllipse, dab, scatter, type Pt, type Seed } from '../print/brush';
import { GARDENERS, ROSES, preload, printFigure, figurePoint } from '../print/tenniel';
import { escape } from '../print/escape';
import { sparkleStamp } from '../print/stamps';
import { music } from '../audio/music';
import { dropStamp } from './act2';
import type { Press } from '../print/press';

/**
 * Page 18: painting the roses. Tenniel's three card-gardeners stand round a rose tree,
 * brushes and paint pot in hand: they planted a white tree by mistake, and the Queen is
 * coming. The roses are white. Brush your cursor over each one and it is painted red, one
 * stroke at a time; a finished rose drips paint out of the book. Paint them all and the
 * tree sparkles: just in time.
 */

const COPY: [number, number, number, number] = [0.58, 0.06, 0.36, 0.5];

export default () =>
  spreadPage(
    18,
    (ctx) => {
      let grass: Seed[] = [];
      // How painted each rose is, 0 (white) to 1 (red), in strokes of a quarter.
      const paint = ROSES.map(() => 0);
      let allDone = false;
      preload(GARDENERS);

      const fig = (f: PrintFrame) => (f.wide ? { x: f.w * 0.27, y: f.h * 0.985, h: f.h * 0.93 } : { x: f.w * 0.5, y: f.h * 0.48, h: f.h * 0.45 });
      const roseAt = (f: PrintFrame, i: number) => {
        const g = fig(f);
        const [px, py, pr] = ROSES[i];
        const p = figurePoint(GARDENERS, g.h, px, py);
        return p ? { x: g.x + p[0], y: g.y + p[1], r: pr * (g.h / GARDENERS.sourceH) } : null;
      };

      const finished = (f: PrintFrame, x: number, y: number) => {
        music.chime(Math.floor(Math.random() * 3) + 4, 1);
        const v = f.toViewport(x, y);
        for (let i = 0; i < 4; i++) escape.launch(dropStamp('rose-paint', { b: 1, c: 0.35 }), v.x, v.y, { size: 12 + Math.random() * 8, vx: (Math.random() - 0.5) * 120, vy: 40 + Math.random() * 80, ay: 700, drag: 0.6, fade: 0.5 });
        if (!allDone && paint.every((p) => p >= 1)) {
          allDone = true;
          [0, 2, 4, 7, 9].forEach((d, i) => setTimeout(() => music.chime(d, 1), 200 + i * 90));
          for (let i = 0; i < 12; i++) escape.launch(sparkleStamp(i % 3), v.x, v.y, { size: 16 + Math.random() * 16, vx: (Math.random() - 0.5) * 400, vy: -150 - Math.random() * 250, ay: 200, drag: 0.6, fade: 0.45 });
        }
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.6,
        copy: COPY,
        layout(f) {
          grass = scatter(f.w, f.h, 9, (_x, y) => y > f.h * (f.wide ? 0.78 : 0.4) && y < (f.wide ? f.h : f.h * 0.5), 181);
        },
        click(x, y, f) {
          // A click paints too (for touch).
          for (let i = 0; i < ROSES.length; i++) {
            const r = roseAt(f, i);
            if (!r || paint[i] >= 1) continue;
            if (Math.hypot(x - r.x, y - r.y) < r.r * 1.6) {
              paint[i] = Math.min(1, paint[i] + 0.25);
              music.chime(i, 0);
              if (paint[i] >= 1) finished(f, r.x, r.y);
            }
          }
        },
        draw(f) {
          const { press, w, h, t, dt, boil, pointer } = f;
          const s = boil % 3;

          // The Queen's garden: a clipped lawn, box hedges, summer air.
          const air = new Path2D();
          air.rect(0, 0, w, h);
          press.fill(air, { c: 0.22, a: 0.08 });
          const lawn = new Path2D();
          lawn.rect(0, h * (f.wide ? 0.78 : 0.4), w, h);
          press.fill(lawn, { a: 0.3, c: 0.6 }, { over: true });
          const blades = new Path2D();
          for (const g of grass) ribbon([[g.x, g.y + 8], [g.x + Math.sin(t + g.x) * 2, g.y - 8 - g.r * 10]], { w: 1.6, taper: 0.9, amt: 0.3, seed: Math.floor(g.r * 50) }, blades);
          press.fill(blades, { a: 0.7, c: 0.9 }, { over: true });
          if (f.wide) {
            // a row of clipped hedges along the right page's foot, and a painted card soldier's spear
            const hedge = new Path2D();
            for (let i = 0; i < 6; i++) curvy(handEllipse(w * (0.6 + i * 0.075), h * 0.8, w * 0.045, h * 0.07, 70 + i, 3), hedge);
            press.fill(hedge, { a: 0.6, c: 0.85 });
          }

          const g = fig(f);
          press.with({ x: g.x, y: g.y }, () => printFigure(press, GARDENERS, g.h, boil));

          // The roses: white until painted, a stroke at a time, as your brush passes over.
          for (let i = 0; i < ROSES.length; i++) {
            const r = roseAt(f, i);
            if (!r) continue;
            if (pointer.inside && paint[i] < 1 && Math.hypot(pointer.x - r.x, pointer.y - r.y) < r.r * 1.5 && pointer.speed > 40) {
              const before = Math.floor(paint[i] * 4);
              paint[i] = Math.min(1, paint[i] + dt * 1.1);
              if (Math.floor(paint[i] * 4) > before) music.chime(i, 0);
              if (paint[i] >= 1) finished(f, r.x, r.y);
            }
            rose(press, r.x, r.y, r.r, paint[i], s + i, t);
          }
        },
      });
    },
    { copy: COPY },
  );

/** A rose: white petals, with red painted on in up to four brush strokes. */
function rose(press: Press, x: number, y: number, r: number, painted: number, s: number, t: number) {
  const bloom = curvy(handEllipse(x, y, r, r * 0.92, 40 + s, r * 0.08));
  press.knock(bloom);
  press.fill(bloom, { c: 0.08 });
  const strokes = Math.floor(painted * 4 + 0.001);
  if (strokes > 0) {
    const red = new Path2D();
    for (let k = 0; k < strokes; k++) {
      const a = k * 1.6 + 0.4;
      const pts: Pt[] = [[x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8], [x, y], [x - Math.cos(a + 0.3) * r * 0.75, y - Math.sin(a + 0.3) * r * 0.75]];
      ribbon(pts, { w: r * 0.9, taper: 0.3, amt: 0.4, seed: 50 + k + s }, red);
    }
    press.clip(bloom, () => press.fill(red, { b: 1, c: 0.4 }));
    if (strokes >= 4) press.fill(bloom, { b: 1, c: 0.35 });
  }
  // the petals' spiral, drawn on top
  const spiral: Pt[] = [];
  for (let k = 0; k < 26; k++) {
    const a = k * 0.5 + t * 0.05;
    const rr = r * 0.8 * (1 - k / 30);
    spiral.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  press.fill(ribbon(spiral, { w: Math.max(1, r * 0.08), taper: 0.4, amt: 0.4, seed: 60 + s }), { a: 1, b: 0.8 }, { over: true });
  // a fresh drip while it's wet
  if (painted > 0 && painted < 1) {
    const drip = new Path2D();
    dab(drip, x + r * 0.2, y + r * 1.1, Math.PI / 2, r * 0.5, r * 0.12, 0);
    press.fill(drip, { b: 0.9, c: 0.3 }, { over: true });
  }
}
