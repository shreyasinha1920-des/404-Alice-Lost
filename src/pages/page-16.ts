import './print.css';
import './act3.css';
import { spreadPage } from './art';
import { renderText } from './shared';
import { el } from '../engine/dom';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, dab, scatter, type Seed } from '../print/brush';
import { TEA_PARTY, preload, printFigure, printWatch } from '../print/tenniel';
import { printProp } from '../print/props';
import { escape } from '../print/escape';
import { propStamp } from '../print/stamps';
import { music } from '../audio/music';
import { dropStamp } from './act2';
import type { Tones } from '../print/press';

/**
 * Page 16: the Mad Tea Party. Tenniel's table, the Hatter, the March Hare and the sleepy
 * Dormouse fill the left page; the long table runs on across the gutter, set with cups.
 * Clocks hang in the air above it, every one of them stopped at six o'clock, their second
 * hands twitching and getting nowhere. Shout "Move down!" and everyone shifts one place
 * along: the cups hop a seat, the last one falls off the end of the table and out of the
 * book, spilling its tea, and a clean one appears at the head.
 */

const COPY: [number, number, number, number] = [0.6, 0.05, 0.34, 0.42];

const CUP_TONES: Tones[] = [{ b: 0.6, c: 0.2 }, { a: 0.5, c: 0.3 }, { c: 0.8, b: 0.3 }, { b: 0.35, a: 0.3 }, { a: 0.6, b: 0.2 }];

interface Cup {
  /** seat, with a fraction while it's moving */
  seat: number;
  to: number;
  tone: number;
  hop: number;
}

export default () => {
  let moveDown = () => {};
  return spreadPage(
    16,
    (ctx) => {
      let leaves: Seed[] = [];
      let cups: Cup[] = [0, 1, 2, 3, 4].map((i) => ({ seat: i, to: i, tone: i, hop: 0 }));
      let nextTone = 5;
      preload(TEA_PARTY);
      let frame: PrintFrame | null = null;

      const SEATS = 5;
      const table = (f: PrintFrame) => (f.wide ? { x0: f.w * 0.57, x1: f.w * 0.97, y: f.h * 0.8, h: f.h * 0.18 } : { x0: f.w * 0.05, x1: f.w * 0.95, y: f.h * 0.42, h: f.h * 0.08 });
      const seatX = (f: PrintFrame, seat: number) => {
        const tb = table(f);
        return tb.x0 + ((seat + 0.5) / SEATS) * (tb.x1 - tb.x0);
      };

      moveDown = () => {
        const f = frame;
        if (!f) return;
        [0, 2, 4, 5, 7].forEach((d, i) => setTimeout(() => music.chime(d, 1), i * 70));
        for (const c of cups) {
          c.to = c.seat + 1;
          c.hop = 1;
        }
        // The cup at the end of the table goes over the edge, tea and all.
        const last = cups.find((c) => c.to >= SEATS);
        if (last) {
          const tb = table(f);
          const v = f.toViewport(seatX(f, SEATS - 1), tb.y - 10);
          escape.launch(propStamp('cup', CUP_TONES[last.tone % CUP_TONES.length], last.tone), v.x, v.y, { size: f.wide ? 54 : 40, vx: 160, vy: -260, ay: 900, vr: 5, drag: 0.6, fade: 0.3 });
          for (let i = 0; i < 6; i++) escape.launch(dropStamp('tea', { c: 0.7, b: 0.45, a: 0.3 }), v.x, v.y, { size: 12 + Math.random() * 8, vx: 60 + Math.random() * 200, vy: -200 - Math.random() * 200, ay: 900, drag: 0.6, fade: 0.5 });
        }
        cups = cups.filter((c) => c.to < SEATS);
        cups.unshift({ seat: -1, to: 0, tone: nextTone++, hop: 1 });
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.6,
        copy: COPY,
        layout(f) {
          leaves = scatter(f.w, f.h, 13, (_x, y) => y < f.h * (f.wide ? 0.13 : 0.07), 161);
        },
        click(x, y, f) {
          // Clicking the table works too.
          const tb = table(f);
          if (y > tb.y - 40 && x > tb.x0) moveDown();
          else music.chime(Math.floor(Math.random() * 6), 0);
        },
        draw(f) {
          frame = f;
          const { press, w, h, t, dt, boil } = f;
          const s = boil % 3;
          const tb = table(f);

          // A summer afternoon under the tree: warm wash, a canopy of brushed leaves.
          const air = new Path2D();
          air.rect(0, 0, w, h);
          press.fill(air, { c: 0.28, b: 0.12, a: 0.06 });
          const canopy = new Path2D();
          for (const l of leaves) dab(canopy, l.x + Math.sin(t * 0.6 + l.r * 8) * 3, l.y, l.r * 6, 14 + l.r * 12, 5 + l.r * 4, 0.5);
          press.fill(canopy, { a: 0.55, c: 0.85 }, { over: true });

          // The long table, running on across the gutter.
          const cloth = new Path2D();
          cloth.rect(tb.x0 - (f.wide ? w * 0.04 : 0), tb.y, tb.x1 - tb.x0 + (f.wide ? w * 0.04 : 0), tb.h);
          press.knock(cloth);
          press.fill(cloth, { a: 0.1, b: 0.06 });
          const folds = new Path2D();
          for (let i = 0; i < 14; i++) {
            const x = tb.x0 + (i / 13) * (tb.x1 - tb.x0);
            ribbon([[x, tb.y + 4], [x + 2, tb.y + tb.h]], { w: 1.4, taper: 0.4, amt: 0.6, seed: i + s }, folds);
          }
          press.fill(folds, { a: 0.55, b: 0.4 }, { over: true });
          press.fill(ribbon([[tb.x0 - (f.wide ? w * 0.04 : 0), tb.y], [tb.x1, tb.y + 2]], { w: 2.4, rough: 0.4, seed: 3 + s }), { a: 1, b: 0.8 });

          // Tenniel's tea party.
          if (f.wide) press.with({ x: w * 0.29, y: h * 0.985 }, () => printFigure(press, TEA_PARTY, h * 0.62, boil));
          else press.with({ x: w * 0.5, y: h * 0.41 }, () => printFigure(press, TEA_PARTY, h * 0.28, boil));

          // The cups, hopping along when told to move down.
          const size = f.wide ? h * 0.11 : h * 0.055;
          for (const c of cups) {
            c.seat += (c.to - c.seat) * Math.min(1, dt * 7);
            if (Math.abs(c.to - c.seat) < 0.01) c.seat = c.to;
            c.hop = Math.max(0, c.hop - dt * 2.2);
            const lift = Math.sin((1 - c.hop) * Math.PI) * size * 0.8 * (c.hop > 0 ? 1 : 0);
            const x = seatX(f, c.seat);
            press.with({ x, y: tb.y - size * 0.45 - lift, s: size / 64, rot: Math.sin(t * 2 + c.tone) * 0.04 }, () => printProp(press, 'cup', CUP_TONES[c.tone % CUP_TONES.length], boil));
          }

          // Clocks in the air, every one stopped at six. Their second hands twitch, and get nowhere.
          const clocks = f.wide
            ? [[w * 0.1, h * 0.15, h * 0.055], [w * 0.24, h * 0.24, h * 0.045], [w * 0.38, h * 0.13, h * 0.06], [w * 0.47, h * 0.28, h * 0.04]]
            : [[w * 0.2, h * 0.08, h * 0.03], [w * 0.8, h * 0.1, h * 0.035]];
          for (const [i, [x, y, r]] of clocks.entries()) {
            const bob = Math.sin(t * 0.9 + i * 2) * r * 0.15;
            printWatch(press, x, y + bob, r, 30 + (Math.sin(t * 9 + i) > 0 ? 1 : 0), boil, [6, 0]);
          }
        },
      });
    },
    {
      copy: COPY,
      text: () => {
        const text = renderText(16);
        const btn = el('button', { class: 'move-down', type: 'button' }, 'Move down!');
        btn.addEventListener('click', () => moveDown());
        text.querySelector('.text__hint')!.before(btn);
        return text;
      },
    },
  );
};
