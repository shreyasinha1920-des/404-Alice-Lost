import './print.css';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, wobble, handEllipse, rng, type Pt } from '../print/brush';
import { CARD_STORM, preload, printFigure } from '../print/tenniel';
import { escape, stamp } from '../print/escape';
import { music } from '../audio/music';
import { shakeBook } from './act2';
import type { Press, Tones } from '../print/press';

/**
 * Page 21: "You're nothing but a pack of cards!" At that, the whole pack rises into the air
 * and comes flying down upon her. Tenniel's Alice shields herself on the left page; across
 * the spread a storm of printed cards whirls round and round, then settles, card by card,
 * into a neat deck on the right page. Click and they fly up again, and some fly clean out
 * of the book.
 */

const COPY: [number, number, number, number] = [0.58, 0.05, 0.36, 0.42];
const SUITS = ['heart', 'diamond', 'spade', 'club'] as const;
type Suit = (typeof SUITS)[number];
const RED: Tones = { b: 1, c: 0.35 };
const BLACK: Tones = { a: 1, b: 0.85, c: 0.6 };

interface Card {
  suit: Suit;
  orbit: number;
  phase: number;
  speed: number;
  tilt: number;
  delay: number;
}

/** A pip of each suit, `r` across, centred at the origin. */
function pip(suit: Suit, r: number): Path2D {
  const pts: Pt[] = [];
  if (suit === 'heart') {
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      pts.push([16 * Math.pow(Math.sin(a), 3) * r * 0.06, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r * 0.06]);
    }
    return curvy(pts);
  }
  if (suit === 'diamond') return curvy([[0, -r], [r * 0.7, 0], [0, r], [-r * 0.7, 0]]);
  if (suit === 'spade') {
    const p = new Path2D();
    curvy([[0, -r], [r * 0.85, r * 0.2], [r * 0.4, r * 0.55], [0, r * 0.25], [-r * 0.4, r * 0.55], [-r * 0.85, r * 0.2]], p);
    p.rect(-r * 0.12, r * 0.2, r * 0.24, r * 0.75);
    return p;
  }
  const p = new Path2D();
  for (const [x, y] of [[0, -r * 0.45], [-r * 0.45, r * 0.1], [r * 0.45, r * 0.1]]) curvy(handEllipse(x, y, r * 0.38, r * 0.38, 3, 0.1), p);
  p.rect(-r * 0.12, r * 0.1, r * 0.24, r * 0.85);
  return p;
}

/** A playing card, `cw` wide, centred at the origin. */
function card(press: Press, suit: Suit, cw: number, seed: number) {
  const ch = cw * 1.4;
  const face: Pt[] = [[-cw / 2, -ch / 2], [cw / 2, -ch / 2], [cw / 2, ch / 2], [-cw / 2, ch / 2]];
  const shape = curvy(wobble(face, true, 0.4, seed, 3));
  press.knock(shape);
  press.fill(shape, { c: 0.06 });
  press.fill(ribbon(face, { closed: true, w: Math.max(1, cw * 0.04), rough: 0.4, amt: 0.4, seed }), { a: 0.9, b: 0.7 }, { over: true });
  const tones = suit === 'heart' || suit === 'diamond' ? RED : BLACK;
  press.fill(pip(suit, cw * 0.26), tones);
  for (const [x, y] of [[-cw * 0.32, -ch * 0.36], [cw * 0.32, ch * 0.36]]) press.with({ x, y }, () => press.fill(pip(suit, cw * 0.09), tones));
}

const cardStamp = (suit: Suit) => stamp(`card-${suit}`, (p, S) => p.with({ x: S / 2, y: S / 2 }, () => card(p, suit, S * 0.55, 3)));

export default () =>
  spreadPage(
    21,
    (ctx) => {
      let cards: Card[] = [];
      let stormAt = -9;
      // The storm begins as the page opens (on its first frame, in the scene's own clock).
      let begin = true;
      preload(CARD_STORM);

      const deck = (f: PrintFrame) => (f.wide ? { x: f.w * 0.8, y: f.h * 0.84 } : { x: f.w * 0.78, y: f.h * 0.42 });
      const storm = (f: PrintFrame, fly: boolean) => {
        stormAt = f.t;
        music.fall();
        setTimeout(() => music.fall(), 160);
        shakeBook(0.6, ctx.reducedMotion);
        if (!fly) return;
        const d = deck(f);
        const v = f.toViewport(d.x, d.y);
        for (let i = 0; i < 9; i++) escape.launch(cardStamp(SUITS[i % 4]), v.x, v.y, { size: 46 + Math.random() * 20, vx: (Math.random() - 0.5) * 700, vy: -400 - Math.random() * 400, ay: 500, vr: (Math.random() - 0.5) * 9, drag: 0.6, fade: 0.32 });
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.6,
        copy: COPY,
        layout() {
          const R = rng(211);
          cards = Array.from({ length: 26 }, (_, i) => ({ suit: SUITS[i % 4], orbit: 0.35 + R() * 0.65, phase: R() * Math.PI * 2, speed: 0.6 + R() * 0.8, tilt: (R() - 0.5) * 0.6, delay: i * 0.06 }));
        },
        enter() {
          begin = true;
        },
        click(_x, _y, f) {
          storm(f, true);
        },
        draw(f) {
          const { press, w, h, t, boil } = f;
          const s = boil % 3;
          if (begin) {
            begin = false;
            stormAt = t;
          }
          const age = t - stormAt;

          // The courtroom in uproar: a pink wash, darkening at the floor.
          const air = new Path2D();
          air.rect(0, 0, w, h);
          press.fill(air, { b: 0.22, a: 0.1 });

          if (f.wide) press.with({ x: w * 0.26, y: h * 0.99 }, () => printFigure(press, CARD_STORM, h * 0.94, boil));
          else press.with({ x: w * 0.3, y: h * 0.48 }, () => printFigure(press, CARD_STORM, h * 0.45, boil));

          // The cards: whirling for a while, then settling one by one into a deck.
          const d = deck(f);
          const cw = f.wide ? h * 0.075 : h * 0.04;
          const cx = f.wide ? w * 0.55 : w * 0.5;
          const cy = f.wide ? h * 0.48 : h * 0.24;
          const R = f.wide ? Math.min(w * 0.45, h * 0.6) : w * 0.45;
          for (const [i, c] of cards.entries()) {
            const settle = ctx.reducedMotion ? 1 : Math.min(1, Math.max(0, (age - 2.2 - c.delay) / 0.7));
            const e = settle * settle * (3 - 2 * settle);
            const a = c.phase + t * c.speed * (1 - e);
            const sx = cx + Math.cos(a) * R * c.orbit;
            const sy = cy + Math.sin(a * 1.3) * R * 0.55 * c.orbit;
            const hx = d.x + (i % 3) * 0.6 - i * 0.15;
            const hy = d.y - i * 0.7;
            const x = sx + (hx - sx) * e;
            const y = sy + (hy - sy) * e;
            const rot = (c.tilt + Math.sin(t * 2 + i) * 0.8) * (1 - e) + (i % 2 ? 0.03 : -0.03) * e;
            press.with({ x, y, rot }, () => card(press, c.suit, cw, i + s));
          }
        },
      });
    },
    { copy: COPY },
  );
