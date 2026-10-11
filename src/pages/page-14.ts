import './print.css';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { curvy, handEllipse, scatter, type Seed } from '../print/brush';
import { CHESHIRE_TREE, CHESHIRE_EYES, CHESHIRE_GRIN, preload, printFigure, figurePoint } from '../print/tenniel';
import { escape } from '../print/escape';
import { sparkleStamp } from '../print/stamps';
import { music } from '../audio/music';
import { grin } from './act3';

/**
 * Page 14: the Cheshire Cat. When the page opens, the grin comes first, hanging in the
 * branches on its own; then the Cat fades in around it, Tenniel's tree and Alice with him.
 * His eyes glow and follow your cursor wherever you go. Click and the grin flashes wide;
 * a few sparks of it drift out of the book.
 */

const COPY: [number, number, number, number] = [0.58, 0.07, 0.36, 0.6];

export default () =>
  spreadPage(
    14,
    (ctx) => {
      let motes: Seed[] = [];
      let born = 0;
      let flash = -9;
      preload(CHESHIRE_TREE);

      const fig = (f: PrintFrame) => (f.wide ? { x: f.w * 0.27, y: f.h * 0.99, h: f.h * 0.96 } : { x: f.w * 0.42, y: f.h * 0.48, h: f.h * 0.46 });
      const at = (f: PrintFrame, p: [number, number]) => {
        const g = fig(f);
        const q = figurePoint(CHESHIRE_TREE, g.h, p[0], p[1]);
        return q ? { x: g.x + q[0], y: g.y + q[1], k: g.h / CHESHIRE_TREE.sourceH } : null;
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.6,
        copy: COPY,
        layout(f) {
          motes = scatter(f.w, f.h, 22, () => true, 141);
        },
        enter() {
          born = performance.now() / 1000;
        },
        click(_x, _y, f) {
          flash = f.t;
          music.chime(4, 1);
          setTimeout(() => music.chime(6, 1), 120);
          const g = at(f, CHESHIRE_GRIN);
          if (!g) return;
          const v = f.toViewport(g.x, g.y);
          for (let i = 0; i < 6; i++) escape.launch(sparkleStamp(i % 2 ? 1 : 0), v.x, v.y, { size: 16 + Math.random() * 14, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 160, ay: 120, drag: 0.7, fade: 0.45, vr: (Math.random() - 0.5) * 6 });
        },
        draw(f) {
          const { press, w, h, t, boil, pointer } = f;
          const s = boil % 3;
          const since = ctx.reducedMotion ? 9 : performance.now() / 1000 - born;
          // First the grin alone (0 to 1.2s), then the rest of him fades in around it.
          const body = Math.max(0, Math.min(1, (since - 1.2) / 1.8));

          // A shadowy wood, deep greens and violet, with drifting light.
          const air = new Path2D();
          air.rect(0, 0, w, h);
          press.fill(air, { a: 0.4, b: 0.22, c: 0.3 });
          const dust = new Path2D();
          for (const m of motes) {
            const mx = m.x + Math.sin(t * 0.3 + m.r * 9) * 10;
            const my = m.y + Math.cos(t * 0.25 + m.r * 7) * 8;
            curvy(handEllipse(mx, my, 1.4 + m.r, 1.4 + m.r, Math.floor(m.r * 30), 0.2), dust);
          }
          press.knock(dust);
          press.fill(dust, { c: 0.35 }, { over: true });

          const g = fig(f);
          press.with({ x: g.x, y: g.y }, () => printFigure(press, CHESHIRE_TREE, g.h, boil, {}, body));

          // The grin, which comes first and stays last.
          const gp = at(f, CHESHIRE_GRIN);
          if (gp) {
            const glow = Math.max(0, 1 - (t - flash) / 0.6);
            const appear = Math.min(1, since / 0.8);
            if (body < 0.98) grin(press, gp.x, gp.y, 62 * gp.k * appear * (1 + glow * 0.25), s, glow);
          }

          // His eyes glow, and follow you.
          // He watches the cursor wherever it goes, in the book or out of it in the room.
          const seen = pointer.rx > -9000;
          const ex = seen ? pointer.x : w * 0.75;
          const ey = seen ? pointer.y : h * 0.5;
          for (const [i, e] of CHESHIRE_EYES.entries()) {
            const p = at(f, e);
            if (!p) continue;
            const open = Math.max(0, Math.min(1, (since - 0.6) / 0.6));
            if (open <= 0) continue;
            const blink = (t + i * 0.05) % 5.3 < 0.12 ? 0.15 : 1;
            const rx = 15 * p.k * 1.4;
            const ry = 8 * p.k * 1.4 * open * blink;
            const eye = curvy(handEllipse(p.x, p.y, rx, ry, 30 + i, 0.3, (i ? -1 : 1) * 0.15));
            press.knock(eye);
            press.fill(eye, { c: 1, b: 0.15 });
            const dx = Math.max(-1, Math.min(1, (ex - p.x) / (w * 0.3)));
            const dy = Math.max(-1, Math.min(1, (ey - p.y) / (h * 0.3)));
            press.fill(curvy(handEllipse(p.x + dx * rx * 0.45, p.y + dy * ry * 0.35, rx * 0.16, Math.max(0.5, ry * 0.85), 40 + i, 0.2)), { a: 1, b: 1, c: 0.6 });
          }
        },
      });
    },
    { copy: COPY },
  );
