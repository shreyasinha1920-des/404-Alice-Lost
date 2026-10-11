import './print.css';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, wobble, dab, scatter, handEllipse, rng, type Pt, type Seed } from '../print/brush';
import { RABBIT, preload, printFigure } from '../print/tenniel';
import { escape } from '../print/escape';
import { leafStamp } from '../print/stamps';
import { music } from '../audio/music';
import type { Press } from '../print/press';

/**
 * Page 2: the riverbank on a golden afternoon, printed edge to edge across both pages.
 * A weeping willow grows across the gutter, its strands in three overprinted greens; the
 * river runs along the foot of the spread, and the copy sits in the open sky.
 * The cursor is a breeze through the strands, and a strong one blows leaves right out of
 * the book; clicking the water sends out rings; now and then (sooner if you go looking
 * along the far bank) Tenniel's White Rabbit dashes past.
 */

interface Strand {
  x: number;
  y: number;
  len: number;
  tone: 0 | 1 | 2;
  r: number;
}

/** Three greens: deep, mid and lime, as blue + yellow overprints. */
export const GREENS = [
  { a: 0.95, c: 1 },
  { a: 0.5, c: 1 },
  { a: 0.18, c: 0.95 },
];

export default () =>
  spreadPage(
    2,
    (ctx) => {
      let strands: Strand[] = [];
      let grass: Seed[] = [];
      let horizon = 0;
      let treeX = 0;
      const ripples: { t: number; x: number; y: number }[] = [];
      let runT = -10;
      let nextRun = 3.5;
      let leafClock = 0;
      preload(RABBIT);

      const shed = (f: PrintFrame, n: number, dir: number) => {
        // Leaves leave the canopy and blow out of the book, across the room.
        const R = rng(Math.floor(f.t * 100));
        for (let i = 0; i < n; i++) {
          const s = strands[Math.floor(R() * strands.length)];
          if (!s) continue;
          const v = f.toViewport(s.x, s.y + s.len * (0.3 + R() * 0.6));
          escape.launch(leafStamp(i % 4), v.x, v.y, {
            size: 22 + R() * 14,
            vx: dir * (120 + R() * 220),
            vy: -40 - R() * 80,
            ay: 60,
            vr: (R() - 0.5) * 5,
            flutter: 160,
            drag: 0.7,
            fade: 0.22,
          });
        }
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4.2,
        copy: [0.6, 0.06, 0.35, 0.46],
        layout(f) {
          const { w, h } = f;
          horizon = h * (f.wide ? 0.66 : 0.4);
          treeX = w * (f.wide ? 0.33 : 0.42);
          const R = rng(11);
          strands = [];
          const half = w * (f.wide ? 0.27 : 0.46);
          const count = f.wide ? 640 : 380;
          for (let i = 0; i < count; i++) {
            const u = R() * 2 - 1;
            const x = treeX + u * half + (R() - 0.5) * 10;
            const dome = h * 0.02 + Math.pow(Math.abs(u), 1.6) * horizon * 0.42 + R() * h * 0.04;
            const curtain = 0.5 + 0.5 * Math.sin(x * 0.05) * Math.sin(x * 0.019 + 1);
            const len = (horizon - dome) * (0.55 + curtain * 0.4 + R() * 0.12);
            strands.push({ x, y: dome, len, tone: (i % 5 < 2 ? 0 : i % 5 < 4 ? 1 : 2) as 0 | 1 | 2, r: R() });
          }
          strands.sort((a, b) => a.tone - b.tone);
          grass = scatter(w, h, 5, (_x, y) => y > h * 0.9, 13);
        },
        click(x, y, f) {
          if (y > horizon) {
            ripples.push({ t: f.t, x, y });
            music.chime(Math.floor((1 - y / f.h) * 10), 1);
          } else {
            ripples.push({ t: f.t, x, y: -999 });
            shed(f, 7, x < treeX ? 1 : -1);
            music.chime(1, 0);
          }
        },
        draw(f) {
          const { press, w, h, t, pointer, boil } = f;

          const wind = (x: number, y: number) => {
            let push = Math.sin(t * 0.8 + x * 0.011) * 6;
            if (pointer.inside) {
              const d = Math.hypot(x - pointer.x, y - pointer.y);
              if (d < h * 0.3) push += Math.sign(x - pointer.x) * (1 - d / (h * 0.3)) * (18 + pointer.speed / 120);
            }
            for (const r of ripples) {
              if (r.y !== -999) continue;
              const age = t - r.t;
              if (age < 1.4) push += Math.sign(x - r.x) * Math.max(0, 1 - Math.abs(Math.abs(x - r.x) - age * 320) / 80) * (1 - age / 1.4) * 34;
            }
            return push;
          };

          // A strong breeze shakes leaves loose.
          leafClock -= f.dt;
          if (pointer.inside && pointer.speed > 1400 && leafClock <= 0 && pointer.y < horizon) {
            leafClock = 0.35;
            shed(f, 2, pointer.x < treeX ? -1 : 1);
          }

          // Sky: a pale yellow screen fading up into paper, and a low sun.
          const sky = new Path2D();
          sky.rect(0, 0, w, horizon);
          press.fill(sky, { c: (g) => { const gr = g.createLinearGradient(0, 0, 0, horizon); gr.addColorStop(0, 'rgb(0,0,0)'); gr.addColorStop(1, 'rgb(70,70,70)'); return gr; } });
          const sunX = f.wide ? w * 0.08 : w * 0.86;
          press.fill(curvy(handEllipse(sunX, h * 0.13, h * 0.055, h * 0.055, 3 + (boil % 3), 1.2)), { c: 1, b: 0.3 });

          // The far bank.
          const bank: Pt[] = [[0, horizon + 2]];
          for (let x = 0; x <= w; x += 12) bank.push([x, horizon - h * 0.03 - Math.sin(x * 0.015) * h * 0.012 - Math.sin(x * 0.06) * h * 0.006]);
          bank.push([w, horizon + 2]);
          press.fill(curvy(wobble(bank, true, 1.4, 5 + (boil % 3), 8)), { a: 0.7, c: 1 });

          // The Rabbit, tiny, dashing the whole width of the far bank.
          const nearFar = pointer.inside && Math.abs(pointer.y - horizon) < h * 0.08 && pointer.x > w * 0.55;
          if (!ctx.reducedMotion && (t > nextRun || (nearFar && t - runT > 3.2))) {
            runT = t;
            nextRun = t + 9 + Math.random() * 4;
          }
          const rt = (t - runT) / 3.2;
          if (rt >= 0 && rt <= 1) {
            const bob = Math.abs(Math.sin(rt * 36)) * h * 0.012;
            press.with({ x: w * (1.04 - rt * 1.1), y: horizon - h * 0.025 - bob, rot: -0.15 }, () => printFigure(press, RABBIT, h * (f.wide ? 0.1 : 0.07), boil));
          }

          // The river.
          const water = new Path2D();
          water.rect(0, horizon, w, h - horizon);
          press.fill(water, { a: 0.32, c: 0.42 });

          // The willow: trunk, then strands.
          const trunk: Pt[] = [[treeX - w * 0.01, horizon + 4], [treeX - w * 0.02, horizon - h * 0.2], [treeX + w * 0.015, horizon - h * 0.34], [treeX, h * 0.1]];
          press.fill(ribbon(trunk, { w: Math.max(14, w * 0.024), taper: 0.08, rough: 0.3, seed: 2 + (boil % 3), amt: 2 }), { a: 1, b: 0.7, c: 1 });
          const paths = [new Path2D(), new Path2D(), new Path2D()];
          const strandPts = (s: Strand, baseY = 0): Pt[] => {
            const pts: Pt[] = [];
            const sway = wind(s.x, s.y + s.len * 0.7);
            for (let k = 0; k <= 6; k++) {
              const q = k / 6;
              pts.push([s.x + sway * q * q * (0.6 + s.r * 0.6), (baseY || s.y) + s.len * q]);
            }
            return pts;
          };
          for (const s of strands) ribbon(strandPts(s), { w: 3 + s.r * 2.2, taper: 0.22, rough: 0.2, seed: Math.floor(s.r * 999) + (boil % 3), amt: 0.8 }, paths[s.tone]);
          paths.forEach((p, i) => press.fill(p, GREENS[i]));

          // Alice and her sister on the bank.
          sitters(press, f.wide ? w * 0.5 : w * 0.66, horizon + h * 0.004, h * (f.wide ? 0.07 : 0.05), boil);

          // Reflection, broken by ripples.
          const ref = [new Path2D(), new Path2D(), new Path2D()];
          for (const s of strands) {
            if (s.len < (horizon - s.y) * 0.8) continue;
            const pts = strandPts({ ...s, len: s.len * 0.55 }, horizon + 6 + (horizon - s.y - s.len) * 0.3).map(([x, y]) => {
              let dx = Math.sin(y * 0.09 + t * 2 + s.r * 3) * 3;
              for (const r of ripples) {
                if (r.y === -999) continue;
                const age = t - r.t;
                const d = Math.hypot(x - r.x, (y - r.y) * 3) - age * 70;
                if (Math.abs(d) < 18) dx += (1 - Math.abs(d) / 18) * 7 * (1 - age / 2.2);
              }
              return [x + dx, y] as Pt;
            });
            ribbon(pts, { w: 2, taper: 0.3, seed: Math.floor(s.r * 777), amt: 0.6 }, ref[s.tone]);
          }
          ref.forEach((p, i) => press.fill(p, { a: (GREENS[i].a ?? 0) * 0.85, c: 0.9 }, { over: true }));
          // Rings where you clicked, and sun glints: knocked through to paper.
          const glints = new Path2D();
          const G = rng(5);
          for (let i = 0; i < 46; i++) {
            const gx = w * G() + Math.sin(t * 1.2 + i) * 6;
            const gy = horizon + 8 + G() * (h - horizon) * 0.7;
            dab(glints, gx, gy, 0, 8 + G() * 18, 1.2, 0);
          }
          for (const r of ripples) {
            if (r.y === -999) continue;
            const age = t - r.t;
            if (age > 2.2) continue;
            for (const k of [1, 0.6]) ribbon(handEllipse(r.x, r.y, age * 70 * k, age * 70 * k * 0.3, 9 + (boil % 3), 0.8), { closed: true, w: 2.2 * (1 - age / 2.2), seed: 3 }, glints);
          }
          press.knock(glints);
          while (ripples.length && t - ripples[0].t > 2.4) ripples.shift();

          // The near bank: grass blades leaning in the breeze.
          const blades = [new Path2D(), new Path2D()];
          for (const p of grass) {
            const lean = wind(p.x, p.y) * 0.6;
            const len = 12 + p.r * 16;
            ribbon([[p.x, p.y + 6], [p.x + lean * 0.3, p.y - len * 0.5], [p.x + lean, p.y - len]], { w: 2.4, taper: 0.5, amt: 0, seed: 1 }, blades[p.r < 0.3 ? 1 : 0]);
          }
          press.fill(blades[0], GREENS[0]);
          press.fill(blades[1], GREENS[2]);
        },
      });
    },
    { copy: [0.6, 0.06, 0.35, 0.46] },
  );

/** Two small seated figures: the sister reading, Alice beside her. Loose brush shapes. */
export function sitters(press: Press, x: number, y: number, s: number, boil: number) {
  const k = s / 40;
  const P = (pts: Pt[]) => pts.map(([px, py]) => [x + px * k, y + py * k] as Pt);
  const seed = boil % 3;
  press.fill(curvy(wobble(P([[-4, -38], [5, -38], [7, -28], [10, -16], [24, -6], [28, 0], [-14, 0], [-10, -16], [-6, -28]]), true, 0.6, 1 + seed, 3)), { a: 1, b: 0.8, c: 0.9 });
  press.knock(curvy(P([[-8, -20], [-20, -24], [-20, -15], [-8, -12]])));
  press.fill(curvy(wobble(P([[30, -30], [38, -30], [40, -20], [44, -8], [56, -4], [58, 0], [30, 0], [32, -12], [29, -22]]), true, 0.6, 4 + seed, 3)), { a: 1, b: 0.8, c: 0.9 });
  press.fill(ribbon(P([[38, -24], [46, -10], [52, -2]]), { w: 6 * k, taper: 0.3, amt: 0.3, seed: 6 }), { a: 1, b: 0.8, c: 0.9 });
}
