import './print.css';
import gsap from 'gsap';
import { spreadPage } from './art';
import { renderText } from './shared';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, wobble, dab, scatter, handEllipse, type Pt, type Seed } from '../print/brush';
import { ALICE_TALL, preload, printFigure, figureOf } from '../print/tenniel';
import { escape } from '../print/escape';
import { music } from '../audio/music';
import { floor, crumbStamp, shakeBook } from './act2';
import { Press, INKS_FALL } from '../print/press';

/**
 * Page 8: EAT ME. "Curiouser and curiouser!" Tenniel's Alice stands in the hall, her neck
 * already long. On the right page sits the little cake in its glass box, EAT ME marked
 * out in currants. Click it: crumbs fly out of the book, and Alice shoots up right out of
 * it, past the top of the book into the room, with a bump that shakes the book; the words
 * grow too big for their page, spilling out of their lines before they settle and reflow.
 * Then she shrinks back into her page.
 */

/** At most how much taller than her page Alice grows when she leaves the book. */
const GROW = 2.6;

/**
 * Alice printed once, large, on her own sheet, for when she grows out of the book.
 * Her paper is kept (backed with parchment) so she stays solid over the dark room.
 */
function printAlice(height: number, grow: number): HTMLCanvasElement | null {
  const fig = figureOf(ALICE_TALL);
  if (!fig) return null;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const fw = (fig.w / fig.h) * height;
  const W = Math.ceil(fw + 8);
  const H = Math.ceil(height + 4);
  const press = new Press(INKS_FALL);
  if (!press.ok) return null;
  // Scaled up with her, so at full height her dots look magnified, like everything else about her.
  press.pitch = 3.4 * grow;
  press.resize(W, H, dpr);
  press.begin();
  press.with({ x: W / 2, y: height + 2 }, () => printFigure(press, ALICE_TALL, height, 0));
  press.print(0);

  // Parchment wherever the figure is (its shape mask), then the print on top.
  const sh = fig.shape;
  const read = sh.getContext('2d')!.getImageData(0, 0, sh.width, sh.height);
  const d = read.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i + 3] = d[i];
    d[i] = 239;
    d[i + 1] = 228;
    d[i + 2] = 201;
  }
  const backing = document.createElement('canvas');
  backing.width = sh.width;
  backing.height = sh.height;
  backing.getContext('2d')!.putImageData(read, 0, 0);

  const out = document.createElement('canvas');
  out.width = Math.round(W * dpr);
  out.height = Math.round(H * dpr);
  out.className = 'alice-pop';
  out.style.width = `${W}px`;
  out.style.height = `${H}px`;
  out.setAttribute('aria-hidden', 'true');
  const g = out.getContext('2d')!;
  g.scale(dpr, dpr);
  g.drawImage(backing, W / 2 - fw / 2, 2, fw, height);
  // Clip the print to her: the loose colour washes stay inside her outline out here.
  g.globalCompositeOperation = 'source-atop';
  g.drawImage(press.canvas, 0, 0, W, H);
  (press.canvas.getContext('webgl') as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  return out;
}

const COPY: [number, number, number, number] = [0.58, 0.07, 0.36, 0.42];

export default () => {
  let quote: HTMLElement | null = null;
  return spreadPage(
    8,
    (ctx) => {
      let wall: Seed[] = [];
      let eating = false;
      let bitten = false;
      // While she's out of the book, the page leaves her spot empty.
      let out = false;
      let pop: HTMLCanvasElement | null = null;
      let popTl: gsap.core.Timeline | null = null;
      preload(ALICE_TALL);

      const aliceAt = (f: PrintFrame) => ({
        x: f.w * (f.wide ? 0.24 : 0.32),
        y: f.h * (f.wide ? 0.97 : 0.48),
        h: f.h * (f.wide ? 0.7 : 0.38),
      });

      const putBack = () => {
        popTl?.kill();
        popTl = null;
        pop?.remove();
        pop = null;
        out = false;
        eating = false;
      };

      /** Alice grows right out of the book: a big printed Alice stands where she was, and grows. */
      const growOut = (f: PrintFrame) => {
        const a = aliceAt(f);
        const feet = f.toViewport(a.x, a.y);
        const head = f.toViewport(a.x, a.y - a.h);
        const h0 = Math.max(40, feet.y - head.y);
        // Tall enough to burst well out of the book, but her face stays on screen.
        const grow = Math.max(1.4, Math.min(GROW, (feet.y - 12) / h0));
        const cv = printAlice(h0 * grow, grow);
        if (!cv) return (eating = false);
        pop = cv;
        const W = parseFloat(cv.style.width);
        const H = parseFloat(cv.style.height);
        Object.assign(cv.style, { left: `${feet.x - W / 2}px`, top: `${feet.y - H + 2}px` });
        document.body.append(cv);
        out = true;
        if (ctx.reducedMotion) {
          gsap.set(cv, { scale: 1 });
          popTl = gsap.timeline({ onComplete: putBack }).to({}, { duration: 2.5 });
          return;
        }
        gsap.set(cv, { scale: 1 / grow, transformOrigin: '50% 100%' });
        popTl = gsap
          .timeline({ onComplete: putBack })
          .to(cv, { scale: 1, duration: 1.5, ease: 'elastic.out(1, 0.45)' })
          // she bumps her head on the top of the book on the way out
          .add(() => {
            shakeBook(1.4, false);
            music.fall();
          }, 0.3)
          .to(cv, { rotation: 2.5, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: 2 }, 0.9)
          .to(cv, { rotation: 0, scale: 1 / grow, duration: 1.1, ease: 'back.in(1.2)' }, '+=0.4');
      };

      const cakeAt = (f: PrintFrame) => (f.wide ? { x: f.w * 0.76, y: f.h * 0.88, s: f.h * 0.24 } : { x: f.w * 0.78, y: f.h * 0.46, s: f.h * 0.13 });

      const eat = (f: PrintFrame) => {
        const c = cakeAt(f);
        const v = f.toViewport(c.x, c.y - c.s * 0.4);
        for (let i = 0; i < 10; i++) {
          escape.launch(crumbStamp(i), v.x, v.y, { size: 12 + Math.random() * 12, vx: (Math.random() - 0.5) * 500, vy: -240 - Math.random() * 300, ay: 800, vr: (Math.random() - 0.5) * 8, drag: 0.7, fade: 0.5 });
        }
        [0, 2, 4, 7].forEach((d, i) => setTimeout(() => music.chime(d, 0), i * 110));
        bitten = true;
        if (eating) return;
        eating = true;
        growOut(f);
        if (ctx.reducedMotion) return;
        // The words grow too: they spill past their lines, then settle and reflow.
        if (quote) {
          const px = parseFloat(getComputedStyle(quote).fontSize);
          gsap.timeline({ delay: 0.25, onComplete: () => quote && gsap.set(quote, { clearProps: 'fontSize,letterSpacing,rotation' }) })
            .to(quote, { fontSize: px * 1.75, letterSpacing: '0.04em', rotation: -2, duration: 0.9, ease: 'back.out(2)' })
            .to(quote, { fontSize: px, letterSpacing: '0em', rotation: 0, duration: 1, ease: 'elastic.out(1, 0.6)' }, '+=1.6');
        }
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.4,
        copy: COPY,
        leave: putBack,
        layout(f) {
          wall = scatter(f.w, f.h, 9, (_x, y) => y < f.h * (f.wide ? 0.7 : 0.36), 81);
        },
        click(x, y, f) {
          const c = cakeAt(f);
          if (Math.abs(x - c.x) < c.s * 0.7 && Math.abs(y - (c.y - c.s * 0.35)) < c.s * 0.6) eat(f);
          else music.chime(Math.floor(Math.random() * 5), 0);
        },
        draw(f) {
          const { press, w, h, t, boil, pointer } = f;
          const s = boil % 3;
          const floorY = h * (f.wide ? 0.7 : 0.36);
          const ceil = h * (f.wide ? 0.07 : 0.035);

          // A tall violet hall: wall of hatched panels, a cornice, a chequered floor.
          const wallP = new Path2D();
          wallP.rect(0, 0, w, floorY);
          press.fill(wallP, { a: 0.28, b: 0.3, c: 0.05 });
          const hatch = new Path2D();
          for (const p of wall) dab(hatch, p.x, p.y, -1.1, 10 + p.r * 8, 1, 0.6);
          press.fill(hatch, { a: 0.7, b: 0.5 }, { over: true });
          press.fill(ribbon([[0, ceil], [w, ceil + 3]], { w: 6, rough: 0.5, amt: 1, seed: 4 + s }), { a: 0.9, b: 0.8, c: 0.5 });
          floor(press, w, floorY, f.wide ? h : h * 0.5, s, { a: 0.55, b: 0.2, c: 0.45 });
          press.fill(ribbon([[0, floorY], [w, floorY - 2]], { w: 5, rough: 0.4, seed: 3 + s }), { a: 1, b: 0.85, c: 0.7 });

          // Alice, swaying a little (unless she's grown out of the book).
          const a = aliceAt(f);
          if (!out) press.with({ x: a.x, y: a.y, rot: Math.sin(t * 1.1) * 0.012 }, () => printFigure(press, ALICE_TALL, a.h, boil));

          // The cake in its little glass box, bobbing when you hover it.
          const c = cakeAt(f);
          const near = pointer.inside && Math.hypot(pointer.x - c.x, pointer.y - c.y) < c.s;
          const lift = near ? Math.abs(Math.sin(t * 6)) * c.s * 0.04 : 0;
          press.with({ x: c.x, y: c.y - lift }, () => cake(press, c.s, s, bitten ? 1 : 0));
        },
      });
    },
    {
      copy: COPY,
      destroy: () => document.querySelectorAll('.alice-pop').forEach((e) => e.remove()),
      text: () => {
        const t = renderText(8);
        quote = t.querySelector<HTMLElement>('.text__quote p');
        if (quote) quote.style.transformOrigin = '0 50%';
        return t;
      },
    },
  );
};

/** The little cake, `size` px across, sitting at the origin, under a glass cover. */
function cake(press: Press, size: number, s: number, eaten: number) {
  const k = size / 100;
  const P = (pts: Pt[]) => pts.map(([x, y]) => [x * k, y * k] as Pt);
  // the glass box: just its edges and a glint
  const box = P([[-48, 0], [-48, -78], [48, -78], [48, 0]]);
  press.fill(ribbon(box, { closed: true, w: 1.3 * k, rough: 0.5, amt: 0.8, seed: 20 + s }), { a: 0.7, b: 0.4 }, { over: true });
  press.fill(ribbon(P([[-40, -70], [-40, -40]]), { w: 2.4 * k, taper: 0.4, amt: 0.3, seed: 21 }), { a: 0.25 }, { over: true });
  // the plate
  press.fill(curvy(handEllipse(0, -2 * k, 40 * k, 7 * k, 22 + s, 0.6)), { a: 0.3, c: 0.15 });
  // the cake: a sponge drum with icing on top (a bite out of it once she's eaten)
  const bite = eaten > 0.02 ? 1 : 0;
  const body = P([[-30, -6], [-30, -34], [30, -34], [30, -6]]);
  press.fill(curvy(wobble(body, true, 0.6, 23 + s, 4)), { c: 0.85, b: 0.35 });
  press.fill(curvy(handEllipse(0, -34 * k, 30 * k, 8 * k, 24 + s, 0.6)), { b: 0.55, c: 0.2 });
  const drips = new Path2D();
  for (let i = -3; i <= 3; i++) ribbon(P([[i * 9, -32], [i * 9 + 1, -26 - (i % 2 ? 4 : 0)]]), { w: 3 * k, taper: 0.6, amt: 0.3, seed: 25 + i }, drips);
  press.fill(drips, { b: 0.55, c: 0.2 });
  if (bite) press.knock(curvy(handEllipse(26 * k, -30 * k, 9 * k, 9 * k, 26, 1.2)));
  press.fill(ribbon(body, { closed: true, w: 1.2 * k, rough: 0.4, amt: 0.6, seed: 27 + s }), { a: 1, b: 0.8 }, { over: true });
  // EAT ME, marked out in currants
  press.text('EAT ME', 0, -16 * k, `bold ${Math.max(8, Math.round(11 * k))}px "IM Fell English", Georgia, serif`, { a: 1, b: 0.9 });
}
