import './print.css';
import gsap from 'gsap';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, handEllipse, type Pt } from '../print/brush';
import { QUEEN, preload, printFigure } from '../print/tenniel';
import { escape, stamp } from '../print/escape';
import { renderText } from './shared';
import { music } from '../audio/music';
import { shakeBook } from './act2';
import type { Press } from '../print/press';

/**
 * Page 19: "Off with her head!" Tenniel's Queen of Hearts, in full cry, fills the left page
 * with her court. A moment after you arrive, the whole spread flushes red, the words shake,
 * and a royal seal in red wax slams down across the page: 404. Click anywhere and she
 * stamps another (she has plenty), and little hearts fly out of the book.
 */

const COPY: [number, number, number, number] = [0.58, 0.06, 0.36, 0.42];

interface Seal {
  x: number;
  y: number;
  born: number;
  rot: number;
  r: number;
}

const heartStamp = (v: number) =>
  stamp(`heart${v}`, (p, S) => {
    const c = S / 2;
    const pts: Pt[] = [];
    for (let k = 0; k <= 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(a), 3);
      const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
      pts.push([c + x * S * 0.025, c + y * S * 0.025]);
    }
    p.fill(curvy(pts), v % 2 ? { b: 1, c: 0.35 } : { b: 0.9 });
  });

export default () => {
  let text: HTMLElement | null = null;
  return spreadPage(
    19,
    (ctx) => {
      let seals: Seal[] = [];
      let flush = -9;
      // When the first seal comes down, in the scene's own clock (set on the first frame after arriving).
      let firstAt: number | null = null;
      let arrived = false;
      preload(QUEEN);

      const slam = (f: PrintFrame, x: number, y: number) => {
        seals.push({ x, y, born: f.t, rot: (Math.random() - 0.5) * 0.5, r: (f.wide ? f.h * 0.14 : f.h * 0.07) * (0.85 + Math.random() * 0.3) });
        if (seals.length > 7) seals.shift();
        flush = f.t;
        music.fall();
        setTimeout(() => music.chime(0, -1), 80);
        shakeBook(1.1, ctx.reducedMotion);
        if (text && !ctx.reducedMotion) gsap.fromTo(text, { x: 0 }, { keyframes: [{ x: -7 }, { x: 6 }, { x: -4 }, { x: 3 }, { x: 0 }], duration: 0.4, ease: 'none' });
        const v = f.toViewport(x, y);
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2;
          escape.launch(heartStamp(i), v.x, v.y, { size: 16 + Math.random() * 14, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 - 120, ay: 380, vr: (Math.random() - 0.5) * 6, drag: 0.6, fade: 0.5 });
        }
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.6,
        copy: COPY,
        layout() {
          seals = [];
        },
        enter() {
          arrived = true;
        },
        leave() {
          arrived = false;
          firstAt = null;
          seals = [];
        },
        click(x, y, f) {
          slam(f, x, y);
        },
        draw(f) {
          const { press, w, h, t, boil } = f;
          // She sees you, and the first seal comes down.
          if (arrived && firstAt === null) firstAt = t + 1.3;
          if (firstAt !== null && t >= firstAt && !seals.length) {
            firstAt = Infinity;
            slam(f, w * (f.wide ? 0.77 : 0.72), h * (f.wide ? 0.78 : 0.4));
          }
          const s = boil % 3;

          // The croquet ground: pale lawn, a hedge wall.
          const air = new Path2D();
          air.rect(0, 0, w, h);
          press.fill(air, { c: 0.18, b: 0.08 });
          const hedge = new Path2D();
          hedge.rect(0, 0, w, h * (f.wide ? 0.3 : 0.16));
          press.fill(hedge, { a: 0.45, c: 0.7 }, { over: true });

          if (f.wide) press.with({ x: w * 0.25, y: h * 0.99 }, () => printFigure(press, QUEEN, h * 0.86, boil));
          else press.with({ x: w * 0.5, y: h * 0.48 }, () => printFigure(press, QUEEN, h * 0.42, boil));

          // The flush of her temper, washing the whole spread red and fading.
          const k = Math.max(0, 1 - (t - flush) / 1.2);
          if (k > 0) {
            const wash = new Path2D();
            wash.rect(0, 0, w, h);
            press.fill(wash, { b: 0.55 * k }, { over: true });
          }

          for (const seal of seals) waxSeal(press, seal, t, s);
        },
      });
    },
    {
      copy: COPY,
      text: () => (text = renderText(19)),
    },
  );
};

/** A red wax seal stamped 404, with a heart above: it slams down, then settles. */
function waxSeal(press: Press, seal: Seal, t: number, s: number) {
  const age = t - seal.born;
  const slamK = Math.max(0, 1 - age / 0.18);
  const sc = 1 + slamK * 0.9;
  press.with({ x: seal.x, y: seal.y, rot: seal.rot, s: sc }, () => {
    const r = seal.r;
    // the scalloped edge of the wax
    const edge: Pt[] = [];
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const rr = r * (k % 2 ? 0.92 : 1.02);
      edge.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    const wax = curvy(edge);
    press.knock(wax);
    press.fill(wax, { b: 1, c: 0.32, a: 0.08 });
    press.fill(ribbon(handEllipse(0, 0, r * 0.74, r * 0.74, 7 + s, r * 0.03), { closed: true, w: r * 0.06, rough: 0.4, amt: 0.4, seed: 8 }), { a: 0.35, b: 1, c: 0.5 }, { over: true });
    // 404, pressed in: paper showing through
    press.knockText('404', 0, r * 0.18, `${Math.round(r * 0.62)}px "IM Fell English", Georgia, serif`);
    // a little heart above it
    const heart: Pt[] = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      heart.push([16 * Math.pow(Math.sin(a), 3) * r * 0.012, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r * 0.012 - r * 0.42]);
    }
    press.knock(curvy(heart));
  });
}
