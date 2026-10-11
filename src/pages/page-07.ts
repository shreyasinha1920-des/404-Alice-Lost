import './print.css';
import gsap from 'gsap';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, wobble, dab, scatter, type Pt, type Seed } from '../print/brush';
import { ALICE_BOTTLE, preload, printFigure } from '../print/tenniel';
import { escape } from '../print/escape';
import { floor, dropStamp as dropStamp_ } from './act2';
import { music } from '../audio/music';
import type { Press } from '../print/press';

/**
 * Page 7: DRINK ME. Tenniel's Alice studies the little bottle, printed edge to edge in a
 * pink-papered hall over a chequered floor. On the right page stands the bottle itself,
 * tilting toward the cursor. Click it and the whole book shrinks, the way Alice did,
 * with a springy wobble; drops of the potion fly out into the room; then it all grows back.
 */

const COPY: [number, number, number, number] = [0.58, 0.08, 0.36, 0.42];

const dropStamp = () => dropStamp_('potion', { a: 0.75, b: 0.55 });

export default () =>
  spreadPage(
    7,
    (ctx) => {
      let wall: Seed[] = [];
      let tilt = 0;
      let wobbleT = -9;
      let shrinking = false;
      const shrink = { k: 1 };
      preload(ALICE_BOTTLE);

      const bottleAt = (f: PrintFrame) => (f.wide ? { x: f.w * 0.78, y: f.h * 0.9, s: f.h * 0.38 } : { x: f.w * 0.78, y: f.h * 0.46, s: f.h * 0.2 });

      const drink = (f: PrintFrame) => {
        music.fall();
        const b = bottleAt(f);
        const v = f.toViewport(b.x, b.y - b.s * 0.9);
        for (let i = 0; i < 9; i++) {
          escape.launch(dropStamp(), v.x, v.y, { size: 16 + Math.random() * 12, vx: (Math.random() - 0.5) * 420, vy: -260 - Math.random() * 260, ay: 700, vr: (Math.random() - 0.5) * 4, drag: 0.8, fade: 0.5 });
        }
        if (ctx.reducedMotion || shrinking) return;
        shrinking = true;
        // The whole book shrinks, as Alice did, then grows back.
        const book = document.querySelector<HTMLElement>('.book');
        const tl = gsap.timeline({
          onComplete: () => {
            shrinking = false;
            if (book) gsap.set(book, { clearProps: 'transform,scale,rotate,translate' });
          },
        });
        if (book) {
          tl.to(book, { scale: 0.32, duration: 0.9, ease: 'back.in(1.4)' })
            .to(book, { rotation: 4, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut' })
            .to(book, { scale: 1, rotation: 0, duration: 1.1, ease: 'elastic.out(1, 0.55)' }, '+=1.1');
        }
        gsap.fromTo(shrink, { k: 1 }, { k: 0.55, duration: 0.6, yoyo: true, repeat: 1, repeatDelay: 1.6, ease: 'power2.inOut' });
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4.2,
        copy: COPY,
        layout(f) {
          wall = scatter(f.w, f.h, 9, (_x, y) => y < f.h * (f.wide ? 0.66 : 0.33), 71);
        },
        click(x, y, f) {
          const b = bottleAt(f);
          if (Math.abs(x - b.x) < b.s * 0.35 && y > b.y - b.s * 1.1 && y < b.y + 10) drink(f);
          else {
            wobbleT = f.t;
            music.chime(Math.floor(Math.random() * 6), 0);
          }
        },
        draw(f) {
          const { press, w, h, t, pointer, boil } = f;
          const s = boil % 3;
          const floorY = h * (f.wide ? 0.66 : 0.33);

          // The hall: pink wallpaper with a hatched stripe, a chequered floor in perspective.
          const wallP = new Path2D();
          wallP.rect(0, 0, w, floorY);
          press.fill(wallP, { b: 0.32, c: 0.12 });
          const stripes = new Path2D();
          for (const p of wall) dab(stripes, p.x, p.y, Math.PI / 2, 12 + p.r * 8, 1.1, 0.5);
          press.fill(stripes, { b: 0.7 }, { over: true });
          floor(press, w, floorY, f.wide ? h : h * 0.5, s);
          // the skirting
          press.fill(ribbon([[0, floorY], [w, floorY - 2]], { w: 5, rough: 0.4, seed: 3 + s }), { a: 1, b: 0.85, c: 0.7 });

          // Tenniel's Alice, a little smaller while the potion works.
          const ax = f.wide ? w * 0.25 : w * 0.3;
          const ay = f.wide ? h * 0.97 : h * 0.48;
          const ah = h * (f.wide ? 0.9 : 0.46) * shrink.k;
          press.with({ x: ax, y: ay }, () => printFigure(press, ALICE_BOTTLE, ah, boil));

          // The bottle: tilting toward the cursor, wobbling when the page is touched.
          const b = bottleAt(f);
          const want = pointer.inside ? Math.max(-0.25, Math.min(0.25, (pointer.x - b.x) / (w * 0.8))) : Math.sin(t * 0.9) * 0.04;
          tilt += (want - tilt) * Math.min(1, f.dt * 4);
          const wob = Math.max(0, 1 - (t - wobbleT) / 0.8) * Math.sin((t - wobbleT) * 30) * 0.12;
          press.with({ x: b.x, y: b.y, rot: tilt + wob }, () => bottle(press, b.s, s, t));
        },
      });
    },
    { copy: COPY },
  );

/** The DRINK ME bottle, ~1 unit tall in `size` px, base at the origin. */
function bottle(press: Press, size: number, s: number, t: number) {
  const k = size / 100;
  const P = (pts: Pt[]) => pts.map(([x, y]) => [x * k, y * k] as Pt);
  const body = P([[-6, -100], [6, -100], [6, -78], [22, -60], [24, -8], [18, 0], [-18, 0], [-24, -8], [-22, -60], [-6, -78]]);
  // glass: blue over a little pink, with a highlight knocked out
  press.fill(curvy(wobble(body, true, 0.8, 5 + s, 4)), { a: 0.6, b: 0.3 });
  press.knock(ribbon(P([[-14, -56], [-15, -20]]), { w: 3 * k, taper: 0.3, amt: 0.3, seed: 7 }));
  // the potion inside, sloshing
  const level = -38 + Math.sin(t * 2.4) * 2;
  const potion = P([[-21, level], [21, level + Math.sin(t * 3) * 2], [22, -8], [17, -1], [-17, -1], [-22, -8]]);
  press.fill(curvy(wobble(potion, true, 0.6, 9 + s, 4)), { a: 0.9, b: 0.75 }, { over: true });
  // cork and outline
  press.fill(curvy(wobble(P([[-7, -112], [7, -112], [6, -99], [-6, -99]]), true, 0.4, 11 + s, 3)), { c: 0.8, b: 0.4 });
  press.fill(ribbon(body, { closed: true, w: 1.6 * k, rough: 0.4, amt: 0.6, seed: 12 + s }), { a: 1, b: 0.8 }, { over: true });
  // the paper label, tied round the neck, and its words
  const label = P([[-27, -68], [25, -71], [27, -46], [-25, -43]]);
  press.knock(curvy(wobble(label, true, 0.5, 13 + s, 4)));
  press.fill(ribbon(label, { closed: true, w: 1 * k, rough: 0.4, seed: 14 }), { a: 1, b: 0.8 }, { over: true });
  press.fill(ribbon(P([[-4, -82], [-16, -70]]), { w: 0.8 * k, amt: 0.3, seed: 15 }), { a: 1, b: 0.8 });
  press.text('DRINK ME', 0, -54 * k, `italic ${Math.max(7, Math.round(7.5 * k))}px "IM Fell English", Georgia, serif`, { a: 1, b: 0.85 });
}
