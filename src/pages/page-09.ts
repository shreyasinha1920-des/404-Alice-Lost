import './print.css';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, wobble, scatter, handEllipse, type Pt, type Seed } from '../print/brush';
import { ALICE_SWIM, preload, printFigure } from '../print/tenniel';
import { escape } from '../print/escape';
import { music } from '../audio/music';
import { dropStamp } from './act2';

/**
 * Page 9: the pool of tears. Printed cobalt water fills the lower half of the spread, its
 * surface rolling across the gutter. Tenniel's Alice swims in it, bobbing. Your cursor
 * trails ripples across the water; big tears fall now and then and plop in. Click the
 * water and it splashes: drops leap out of the book. Click above it and a tear falls.
 */

const COPY: [number, number, number, number] = [0.58, 0.06, 0.36, 0.42];

interface Ripple {
  x: number;
  y: number;
  born: number;
  big: boolean;
}
interface Tear {
  x: number;
  y: number;
  vy: number;
}

const tearDrop = () => dropStamp('tear', { a: 0.75, c: 0.12 });

export default () =>
  spreadPage(
    9,
    (ctx) => {
      let glints: Seed[] = [];
      const ripples: Ripple[] = [];
      const tears: Tear[] = [];
      let rippleClock = 0;
      let tearClock = 2;
      preload(ALICE_SWIM);

      const waterAt = (f: PrintFrame) => f.h * (f.wide ? 0.56 : 0.3);
      const surface = (f: PrintFrame, x: number) => waterAt(f) + Math.sin(x * 0.02 + f.t * 1.4) * 3 + Math.sin(x * 0.007 - f.t * 0.8) * 6;

      const splash = (f: PrintFrame, x: number, n: number) => {
        const y = surface(f, x);
        ripples.push({ x, y: y + 6, born: f.t, big: true });
        const v = f.toViewport(x, y);
        for (let i = 0; i < n; i++) {
          escape.launch(tearDrop(), v.x, v.y, { size: 14 + Math.random() * 14, vx: (Math.random() - 0.5) * 380, vy: -280 - Math.random() * 380, ay: 900, vr: (Math.random() - 0.5) * 3, drag: 0.6, fade: 0.45 });
        }
        music.chime(Math.floor(Math.random() * 3), -1);
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4.2,
        copy: COPY,
        layout(f) {
          glints = scatter(f.w, f.h, 16, (_x, y) => y > waterAt(f) + 10 && y < (f.wide ? f.h : f.h * 0.5), 91);
        },
        click(x, y, f) {
          if (y > surface(f, x) - 8) splash(f, x, 10);
          else tears.push({ x, y, vy: 0 });
        },
        draw(f) {
          const { press, w, h, t, dt, boil, pointer } = f;
          const s = boil % 3;
          const top = waterAt(f);
          const bottom = f.wide ? h : h * 0.5;

          // Above the water: a dim stone hall, faintly hatched.
          const sky = new Path2D();
          sky.rect(0, 0, w, top + 20);
          press.fill(sky, { a: 0.18, b: 0.08, c: 0.04 });

          // Ripples from the cursor, and from tears falling.
          rippleClock -= dt;
          if (pointer.inside && pointer.y > surface(f, pointer.x) && pointer.speed > 30 && rippleClock <= 0) {
            rippleClock = 0.14;
            ripples.push({ x: pointer.x, y: pointer.y, born: t, big: false });
          }
          tearClock -= dt;
          if (tearClock <= 0 && !ctx.reducedMotion) {
            tearClock = 2.5 + Math.random() * 3;
            tears.push({ x: w * (0.08 + Math.random() * 0.4), y: -20, vy: 0 });
          }

          // The water.
          const water: Pt[] = [];
          for (let x = -10; x <= w + 10; x += 24) water.push([x, surface(f, x)]);
          water.push([w + 10, bottom + 10], [-10, bottom + 10]);
          const waterP = new Path2D();
          waterP.moveTo(water[0][0], water[0][1]);
          for (const p of water) waterP.lineTo(p[0], p[1]);
          waterP.closePath();
          press.fill(waterP, { a: 0.72, b: 0.06, c: 0.14 });
          // Rolling bands of light on the water.
          const bands = new Path2D();
          for (const g of glints) {
            const dx = Math.sin(t * 0.8 + g.r * 9) * 10;
            ribbon([[g.x - 14 - g.r * 12 + dx, g.y], [g.x + dx, g.y - 1.5], [g.x + 14 + g.r * 12 + dx, g.y]], { w: 1.4 + g.r * 1.4, taper: 0.5, amt: 0.5, seed: Math.floor(g.r * 99) + s }, bands);
          }
          press.fill(bands, { a: 0.3, c: 0.05 });

          // Alice, swimming and bobbing.
          const ax = w * (f.wide ? 0.27 : 0.32);
          const fh = h * (f.wide ? 0.42 : 0.2);
          const bob = Math.sin(t * 1.3) * fh * 0.05;
          press.with({ x: ax, y: top + fh * 0.62 + bob, rot: Math.sin(t * 0.9) * 0.04 }, () => printFigure(press, ALICE_SWIM, fh, boil));
          // The water over her: her lower half is under, tinted blue.
          press.with({ x: 0, y: fh * 0.18 }, () => press.fill(waterP, { a: 0.42, c: 0.08 }, { over: true }));
          // The surface line, drawn over everything.
          press.fill(ribbon(water.slice(0, -2), { w: 2.2, rough: 0.4, amt: 0.6, seed: 7 + s }), { a: 1, b: 0.5 }, { over: true });

          // Ripples: rings of paper spreading on the water.
          const rings = new Path2D();
          for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            const age = t - r.born;
            const life = r.big ? 2.2 : 1.4;
            if (age > life) {
              ripples.splice(i, 1);
              continue;
            }
            const rad = 6 + age * (r.big ? 90 : 55);
            for (const q of r.big ? [1, 0.6] : [1]) {
              ribbon(handEllipse(r.x, r.y, rad * q, rad * q * 0.28, Math.floor(r.born * 10), 1), { closed: true, w: 1.6 * (1 - age / life) + 0.3, amt: 0, seed: 1 }, rings);
            }
          }
          press.knock(rings);

          // Tears: big drops falling into the pool.
          const tearsP = new Path2D();
          for (let i = tears.length - 1; i >= 0; i--) {
            const d = tears[i];
            d.vy += 900 * dt;
            d.y += d.vy * dt;
            if (d.y > surface(f, d.x)) {
              tears.splice(i, 1);
              splash(f, d.x, 4);
              continue;
            }
            const k = 1.2;
            const drop: Pt[] = [[d.x, d.y - 16 * k], [d.x + 7 * k, d.y], [d.x + 6 * k, d.y + 8 * k], [d.x, d.y + 11 * k], [d.x - 6 * k, d.y + 8 * k], [d.x - 7 * k, d.y]];
            curvy(wobble(drop, true, 0.6, 3 + s, 4), tearsP);
          }
          press.fill(tearsP, { a: 0.65, c: 0.1 });
        },
      });
    },
    { copy: COPY },
  );
