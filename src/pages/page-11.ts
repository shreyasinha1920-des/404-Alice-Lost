import './print.css';
import './act2.css';
import gsap from 'gsap';
import { spreadPage } from './art';
import { renderText } from './shared';
import { el } from '../engine/dom';
import { printScene, type PrintFrame } from '../print/scene';
import { curvy, handEllipse, scatter, dab, type Seed } from '../print/brush';
import { HOUSE, CHIMNEY, BILL, preload, printFigure } from '../print/tenniel';
import { escape, stamp } from '../print/escape';
import { music } from '../audio/music';
import { puffStamp, shakeBook } from './act2';

/**
 * Page 11: the White Rabbit's house, with Alice grown far too big for it. Tenniel's
 * vignette fills the left page: her enormous hand reaching out over the cucumber frame.
 * The book gives a gentle shake as you arrive, as if she'd just shifted inside it. On the
 * right, the chimney smokes. Click it and Bill the Lizard is kicked up it and clean out of
 * the book; then, up out of the chimney, pops a sign to try another page.
 */

const COPY: [number, number, number, number] = [0.58, 0.06, 0.36, 0.4];

const billStamp = () => stamp('bill', (p, S) => p.with({ x: S / 2, y: S * 0.98 }, () => printFigure(p, BILL, S * 0.95, 0)));

export default () => {
  let cta: HTMLElement | null = null;
  let shown = false;
  const popCta = (reduced: boolean) => {
    if (!cta || shown) return;
    shown = true;
    cta.hidden = false;
    if (!reduced) gsap.fromTo(cta, { y: 60, scale: 0.3, rotation: -14, opacity: 0 }, { y: 0, scale: 1, rotation: -3, opacity: 1, duration: 0.9, ease: 'back.out(2.4)' });
  };

  return spreadPage(
    11,
    (ctx) => {
      let bricks: Seed[] = [];
      let smoke: { x: number; y: number; born: number; r: number }[] = [];
      let smokeClock = 0;
      let kicked = -9;
      let timer = 0;
      let auto = 0;
      preload(HOUSE);
      preload(CHIMNEY);
      preload(BILL);

      const chimneyAt = (f: PrintFrame) => (f.wide ? { x: f.w * 0.78, y: f.h, s: f.h * 0.48 } : { x: f.w * 0.8, y: f.h * 0.47, s: f.h * 0.26 });
      // The chimney's mouth, in spread coordinates.
      const mouth = (f: PrintFrame) => {
        const c = chimneyAt(f);
        return { x: c.x + c.s * 0.08, y: c.y - c.s * 0.95 };
      };

      const kick = (f: PrintFrame) => {
        kicked = f.t;
        const m = mouth(f);
        const v = f.toViewport(m.x, m.y);
        const bill = billStamp();
        escape.launch(bill, v.x, v.y, { size: f.wide ? 150 : 110, vx: -80 - Math.random() * 120, vy: -1150, ay: 1100, vr: -5 - Math.random() * 4, drag: 0.2, fade: 0.25 });
        for (let i = 0; i < 8; i++) {
          escape.launch(puffStamp(i % 2), v.x + (Math.random() - 0.5) * 40, v.y, { size: 34 + Math.random() * 30, vx: (Math.random() - 0.5) * 160, vy: -160 - Math.random() * 200, drag: 1.2, fade: 0.8, vs: 0.9 });
        }
        music.creak();
        setTimeout(() => music.fall(), 120);
        shakeBook(0.8, ctx.reducedMotion);
        setTimeout(() => popCta(ctx.reducedMotion), 700);
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4.2,
        copy: COPY,
        layout(f) {
          bricks = scatter(f.w, f.h, 12, (x, y) => x > f.w * 0.5 && y > f.h * 0.48, 111);
          smoke = [];
        },
        enter() {
          // She shifts inside the house as you arrive.
          timer = window.setTimeout(() => shakeBook(0.7, ctx.reducedMotion), 450);
          // If nobody finds the chimney, the sign comes up on its own.
          auto = window.setTimeout(() => popCta(ctx.reducedMotion), 9000);
        },
        leave() {
          clearTimeout(timer);
          clearTimeout(auto);
        },
        click(x, y, f) {
          const c = chimneyAt(f);
          if (Math.abs(x - c.x) < c.s * 0.5 && y > c.y - c.s * 1.1) kick(f);
          else {
            music.chime(Math.floor(Math.random() * 4), 0);
            shakeBook(0.3, ctx.reducedMotion);
          }
        },
        draw(f) {
          const { press, w, h, t, dt, boil } = f;

          // Behind the chimney: brickwork in ruled pink strokes.
          const brickP = new Path2D();
          for (const b of bricks) dab(brickP, b.x, b.y, 0, 14 + b.r * 6, 2.4, 0.2);
          press.fill(brickP, { b: 0.4, c: 0.2 });

          // Tenniel's vignette.
          if (f.wide) press.with({ x: w * 0.25, y: h * 0.98 }, () => printFigure(press, HOUSE, h * 0.86, boil));
          else press.with({ x: w * 0.32, y: h * 0.47 }, () => printFigure(press, HOUSE, h * 0.42, boil));

          // The chimney, jolting when Bill goes up it.
          const c = chimneyAt(f);
          const jolt = Math.max(0, 1 - (t - kicked) / 0.5);
          press.with({ x: c.x + Math.sin(t * 60) * jolt * 4, y: c.y }, () => printFigure(press, CHIMNEY, c.s, boil));

          // Smoke curling up from it.
          const m = mouth(f);
          smokeClock -= dt;
          if (smokeClock <= 0) {
            smokeClock = jolt > 0 ? 0.05 : 0.6;
            smoke.push({ x: m.x, y: m.y, born: t, r: Math.random() });
          }
          const puffs = new Path2D();
          smoke = smoke.filter((p) => t - p.born < 4);
          for (const p of smoke) {
            const age = t - p.born;
            const px = p.x + Math.sin(age * 1.1 + p.r * 6) * (6 + age * 8) - age * age * 6;
            const py = p.y - age * h * 0.08;
            const rr = (5 + age * 16) * (f.wide ? 1 : 0.6);
            curvy(handEllipse(px, py, rr, rr * 0.8, Math.floor(p.r * 50), rr * 0.12), puffs);
          }
          press.fill(puffs, { a: 0.08, b: 0.05, c: 0.07 }, { over: true });
        },
      });
    },
    {
      copy: COPY,
      text: (ctx) => {
        const text = renderText(11);
        cta = el('button', { class: 'pop-cta', type: 'button', hidden: '' }, [
          el('span', { class: 'pop-cta__sign' }, 'Try another page'),
          el('span', { class: 'pop-cta__post', 'aria-hidden': 'true' }),
        ]);
        cta.addEventListener('click', () => ctx.next());
        text.append(cta);
        return text;
      },
      destroy: () => {
        cta = null;
        shown = false;
      },
    },
  );
};
