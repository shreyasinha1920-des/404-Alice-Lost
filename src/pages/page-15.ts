import './print.css';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { curvy, handEllipse, scatter, type Seed } from '../print/brush';
import { GRIN, preload, printFigure, figurePoint } from '../print/tenniel';
import { escape } from '../print/escape';
import { sparkleStamp } from '../print/stamps';
import { music } from '../audio/music';
import type { Press } from '../print/press';
import { grin } from './act3';

/**
 * Page 15: "We're all mad here." Tenniel's Cat lies along his bough. Hover over the
 * picture and he vanishes quite slowly, as Carroll has it, beginning with the end of the
 * tail and ending with the grin, which stays some time after the rest of him has gone
 * (it glows a little, all alone). Click and he comes back, all at once.
 */

const COPY: [number, number, number, number] = [0.6, 0.05, 0.34, 0.3];

/** The Cat, in plate 24's coordinates: the soft pieces he vanishes in, tail first. */
const PIECES: { c: [number, number]; r: [number, number]; from: number }[] = [
  { c: [770, 200], r: [86, 110], from: 0 }, // tail and hindquarters
  { c: [640, 195], r: [84, 104], from: 0.25 }, // body
  { c: [482, 190], r: [102, 100], from: 0.52 }, // head (all but the grin)
];
const GRIN_AT = { x: 505, y: 246, rx: 74, ry: 34 };

export default () =>
  spreadPage(
    15,
    (ctx) => {
      let motes: Seed[] = [];
      // 0: all of him. 1: only the grin.
      let gone = 0;
      let returning = false;
      preload(GRIN);

      const fig = (f: PrintFrame) => (f.wide ? { x: f.w * 0.4, y: f.h * 0.985, h: f.h * 0.62 } : { x: f.w * 0.5, y: f.h * 0.47, h: f.h * 0.3 });

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.6,
        copy: COPY,
        layout(f) {
          motes = scatter(f.w, f.h, 26, () => true, 151);
        },
        leave() {
          gone = 0;
          returning = false;
        },
        click(_x, _y, f) {
          if (gone < 0.05) return music.chime(1, 0);
          returning = true;
          music.chime(7, 1);
          const g = fig(f);
          const q = figurePoint(GRIN, g.h, GRIN_AT.x, GRIN_AT.y);
          if (!q) return;
          const v = f.toViewport(g.x + q[0], g.y + q[1]);
          for (let i = 0; i < 5; i++) escape.launch(sparkleStamp(i % 3), v.x, v.y, { size: 14 + Math.random() * 12, vx: (Math.random() - 0.5) * 200, vy: -80 - Math.random() * 120, ay: 80, drag: 0.7, fade: 0.5 });
        },
        draw(f) {
          const { press, w, h, t, dt, boil, pointer } = f;
          // Hovering makes him vanish (slowly); a click brings him back (quickly).
          if (returning) {
            gone = Math.max(0, gone - dt * 1.6);
            if (gone === 0) returning = false;
          } else if (pointer.inside && !ctx.reducedMotion) gone = Math.min(1, gone + dt * 0.28);
          else if (pointer.inside) gone = 1;

          const air = new Path2D();
          air.rect(0, 0, w, h);
          press.fill(air, { a: 0.34, b: 0.18, c: 0.32 });
          const dust = new Path2D();
          for (const m of motes) curvy(handEllipse(m.x + Math.sin(t * 0.3 + m.r * 9) * 9, m.y + Math.cos(t * 0.2 + m.r * 5) * 7, 1.3 + m.r, 1.3 + m.r, Math.floor(m.r * 30), 0.2), dust);
          press.knock(dust);
          press.fill(dust, { c: 0.3 }, { over: true });

          const g = fig(f);
          const P = (x: number, y: number) => figurePoint(GRIN, g.h, x, y);
          if (!P(0, 0)) return;
          const k = g.h / GRIN.sourceH;
          const gc = P(GRIN_AT.x, GRIN_AT.y)!;

          press.with({ x: g.x, y: g.y }, () => {
            printFigure(press, GRIN, g.h, boil);
            // Each piece of the Cat fades out in its turn, tail first, into a soft, feathered
            // wash of the wood behind him; no edges anywhere.
            let headGone = 0;
            for (const [i, piece] of PIECES.entries()) {
              const e = Math.max(0, Math.min(1, (gone - piece.from) / 0.45));
              if (i === PIECES.length - 1) headGone = e;
              if (e <= 0) continue;
              const c = P(piece.c[0], piece.c[1])!;
              haze(press, c[0], c[1], piece.r[0] * k * 1.25, piece.r[1] * k * 1.25, WOOD, e);
            }
            // When his head has gone, the grin is all that's left, floating, and glowing a little.
            if (headGone > 0.35) {
              const appear = Math.min(1, (headGone - 0.35) / 0.4);
              if (gone > 0.7) glow(press, gc[0], gc[1], GRIN_AT.rx * k, (gone - 0.7) / 0.3, t);
              grin(press, gc[0], gc[1] + Math.sin(t * 1.4) * 2, GRIN_AT.rx * k * (0.85 + appear * 0.15), boil % 3, Math.max(0, (gone - 0.85) / 0.15));
            }
          });
        },
      });
    },
    { copy: COPY },
  );

/** The wood's own colours, for what shows through where he was. */
const WOOD: [number, number, number] = [0.6, 0.22, 0.5];

/**
 * A feathered wash: every plate eases toward the given tones inside a soft ellipse, by
 * `amount` at its heart and not at all at its rim. It has no edge to see.
 */
function haze(press: Press, x: number, y: number, rx: number, ry: number, tones: [number, number, number], amount: number) {
  const soft = new Path2D();
  soft.arc(0, 0, ry, 0, Math.PI * 2);
  const ramp = (v: number) => (g: CanvasRenderingContext2D) => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    const u = Math.round(v * 255);
    gr.addColorStop(0, `rgba(${u},${u},${u},${amount})`);
    gr.addColorStop(0.55, `rgba(${u},${u},${u},${amount * 0.9})`);
    gr.addColorStop(1, `rgba(${u},${u},${u},0)`);
    return gr;
  };
  press.with({ x, y, sx: rx / ry }, () => press.fill(soft, { a: ramp(tones[0]), b: ramp(tones[1]), c: ramp(tones[2]) }));
}

/** A soft pink halo round the grin, breathing. */
function glow(press: Press, x: number, y: number, r: number, k: number, t: number) {
  const breathe = 0.85 + Math.sin(t * 2) * 0.15;
  press.fill(curvy(handEllipse(x, y, r * 1.5, r * 0.85, 9, 2)), { b: 0.35 * k * breathe }, { over: true });
}
