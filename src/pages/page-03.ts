import './print.css';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { dab, scatter, type Seed } from '../print/brush';
import { RABBIT, preload, printFigure, printWatch } from '../print/tenniel';
import { escape } from '../print/escape';
import { dashStamp } from '../print/stamps';
import { music } from '../audio/music';

/**
 * Page 3: the White Rabbit hurries past, printed edge to edge across both pages.
 * Tenniel's own drawing of him, knocked out to paper and hand-coloured in loose washes,
 * stands in a field of cobalt brush strokes that swirls across the whole spread and curls
 * toward your cursor like water. He hurries in when the page opens, turns to look when
 * you come up behind him, and hops when clicked: the field ripples and strokes flick
 * right out of the book. His watch stands at 4:04 and ticks.
 */

const COPY: [number, number, number, number] = [0.58, 0.1, 0.36, 0.42];

export default () =>
  spreadPage(
    3,
    (ctx) => {
      let field: Seed[] = [];
      const ripples: { t: number; x: number; y: number }[] = [];
      const rb = { face: 1 as 1 | -1, faceT: -1, hopT: -9 };
      let entered = 0;
      preload(RABBIT);

      const feetOf = (f: PrintFrame) => (f.wide ? { x: f.w * 0.27, y: f.h * 0.93 } : { x: f.w * 0.5, y: f.h * 0.5 });

      const flick = (f: PrintFrame, x: number, y: number, n: number) => {
        for (let i = 0; i < n; i++) {
          const v = f.toViewport(x, y);
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
          escape.launch(dashStamp(i % 2), v.x, v.y, {
            size: 30 + Math.random() * 20,
            vx: Math.cos(a) * (300 + Math.random() * 300),
            vy: Math.sin(a) * (300 + Math.random() * 300),
            ay: 500,
            rot: a,
            vr: (Math.random() - 0.5) * 6,
            drag: 0.5,
            fade: 0.6,
          });
        }
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4.4,
        copy: COPY,
        layout(f) {
          field = scatter(f.w, f.h, 7, () => true, 3);
        },
        enter() {
          entered = performance.now();
          rb.face = 1;
        },
        click(x, y, f) {
          const feet = feetOf(f);
          const height = f.h * (f.wide ? 0.86 : 0.46);
          const onHim = Math.abs(x - feet.x) < height * 0.3 && y > feet.y - height && y < feet.y + 10;
          ripples.push({ t: f.t, x: onHim ? feet.x : x, y: onHim ? feet.y - height * 0.15 : y });
          if (onHim) {
            rb.hopT = f.t;
            flick(f, feet.x, feet.y - 10, 5);
          }
          music.chime(onHim ? 4 : Math.floor(Math.random() * 5), 1);
        },
        draw(f) {
          const { press, w, h, t, pointer, boil } = f;
          const since = ctx.reducedMotion ? 9 : (performance.now() - entered) / 1000;
          const arrive = 1 - Math.pow(1 - Math.min(1, since / 1.3), 3);
          const feet = feetOf(f);
          const rx = feet.x + (1 - arrive) * w * 0.5;
          const height = h * (f.wide ? 0.86 : 0.46);

          const behind = pointer.inside && pointer.x > rx + height * 0.25 && Math.abs(pointer.y - (feet.y - height / 2)) < height * 0.6;
          const want: 1 | -1 = behind ? -1 : 1;
          if (want !== rb.face && t - rb.faceT > 0.4 && arrive > 0.95) {
            rb.face = want;
            rb.faceT = t;
            if (want === -1) music.chime(2, 1);
          }

          // The swirl, centred on him, pulled toward the cursor, rippled by clicks.
          const pull = pointer.inside ? 0.4 : 0;
          const cx = rx + (pointer.x - rx) * pull;
          const cy = feet.y - height * 0.35 + (pointer.y - (feet.y - height * 0.35)) * pull;
          const angle = (x: number, y: number) => {
            const d = Math.hypot(x - cx, y - cy);
            let a = Math.atan2(y - cy, x - cx) + Math.PI / 2 + 0.22 + Math.sin(t * 0.1 + d * 0.009) * 0.28;
            for (const r of ripples) {
              const age = t - r.t;
              const k = Math.hypot(x - r.x, y - r.y) - age * 300;
              if (Math.abs(k) < 34) a += (1 - Math.abs(k) / 34) * (1 - age / 1.8) * 1.3;
            }
            return a;
          };
          while (ripples.length && t - ripples[0].t > 1.8) ripples.shift();

          const ground = new Path2D();
          ground.rect(0, 0, w, h);
          press.fill(ground, { a: 0.28 });
          const dark = new Path2D();
          const light = new Path2D();
          for (const p of field) {
            const a = angle(p.x, p.y) + Math.sin(p.r * 50 + boil) * 0.08;
            const len = 14 + p.r * 14;
            if (p.r < 0.55) dab(dark, p.x, p.y, a, len, 1.7 + p.r * 1.2, (p.r - 0.25) * 5);
            else if (p.r > 0.8) dab(light, p.x, p.y, a, len * 0.8, 1.3, (p.r - 0.9) * 5);
          }
          press.fill(dark, { a: 1 });
          press.knock(light);

          // His shadow.
          const shadow = new Path2D();
          for (let i = 0; i < 70; i++) {
            const u = (i / 70) * 2 - 1;
            dab(shadow, rx + u * height * 0.22 + height * 0.06, feet.y - 4 + Math.sin(i * 2.3) * 4, 0.05, 16 * (1 - Math.abs(u) * 0.6), 2.6, 0);
          }
          press.fill(shadow, { a: 0.75, b: 0.35 }, { over: true });

          // Tenniel's Rabbit, hopping when clicked.
          const ht = t - rb.hopT;
          let hop = 0;
          let squash = 1;
          if (ht < 0.6) {
            const k = ht / 0.6;
            hop = -Math.sin(k * Math.PI) * h * 0.09;
            squash = k > 0.88 ? 0.94 : 1.03;
          }
          const lean = arrive < 1 ? 0.12 * (1 - arrive) : Math.sin(t * 2.1) * 0.006;
          press.with({ x: rx, y: feet.y + hop, rot: -lean, sx: rb.face }, () => {
            press.with({ x: 0, y: 0, s: squash }, () => printFigure(press, RABBIT, height, boil));
          });

          // His watch, large, beside him: 4:04, ticking.
          printWatch(press, f.wide ? w * 0.44 : w * 0.82, f.wide ? h * 0.22 : h * 0.1, Math.min(w, h) * (f.wide ? 0.1 : 0.08), t, boil);
        },
      });
    },
    { copy: COPY },
  );
