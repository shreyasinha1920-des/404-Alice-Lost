import { Press, INKS_FALL } from '../print/press';
import { ribbon, curvy, dab, handEllipse, rng, type Pt } from '../print/brush';
import { RABBIT, preload, printFigure, printWatch } from '../print/tenniel';
import { escape, stamp } from '../print/escape';
import { wobble } from '../print/brush';

/**
 * The front cover, printed in the same riso inks as the pages: a midnight cloth
 * (blue over pink), a gilt border, a striped Cheshire-grin moon with eyes that follow
 * you, twinkling stars, and the title's hero: a giant printed 404 whose 0 is the White
 * Rabbit's pocket watch, stopped at 4:04. Tenniel's Rabbit hurries along the bottom.
 * Clicking the cover shakes stars loose; they fly out of the book.
 */
/** A fat five-pointed star, printed yellow with a pink misprint and a paper glint. */
const starStamp = (v: number) =>
  stamp(`cover-star${v}`, (p, S) => {
    const c = S / 2;
    const pts = (r: number, dx = 0, dy = 0): Pt[] => {
      const out: Pt[] = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
        const rr = k % 2 ? r * 0.46 : r;
        out.push([c + dx + Math.cos(a) * rr, c + dy + Math.sin(a) * rr]);
      }
      return out;
    };
    const r = S * 0.42;
    p.fill(curvy(wobble(pts(r, 3, 3), true, 1, 7 + v, 3)), { b: 1 });
    p.fill(curvy(wobble(pts(r), true, 1, 8 + v, 3)), v % 3 === 2 ? { c: 1, b: 0.25 } : { c: 1 });
    p.knock(curvy(handEllipse(c - r * 0.2, c - r * 0.18, r * 0.12, r * 0.08, 9 + v, 0.5)));
  });

export function coverArt(reduced: () => boolean) {
  const press = new Press(INKS_FALL);
  press.pitch = 3.8;
  const canvas = press.canvas;
  canvas.classList.add('cover__print');
  let w = 0;
  let h = 0;
  let raf = 0;
  let t = 0;
  let last = 0;
  const pointer = { x: 0.5, y: 0.3, tx: 0.5, ty: 0.3, over: false };
  const stars: { x: number; y: number; s: number; ph: number }[] = [];
  preload(RABBIT);

  const fit = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    if (Math.abs(r.width - w) > 0.5 || Math.abs(r.height - h) > 0.5) {
      w = r.width;
      h = r.height;
      press.resize(w, h, Math.min(devicePixelRatio || 1, 2));
      const R = rng(404);
      stars.length = 0;
      for (let i = 0; i < 26; i++) {
        const x = R() * w;
        const y = R() * h * 0.55;
        // keep stars off the numerals
        if (y > h * 0.28 && y < h * 0.56 && x > w * 0.08 && x < w * 0.92) continue;
        stars.push({ x, y, s: 3 + R() * 5, ph: R() * 6 });
      }
    }
    return true;
  };

  const draw = () => {
    if (!fit()) return;
    const boil = Math.floor(t * 12);
    const s = boil % 3;
    press.begin();
    const k = Math.min(w, h);

    // Cloth: deep blue over pink, with a fine weave knocked through.
    const cloth = new Path2D();
    cloth.rect(0, 0, w, h);
    press.fill(cloth, { a: 0.95, b: 0.62, c: 0.1 });
    const weave = new Path2D();
    const R = rng(7);
    for (let i = 0; i < 260; i++) dab(weave, R() * w, R() * h, R() > 0.5 ? 0 : Math.PI / 2, 5 + R() * 6, 0.6, 0);
    press.knock(weave);

    // Gilt border, drawn by hand.
    const inset = k * 0.05;
    const border: Pt[] = [[inset, inset], [w - inset, inset], [w - inset, h - inset], [inset, h - inset]];
    press.fill(ribbon(border, { closed: true, w: 3, rough: 0.4, amt: 1.2, seed: 11 + s }), { c: 1, b: 0.2, a: 0 });
    const inner: Pt[] = [[inset * 1.6, inset * 1.6], [w - inset * 1.6, inset * 1.6], [w - inset * 1.6, h - inset * 1.6], [inset * 1.6, h - inset * 1.6]];
    press.fill(ribbon(inner, { closed: true, w: 1.2, rough: 0.5, amt: 1, seed: 12 + s }), { c: 1, b: 0.2, a: 0 });

    // Stars, twinkling; brighter near the cursor.
    for (const st of stars) {
      const near = pointer.over ? Math.max(0, 1 - Math.hypot(st.x - pointer.x * w, st.y - pointer.y * h) / (k * 0.35)) : 0;
      const tw = 0.6 + 0.4 * Math.sin(t * 2 + st.ph) + near * 0.8;
      const r = st.s * tw;
      const pts: Pt[] = [];
      for (let q = 0; q < 8; q++) {
        const a = (q / 8) * Math.PI * 2 + st.ph;
        pts.push([st.x + Math.cos(a) * (q % 2 ? r * 0.25 : r), st.y + Math.sin(a) * (q % 2 ? r * 0.25 : r)]);
      }
      press.knock(curvy(pts));
      press.fill(curvy(pts), { c: 1, b: 0.15 * (st.ph % 1) }, { over: true });
    }

    // The Cheshire grin, as a striped crescent moon, and eyes that follow the cursor.
    const gx = w * 0.5;
    const gy = h * 0.17;
    const gr = k * 0.17;
    // The crescent: the outer ellipse's lower arc, back along a shallower inner arc.
    const outerAt = (q: number): Pt => [gx + Math.cos(q) * gr, gy + Math.sin(q) * gr * 0.9];
    const innerAt = (q: number): Pt => [gx + Math.cos(q) * gr * 0.98, gy - gr * 0.42 + Math.sin(q) * gr * 0.86];
    const crescent: Pt[] = [];
    for (let i = 0; i <= 24; i++) crescent.push(outerAt(-0.12 + (i / 24) * (Math.PI + 0.24)));
    for (let i = 24; i >= 0; i--) crescent.push(innerAt(-0.12 + (i / 24) * (Math.PI + 0.24)));
    const grin = curvy(crescent);
    press.knock(grin);
    press.fill(grin, { b: 1, c: 0.3 });
    // Cheshire stripes: strokes across the crescent, from inner arc to outer.
    const stripes = new Path2D();
    for (let i = 1; i < 12; i++) {
      const q = -0.12 + (i / 12) * (Math.PI + 0.24);
      ribbon([innerAt(q), outerAt(q)], { w: gr * 0.07, taper: 0.2, amt: 0.4, seed: 30 + i + s }, stripes);
    }
    press.fill(stripes, { a: 0.85, b: 0.9 }, { over: true });
    // the grin's teeth: a row of paper ticks
    const teeth = new Path2D();
    for (let i = -5; i <= 5; i++) {
      const a = Math.PI / 2 + i * 0.16;
      dab(teeth, gx + Math.cos(a) * gr * 0.78, gy + Math.sin(a) * gr * 0.7, a, gr * 0.16, gr * 0.035, 0);
    }
    press.knock(teeth);
    const lookX = (pointer.x - 0.5) * gr * 0.12;
    const lookY = (pointer.y - 0.2) * gr * 0.08;
    for (const side of [-1, 1]) {
      const ex = gx + side * gr * 0.42;
      const ey = gy - gr * 0.58;
      press.knock(curvy(handEllipse(ex, ey, gr * 0.22, gr * 0.12, 50 + side + s, 0.5)));
      press.fill(curvy(handEllipse(ex, ey, gr * 0.22, gr * 0.12, 50 + side + s, 0.5)), { c: 1, a: 0.25 });
      press.fill(curvy(handEllipse(ex + lookX, ey + lookY, gr * 0.035, gr * 0.1, 60 + side, 0.2)), { a: 1, b: 1, c: 1 });
    }

    // The 404. Fours knocked out of the cloth and printed in yellow over a pink misprint;
    // the 0 is the Rabbit's pocket watch.
    const ny = h * 0.39;
    const size = Math.round(k * 0.42);
    const font = `${size}px "IM Fell English", Georgia, serif`;
    for (const [fx, ch] of [[w * 0.2, '4'], [w * 0.8, '4']] as const) {
      press.knockText(ch, fx, ny, font);
      press.text(ch, fx + size * 0.035, ny + size * 0.03, font, { b: 1 });
      // the face of the figure: yellow only (clear the pink there), so the pink shows as a fringe
      press.text(ch, fx, ny, font, { b: 0, c: 1 }, 'center', true);
    }
    printWatch(press, w * 0.5, ny + size * 0.04, size * 0.3, pointer.over && Math.hypot(pointer.x - 0.5, pointer.y - 0.42) < 0.18 ? t * 8 : t, boil);

    // Tenniel's Rabbit, hurrying along the bottom.
    const run = (t * 0.06) % 1.4;
    const bob = Math.abs(Math.sin(t * 9)) * h * 0.006;
    press.with({ x: w * (1.15 - run), y: h * 0.955 - bob, rot: -0.08 }, () => printFigure(press, RABBIT, h * 0.2, boil));
    // a rule of grass under him
    press.fill(ribbon([[inset * 1.6, h * 0.958], [w - inset * 1.6, h * 0.952]], { w: 2, rough: 0.5, amt: 1, seed: 70 + s }), { a: 0.6, c: 1 });

    press.print(boil);
  };

  const tick = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    t += dt;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 6);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 6);
    draw();
    raf = requestAnimationFrame(tick);
  };

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.tx = (e.clientX - r.left) / r.width;
    pointer.ty = (e.clientY - r.top) / r.height;
    pointer.over = pointer.tx >= 0 && pointer.tx <= 1 && pointer.ty >= 0 && pointer.ty <= 1;
  };

  return {
    canvas,
    /** Shake stars loose: they fly out of the book. */
    burst(x: number, y: number, n = 9) {
      for (let i = 0; i < n; i++) {
        // mostly up and out, like sparks off a struck cloth
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
        const sp = 140 + Math.random() * 220;
        // they float up and out slowly, twinkling, so you can watch them leave the book
        escape.launch(starStamp(i % 3), x, y, { size: 42 + Math.random() * 38, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, ay: 60, vr: (Math.random() - 0.5) * 3, drag: 0.9, flutter: 18, fade: 0.3, vs: -0.06 });
      }
    },
    start() {
      if (reduced()) {
        t = 1;
        requestAnimationFrame(draw);
        return;
      }
      last = 0;
      addEventListener('pointermove', onMove, { passive: true });
      raf = requestAnimationFrame(tick);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      removeEventListener('pointermove', onMove);
    },
    dispose() {
      press.dispose();
    },
  };
}
