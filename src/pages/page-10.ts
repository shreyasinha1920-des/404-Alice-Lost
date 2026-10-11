import './print.css';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, dab, scatter, handEllipse, type Seed } from '../print/brush';
import { DODO, RABBIT, preload, printFigure } from '../print/tenniel';
import { escape } from '../print/escape';
import { sparkleStamp } from '../print/stamps';
import { music } from '../audio/music';
import { crumbStamp, puffStamp } from './act2';
import type { Press, Tones } from '../print/press';

/**
 * Page 10: the Caucus Race. Tenniel's Dodo presents Alice with her own thimble on the
 * left page. On the right, a race with no start and no finish: a ring of footprints in
 * the sand, and a flock of brush-drawn birds (and the White Rabbit) running round it
 * forever, kicking up dust. Click and the race stops: everyone jumps and cheers, and
 * comfits, the prizes, burst out of the book. Then off they go again.
 */

const COPY: [number, number, number, number] = [0.58, 0.06, 0.36, 0.4];

interface Runner {
  phase: number;
  speed: number;
  size: number;
  tones: Tones;
  rabbit?: boolean;
}

const RUNNERS: Runner[] = [
  { phase: 0, speed: 1, size: 1.25, tones: {}, rabbit: true },
  { phase: 0.9, speed: 1.08, size: 1, tones: { b: 0.7, c: 0.2 } },
  { phase: 1.8, speed: 0.94, size: 0.85, tones: { c: 0.8, b: 0.2 } },
  { phase: 2.6, speed: 1.12, size: 1.1, tones: { a: 0.45, c: 0.4 } },
  { phase: 3.5, speed: 0.98, size: 0.8, tones: { b: 0.45, a: 0.25 } },
  { phase: 4.4, speed: 1.04, size: 0.95, tones: { c: 0.55, a: 0.15 } },
  { phase: 5.3, speed: 0.9, size: 1.05, tones: { a: 0.3, b: 0.5 } },
];

export default () =>
  spreadPage(
    10,
    (ctx) => {
      let sand: Seed[] = [];
      let race = 1;
      let stopUntil = -1;
      let dustClock = 0;
      const angle = RUNNERS.map((r) => r.phase);
      preload(DODO);
      preload(RABBIT);

      const track = (f: PrintFrame) => (f.wide ? { x: f.w * 0.75, y: f.h * 0.74, rx: f.w * 0.17, ry: f.h * 0.13, u: f.h * 0.1 } : { x: f.w * 0.5, y: f.h * 0.43, rx: f.w * 0.4, ry: f.h * 0.035, u: f.h * 0.05 });

      const cheer = (f: PrintFrame, x: number, y: number) => {
        stopUntil = f.t + 2.6;
        const v = f.toViewport(x, y);
        for (let i = 0; i < 14; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
          const sp = 300 + Math.random() * 380;
          escape.launch(i % 3 ? crumbStamp(i) : sparkleStamp(i), v.x, v.y, { size: 14 + Math.random() * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: 760, vr: (Math.random() - 0.5) * 10, drag: 0.6, fade: 0.5 });
        }
        [0, 2, 4, 7, 9].forEach((d, i) => setTimeout(() => music.chime(d, 1), i * 90));
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4.2,
        copy: COPY,
        layout(f) {
          sand = scatter(f.w, f.h, 10, (_x, y) => y > f.h * (f.wide ? 0.52 : 0.3) && y < (f.wide ? f.h : f.h * 0.5), 101);
        },
        click(x, y, f) {
          cheer(f, x, y);
        },
        draw(f) {
          const { press, w, h, t, dt, boil } = f;
          const s = boil % 3;
          const T = track(f);
          const stopped = t < stopUntil;
          race += ((stopped || ctx.reducedMotion ? 0 : 1) - race) * Math.min(1, dt * (stopped ? 8 : 2));

          // Sand: a warm wash, stippled.
          const ground = new Path2D();
          ground.rect(0, h * (f.wide ? 0.52 : 0.3), w, h);
          press.fill(ground, { c: 0.32, b: 0.08 });
          const grit = new Path2D();
          for (const g of sand) dab(grit, g.x, g.y, 0.1, 4 + g.r * 6, 0.8, 0.3);
          press.fill(grit, { c: 0.7, a: 0.2, b: 0.2 }, { over: true });

          // The Dodo's vignette.
          if (f.wide) press.with({ x: w * 0.25, y: h * 0.98 }, () => printFigure(press, DODO, h * 0.82, boil));
          else press.with({ x: w * 0.5, y: h * 0.42 }, () => printFigure(press, DODO, h * 0.36, boil));

          // The course: "a sort of circle (the exact shape doesn't matter)", in footprints.
          const prints = new Path2D();
          for (let i = 0; i < 46; i++) {
            const a = (i / 46) * Math.PI * 2;
            const side = i % 2 ? 1 : -1;
            const r = 1 + side * 0.05;
            dab(prints, T.x + Math.cos(a) * T.rx * r, T.y + Math.sin(a) * T.ry * r, a + Math.PI / 2, T.u * 0.18, T.u * 0.07, 0);
          }
          press.fill(prints, { a: 0.35, c: 0.3, b: 0.1 }, { over: true });

          // The runners, back ones first.
          dustClock -= dt;
          const order = RUNNERS.map((_r, i) => i).sort((i, j) => Math.sin(angle[i]) - Math.sin(angle[j]));
          for (const i of order) {
            const r = RUNNERS[i];
            angle[i] += dt * 0.55 * r.speed * race;
            const a = angle[i];
            const x = T.x + Math.cos(a) * T.rx;
            const y = T.y + Math.sin(a) * T.ry;
            const depth = 0.8 + 0.2 * Math.sin(a);
            const size = T.u * r.size * depth;
            const dir = -Math.sin(a) >= 0 ? 1 : -1;
            const jump = stopped ? Math.abs(Math.sin(t * 9 + i)) * size * 0.6 : Math.abs(Math.sin(t * 12 * r.speed + i)) * size * 0.08 * race;
            if (r.rabbit) {
              press.with({ x, y: y - jump, sx: -dir }, () => printFigure(press, RABBIT, size * 2.2, 0));
            } else {
              bird(press, x, y - jump, size, t * 14 * r.speed * race + i, dir, r.tones, s + i, stopped);
            }
            // dust kicked up behind
            if (race > 0.5 && dustClock <= 0 && i === Math.floor(t * 3) % RUNNERS.length && !ctx.reducedMotion) {
              dustClock = 0.18;
              if (Math.random() < 0.12) {
                const v = f.toViewport(x, y);
                escape.launch(puffStamp(2 + (i % 2)), v.x, v.y, { size: 10 + Math.random() * 8, vx: dir * -60, vy: -40, drag: 0.9, fade: 1.4, vs: 0.8 });
              }
            }
          }
        },
      });
    },
    { copy: COPY },
  );

/** A bird drawn in a few brush strokes, running (legs scissoring) or, when stopped, cheering. */
function bird(press: Press, x: number, y: number, u: number, step: number, dir: number, tones: Tones, s: number, cheering: boolean) {
  press.with({ x, y, sx: dir }, () => {
    const legs = new Path2D();
    for (const k of [0, Math.PI]) {
      const sw = Math.sin(step + k) * 0.5;
      ribbon([[0, -u * 0.55], [Math.sin(sw) * u * 0.35, -u * 0.25], [Math.sin(sw) * u * 0.5 + u * 0.1, 0]], { w: u * 0.08, taper: 0.4, amt: 0.3, seed: s }, legs);
    }
    press.fill(legs, { a: 0.9, b: 0.7 });
    const body = curvy(handEllipse(0, -u * 0.8, u * 0.42, u * 0.3, 10 + s, u * 0.03, -0.2));
    press.fill(body, { ...{ a: 0.2 }, ...tones });
    press.fill(ribbon(handEllipse(0, -u * 0.8, u * 0.42, u * 0.3, 10 + s, u * 0.03, -0.2), { closed: true, w: u * 0.05, rough: 0.5, amt: 0.4, seed: s }), { a: 1, b: 0.8 }, { over: true });
    // neck and head
    press.fill(ribbon([[u * 0.25, -u * 0.95], [u * 0.38, -u * 1.25]], { w: u * 0.1, taper: 0.2, amt: 0.3, seed: s }), { a: 1, b: 0.8 });
    press.fill(curvy(handEllipse(u * 0.42, -u * 1.32, u * 0.13, u * 0.11, 20 + s, u * 0.01)), { a: 1, b: 0.8 });
    const beak = new Path2D();
    dab(beak, u * 0.6, -u * 1.3, cheering ? -0.4 : 0.1, u * 0.22, u * 0.07, 0);
    press.fill(beak, { c: 1, b: 0.4 });
    // a wing: flapping in the cheer
    const wing = new Path2D();
    dab(wing, -u * 0.08, -u * 0.86, cheering ? -1.2 + Math.sin(step * 2) * 0.4 : -0.3, u * 0.5, u * 0.14, 0);
    press.fill(wing, { a: 0.85, b: 0.6 });
  });
}
