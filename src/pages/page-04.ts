import './act1.css';
import './print.css';
import gsap from 'gsap';
import { el } from '../engine/dom';
import { renderText } from './shared';
import { spreadPage } from './art';
import { printScene } from '../print/scene';
import { dab, rng } from '../print/brush';
import { escape } from '../print/escape';
import { propStamp } from '../print/stamps';
import { RABBIT, preload, printFigure } from '../print/tenniel';
import { printProp, printKey, type Prop } from '../print/props';
import type { Tones } from '../print/press';
import { music } from '../audio/music';

/**
 * Page 4: down the rabbit hole. Scrolling no longer turns the page; it is the fall.
 *
 * Left, printed in riso inks onto the page: a well of curved brush strokes spiralling
 * toward you, faster as you scroll, into a deep overprinted dark. Tenniel's White Rabbit
 * tumbles down it ahead of you, and hand-drawn jars, clocks, books and maps fly past.
 * The cursor steers your view; a click drops a little golden key after him.
 *
 * Right: the quote, and a depth gauge that tracks how far you have fallen.
 */

const STOPS = ['The surface', 'Roots', 'Cupboards & shelves', 'The centre of the earth?'];

export default () => {
  // ---- Right page: text, depth gauge, and the cue to start falling ----
  const marker = el('span', { class: 'depth__marker', 'aria-hidden': 'true' }, '◆');
  const fill = el('span', { class: 'depth__fill' });
  const gauge = el('div', { class: 'depth', role: 'progressbar', 'aria-label': 'How far you have fallen', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, [
    el('div', { class: 'depth__track' }, [fill, marker]),
    el('ol', { class: 'depth__stops' }, STOPS.map((s) => el('li', {}, s))),
  ]);
  const cueText = el('span', { class: 'fall-cue__text' }, 'Scroll, or drag, to fall');
  const cue = el('p', { class: 'fall-cue', 'aria-hidden': 'true' }, [el('span', { class: 'fall-cue__hand' }, '☟'), cueText]);

  // GSAP eases the raw scroll progress so the tumble never judders.
  const fall = { p: 0, speed: 0 };
  const keys: { t: number; x: number; y: number; rot: number }[] = [];

  const setProgress = (p: number, v: number) => {
    gsap.to(fall, { p, duration: 0.7, ease: 'power3.out', overwrite: true });
    fall.speed = Math.min(3, Math.abs(v));
    gsap.to(marker, { left: `${p * 100}%`, duration: 0.5, ease: 'power3.out', overwrite: true });
    gsap.to(fill, { scaleX: p, duration: 0.5, ease: 'power3.out', overwrite: true });
    gauge.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    const stop = Math.min(STOPS.length - 1, Math.floor(p * STOPS.length * 0.999));
    gauge.querySelectorAll('li').forEach((li, i) => {
      const here = i === stop;
      if (here && !li.classList.contains('is-here') && p > 0.02) music.chime(i * 2, 1);
      li.classList.toggle('is-here', here);
    });
    const atEnd = p > 0.97;
    cue.classList.toggle('is-hidden', p > 0.03 && !atEnd);
    cueText.textContent = atEnd ? 'Keep scrolling to land' : 'Scroll, or drag, to fall';
  };

  const COPY: [number, number, number, number] = [0.58, 0.08, 0.36, 0.62];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  return spreadPage(
    4,
    (ctx) => {
      // The tunnel: brush dabs in depth (z: 0 far, 1 at your face), each a short curved stroke.
      const rand = rng(9);
      const N = 1400;
      const parts = Array.from({ length: N }, () => ({ a: rand() * Math.PI * 2, z: rand(), r: rand() }));
      const things: { a: number; z: number; kind: Prop; spin: number; tones: Tones }[] = [];
      let thingClock = 0;
      const view = { x: 0.5, y: 0.5 };
      let spin = 0;
      let entered = 0;
      preload(RABBIT);

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4.2,
        copy: COPY,
        layout() {},
        enter() {
          entered = performance.now();
        },
        click(x, y, f) {
          keys.push({ t: f.t, x, y, rot: Math.random() * 6 });
          music.fall();
        },
        draw(f) {
          const { press, w, h, dt, t, pointer, boil } = f;
          const p = ctx.reducedMotion ? 0.35 : fall.p;
          // You look where you point: the vanishing point drifts toward the cursor.
          // The well sits on the left page (or the top of a phone page), leaving room for the copy.
          const bx = f.wide ? 0.3 : 0.5;
          const by = f.wide ? 0.5 : 0.25;
          const tx = pointer.inside ? bx + (pointer.x / w - bx) * 0.35 : bx;
          const ty = pointer.inside ? by + (pointer.y / h - by) * 0.3 : by;
          view.x += (tx - view.x) * Math.min(1, dt * 2.5);
          view.y += (ty - view.y) * Math.min(1, dt * 2.5);
          const cx = w * view.x;
          const cy = h * view.y;
          const R = Math.hypot(w, h) * 0.72;
          const rush = 0.06 + p * 0.35 + fall.speed * 0.5 + pointer.speed / 9000;
          spin += dt * (0.25 + p * 0.6 + fall.speed * 0.8);

          // The well's darkness: a deep overprint at the centre, opening out to paper.
          const ground = new Path2D();
          ground.rect(0, 0, w, h);
          const ramp = (lo: number, hi: number) => (g: CanvasRenderingContext2D) => {
            const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R * (0.45 + p * 0.35));
            const v = (k: number) => `rgb(${Math.round(k * 255)},${Math.round(k * 255)},${Math.round(k * 255)})`;
            gr.addColorStop(0, v(hi));
            gr.addColorStop(0.18, v(hi * 0.85));
            gr.addColorStop(1, v(lo));
            return gr;
          };
          press.fill(ground, { a: ramp(0.08 + p * 0.25, 0.95), b: ramp(0, 0.75), c: ramp(0, 0.45) });

          // Spiral strokes: cobalt near you, paper strokes knocked through in the depths.
          const near = new Path2D();
          const deep = new Path2D();
          for (const q of parts) {
            const rr = R * Math.pow(q.z, 2.1);
            const a = q.a + spin * (0.6 + q.r * 0.4);
            const px = cx + Math.cos(a) * rr;
            const py = cy + Math.sin(a) * rr;
            const sa = a + Math.PI / 2 - 0.6;
            const len = 4 + rr * (0.1 + rush * 0.08);
            const wd = 0.8 + q.z * 2.4;
            if (q.r < 0.55) dab(near, px, py, sa, len, wd, len * 0.12);
            else if (q.r > 0.7 && q.z < 0.75) dab(deep, px, py, sa, len, wd * 0.8, len * 0.12);
          }
          press.fill(near, { a: 1 }, { over: true });
          press.knock(deep);
          if (!ctx.reducedMotion) {
            for (const q of parts) {
              q.z += dt * rush * (0.4 + q.z);
              if (q.z > 1) {
                q.z = 0.02 + rand() * 0.05;
                q.a = rand() * Math.PI * 2;
              }
            }
          }

          // Things from the well flying past, drawn by hand.
          thingClock -= dt * (1 + fall.speed * 3);
          if (thingClock <= 0 && !ctx.reducedMotion) {
            thingClock = 1.4 + rand() * 1.6;
            const kinds: Prop[] = ['jar', 'clock', 'book', 'cup', 'map'];
            const palette: Tones[] = [{ b: 0.9, c: 0.7 }, { c: 1 }, { b: 0.85 }, { a: 0.5, c: 0.9 }];
            things.push({ a: rand() * Math.PI * 2, z: 0.05, kind: kinds[Math.floor(rand() * 5)], spin: (rand() - 0.5) * 4, tones: palette[Math.floor(rand() * 4)] });
          }
          for (const th of things) {
            const was = th.z;
            th.z += dt * rush * 0.6 * (0.4 + th.z);
            const rr = R * Math.pow(th.z, 2.1);
            const a = th.a + spin * 0.6;
            const x = cx + Math.cos(a) * rr;
            const y = cy + Math.sin(a) * rr;
            const sc = 0.25 + th.z * 1.6;
            // Reaching you, it leaps out of the book and keeps coming.
            if (was <= 0.92 && th.z > 0.92 && x > 0 && x < w && y > 0 && y < h) {
              const v = f.toViewport(x, y);
              escape.launch(propStamp(th.kind, th.tones), v.x, v.y, {
                size: 40 * sc * 1.2,
                vx: Math.cos(a) * 260,
                vy: Math.sin(a) * 260,
                vs: 1.6,
                rot: t * th.spin,
                vr: th.spin,
                drag: 0.9,
                fade: 1.1,
              });
              th.z = 2;
              continue;
            }
            if (th.z <= 1) press.with({ x, y, rot: t * th.spin, s: sc }, () => printProp(press, th.kind, th.tones, boil));
          }
          while (things.length && things[0].z > 1) things.shift();

          // Tenniel's Rabbit, tumbling away down the tunnel ahead of you.
          const since = (performance.now() - entered) / 1000;
          const appear = ctx.reducedMotion ? 1 : Math.min(1, since / 0.9);
          const k = Math.pow(p, 0.8);
          const sx0 = f.wide ? w * 0.16 : w * 0.24;
          const sy0 = f.wide ? h * 0.97 : h * 0.47;
          const rx = sx0 + (cx - sx0) * k + Math.sin(k * 9) * w * 0.04 * (1 - k);
          const ry = sy0 + (cy - sy0) * k + (1 - appear) * 40;
          const size = h * (f.wide ? 0.62 : 0.3) * (1 - k * 0.96);
          if (k < 0.97) press.with({ x: rx, y: ry, rot: k * 11 + Math.sin(t * 1.6) * 0.03 * (1 - k) }, () => printFigure(press, RABBIT, size, boil));

          // Golden keys you dropped, following him down.
          for (const key of keys) {
            const age = (t - key.t) / 1.8;
            if (age > 1) continue;
            const e = age * age;
            press.with({ x: key.x + (cx - key.x) * e, y: key.y + (cy - key.y) * e, rot: key.rot + age * 14, s: 1.1 * (1 - e * 0.95) }, () => printKey(press, boil));
          }
          while (keys.length && t - keys[0].t > 1.8) keys.shift();
        },
      });
    },
    {
      scrollLength: 2400,
      copy: COPY,
      progress: (p, v) => setProgress(reduced.matches ? 0.35 : p, v),
      destroy: () => gsap.killTweensOf([fall, marker, fill]),
      text: () => {
        const text = renderText(4);
        text.querySelector('.text__quote')!.after(gauge, cue);
        return text;
      },
    },
  );
};
