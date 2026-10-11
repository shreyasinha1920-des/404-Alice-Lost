import './print.css';
import './act3.css';
import { spreadPage } from './art';
import { renderText } from './shared';
import { el } from '../engine/dom';
import site from '../site.config';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, wobble, dab, rng, type Pt } from '../print/brush';
import { ALICE_WOOD, preload, printFigure } from '../print/tenniel';
import { stamp, escape } from '../print/escape';
import { leafStamp } from '../print/stamps';
import { music } from '../audio/music';

/**
 * Page 13: lost in the wood. Brush-drawn trees grow up across both pages when the page
 * opens and lean away from your cursor like a breeze going through; Tenniel's Alice stands
 * among them. On the right, a signpost points every which way, and every board is a real
 * link: the case studies on the portfolio. Click the wood and leaves fall out of the book.
 */

const COPY: [number, number, number, number] = [0.57, 0.05, 0.37, 0.88];

interface Tree {
  x: number;
  h: number;
  lean: number;
  girth: number;
  seed: number;
  leaves: { a: number; r: number; s: number }[];
}

/** A plank cut into an arrow, printed once; the label is real text on top of it. */
const plankStamp = (left: boolean, v: number) =>
  stamp(`plank-${left ? 'l' : 'r'}${v}`, (p, S) => {
    const y0 = S * 0.36;
    const y1 = S * 0.64;
    const pts: Pt[] = left
      ? [[S * 0.04, S * 0.5], [S * 0.16, y0], [S * 0.97, y0 + 1], [S * 0.96, y1], [S * 0.16, y1 - 1]]
      : [[S * 0.03, y0], [S * 0.84, y0 + 1], [S * 0.96, S * 0.5], [S * 0.84, y1], [S * 0.04, y1 - 1]];
    const tones = [{ b: 0.75, a: 0.45 }, { a: 0.7, c: 0.5 }, { c: 0.8, b: 0.5, a: 0.25 }][v % 3];
    p.fill(curvy(wobble(pts, true, 0.5, 3 + v, 4)), tones);
    const grain = new Path2D();
    for (let k = 0; k < 3; k++) ribbon([[S * 0.12, y0 + (k + 1) * S * 0.07], [S * 0.9, y0 + (k + 1) * S * 0.07 + 1]], { w: 0.8, taper: 0.5, amt: 0.4, seed: k + v }, grain);
    p.fill(grain, { a: 0.9, b: 0.6 }, { over: true });
    p.fill(ribbon(pts, { closed: true, w: 1.6, rough: 0.5, amt: 0.6, seed: 9 + v }), { a: 1, b: 0.85 }, { over: true });
  }, 2.4);

export default () =>
  spreadPage(
    13,
    (ctx) => {
      let trees: Tree[] = [];
      let born = 0;
      let breeze = 0;
      preload(ALICE_WOOD);

      const groundY = (f: PrintFrame) => (f.wide ? f.h * 0.97 : f.h * 0.48);

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.8,
        copy: COPY,
        layout(f) {
          const R = rng(131);
          const n = f.wide ? 9 : 6;
          trees = Array.from({ length: n }, (_, i) => {
            const x = (f.wide ? f.w * 0.52 : f.w) * ((i + 0.3 + R() * 0.4) / n) + (f.wide ? 0 : 0);
            const h = (f.wide ? f.h : f.h * 0.48) * (0.7 + R() * 0.28);
            return {
              x,
              h,
              lean: (R() - 0.5) * 0.15,
              girth: 10 + R() * 14,
              seed: i * 17,
              leaves: Array.from({ length: 60 }, () => ({ a: R() * Math.PI * 2, r: Math.sqrt(R()), s: R() })),
            };
          });
          // a couple more trees standing behind the signpost on the right page
          if (f.wide) for (const fx of [0.66, 0.93]) trees.push({ x: f.w * fx, h: f.h * (0.8 + R() * 0.15), lean: (R() - 0.5) * 0.1, girth: 12 + R() * 8, seed: Math.floor(fx * 100), leaves: Array.from({ length: 30 }, () => ({ a: R() * Math.PI * 2, r: Math.sqrt(R()), s: R() })) });
        },
        enter() {
          born = performance.now() / 1000;
        },
        click(x, y, f) {
          breeze += 1;
          music.chime(Math.floor(Math.random() * 5), 0);
          const v = f.toViewport(x, y);
          for (let i = 0; i < 5; i++) escape.launch(leafStamp(i), v.x, v.y, { size: 22 + Math.random() * 14, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 60, ay: 50, flutter: 60, vr: (Math.random() - 0.5) * 4, drag: 0.85, fade: 0.25 });
        },
        draw(f) {
          const { press, w, h, t, dt, boil, pointer } = f;
          const s = boil % 3;
          const gy = groundY(f);
          // Trees grow up when the page opens.
          const grow = ctx.reducedMotion ? 1 : Math.min(1, (performance.now() / 1000 - born) / 1.8);
          const ease = 1 - Math.pow(1 - grow, 3);
          breeze *= Math.pow(0.4, dt);

          // Dusk in the wood: a green-blue wash, lighter at the floor.
          const air = new Path2D();
          air.rect(0, 0, w, h);
          press.fill(air, { a: 0.28, c: 0.3, b: 0.06 });
          const floorP = new Path2D();
          floorP.rect(0, gy - h * 0.06, w, h);
          press.fill(floorP, { a: 0.3, c: 0.55 }, { over: true });

          for (const tr of trees) {
            // Lean away from the cursor, like a breeze through the wood.
            const push = pointer.inside ? Math.max(-1, Math.min(1, (tr.x - pointer.x) / (w * 0.25))) * Math.max(0, 1 - Math.abs(tr.x - pointer.x) / (w * 0.4)) : 0;
            const sway = Math.sin(t * 0.8 + tr.seed) * 0.02 + push * 0.08 + breeze * Math.sin(t * 6 + tr.seed) * 0.04;
            const H = tr.h * ease;
            const top: Pt = [tr.x + (tr.lean + sway) * H, gy - H];
            const mid: Pt = [tr.x + (tr.lean + sway * 0.4) * H * 0.5, gy - H * 0.5];
            press.fill(ribbon([[tr.x, gy], mid, top], { w: tr.girth, taper: 0.75, rough: 0.5, amt: 1.2, seed: tr.seed + s }), { a: 0.55, b: 0.45, c: 0.8 });
            // bark
            const bark = new Path2D();
            for (let k = 0; k < 6; k++) dab(bark, tr.x + (mid[0] - tr.x) * (k / 6), gy - H * (k / 7), Math.PI / 2, 10, 1.2, 0.3);
            press.knock(bark);
            // the crown: dabs of leaf in three greens
            const crown = [new Path2D(), new Path2D(), new Path2D()];
            const cr = (f.wide ? h * 0.2 : h * 0.1) * ease;
            for (const [i, l] of tr.leaves.entries()) {
              const lx = top[0] + Math.cos(l.a) * l.r * cr * 1.4;
              const ly = top[1] + Math.sin(l.a) * l.r * cr + cr * 0.2;
              dab(crown[i % 3], lx, ly, l.a + sway * 4, 16 + l.s * 14, 5 + l.s * 4, 0.5);
            }
            press.fill(crown[0], { a: 0.95, c: 1 }, { over: true });
            press.fill(crown[1], { a: 0.5, c: 1 }, { over: true });
            press.fill(crown[2], { a: 0.2, c: 0.95 }, { over: true });
          }

          // Alice, lost among them.
          const ah = f.wide ? h * 0.52 : h * 0.3;
          press.with({ x: f.wide ? w * 0.3 : w * 0.5, y: gy }, () => printFigure(press, ALICE_WOOD, ah, boil));

          // The signpost the boards hang from (right page, behind the copy's boards).
          if (f.wide) {
            const px = w * 0.585;
            press.fill(ribbon([[px, h * 0.99], [px + 2, h * 0.36]], { w: 9, taper: 0.1, rough: 0.5, amt: 1, seed: 5 + s }), { a: 0.85, b: 0.7, c: 0.6 });
          }
        },
      });
    },
    {
      copy: COPY,
      text: () => {
        const text = renderText(13);
        // Every board points somewhere real: the case studies on the portfolio.
        const boards = site.pages.filter((p) => p.label !== 'Resume').slice(0, 7);
        const signs = el(
          'nav',
          { class: 'signs', 'aria-label': 'Signposts to her work' },
          boards.map((p, i) => {
            const left = i % 2 === 1;
            const cv = plankStamp(left, i);
            const a = el('a', { class: `sign${left ? ' sign--left' : ''}`, href: p.url }, p.label);
            a.style.setProperty('--tilt', `${(i % 3 === 0 ? -1 : 1) * (2 + (i % 4))}deg`);
            if (cv) a.style.backgroundImage = `url(${cv.toDataURL()})`;
            a.style.backgroundSize = '100% 357%';
            a.style.backgroundPosition = 'center';
            a.addEventListener('pointerenter', () => music.chime(i, 0));
            return a;
          }),
        );
        text.querySelector('.text__hint')!.before(signs);
        return text;
      },
    },
  );
