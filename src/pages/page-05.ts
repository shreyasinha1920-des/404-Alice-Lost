import './act1.css';
import './print.css';
import { el, brokenPath } from '../engine/dom';
import { renderText } from './shared';
import { spreadPage } from './art';
import { printScene } from '../print/scene';
import { dab, ribbon, curvy, wobble, scatter, rng, type Pt, type Seed } from '../print/brush';
import { escape } from '../print/escape';
import { propStamp } from '../print/stamps';
import { printProp, type Prop } from '../print/props';
import type { Press, Tones } from '../print/press';
import { music } from '../audio/music';

/**
 * Page 5: mid-fall, printed in riso inks onto the page. The walls of the well slide
 * upward in vertical brush strokes, lined with hand-drawn shelves of books; things drift
 * past (jars, clocks, books, maps) along with gold paper tags carrying the pieces of the
 * URL that brought you here. The cursor nudges things aside; click one to catch it and
 * read what it is. Scroll speed is fall speed.
 */

const LABELS: Record<Prop, string[]> = {
  jar: ['ORANGE MARMALADE', '(empty, to her great disappointment)'],
  clock: ['A clock', 'stopped at 4:04'],
  book: ['A book', 'with no pictures or conversations'],
  cup: ['A teacup', 'for a tea party, later'],
  map: ['A map', 'of somewhere you meant to go'],
};

const PALETTE: Tones[] = [{ b: 0.9, c: 0.7 }, { c: 1 }, { b: 0.85 }, { a: 0.5, c: 0.9 }];
const BOOKS: Tones[] = [{ b: 0.9 }, { c: 1 }, { a: 0.6, c: 0.9 }, { a: 0.8 }, { b: 0.7, c: 0.8 }];

interface Faller {
  kind: Prop | 'frag';
  x: number;
  y: number;
  vx: number;
  rot: number;
  vr: number;
  size: number;
  tones: Tones;
  text?: string;
  caught: number;
}

/** The broken path, split at slashes and punctuation. Printed as text, so only ever text. */
function fragments(): string[] {
  const parts = brokenPath(48).split(/(?=[/?#&=.-])/).filter(Boolean);
  return parts.length ? parts : ['/', 'missing'];
}

export default () => {
  let speed = 0;
  let fallen = 0;
  const miles = el('span', { class: 'fall-miles__n' }, '0');
  const pieces = fragments();

  const COPY: [number, number, number, number] = [0.6, 0.16, 0.32, 0.5];

  return spreadPage(
    5,
    (ctx) => {
      let wall: Seed[] = [];
      let stars: Seed[] = [];
      let fallers: Faller[] = [];
      let wallY = 0;
      let label: { lines: string[]; x: number; y: number; t: number } | null = null;
      const rand = rng(21);

      const spawn = (w: number, h: number, y: number, i: number): Faller => {
        const frag = i % 3 === 0;
        const kinds: Prop[] = ['jar', 'clock', 'book', 'cup', 'map'];
        return {
          kind: frag ? 'frag' : kinds[i % 5],
          x: w * (0.12 + rand() * 0.76),
          y,
          vx: 0,
          rot: rand() * 6,
          vr: (rand() - 0.5) * 1.2,
          size: Math.min(w, h) * (frag ? 0.12 : 0.12 + rand() * 0.05),
          tones: PALETTE[i % PALETTE.length],
          text: frag ? pieces[Math.floor(i / 3) % pieces.length] : undefined,
          caught: -1,
        };
      };

      let wallW = 0;
      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4.2,
        copy: COPY,
        layout(f) {
          const { w, h } = f;
          wallW = f.wide ? w * 0.09 : w * 0.16;
          const sw = wallW;
          wall = scatter(w, h + 120, 6, (x) => x < sw || x > w - sw, 31);
          stars = scatter(w, h, 24, () => true, 32);
          fallers = Array.from({ length: f.wide ? 12 : 8 }, (_, i) => spawn(w, h, rand() * h, i));
        },
        click(x, y, f) {
          let best: Faller | null = null;
          let bestD = Infinity;
          for (const fl of fallers) {
            const d = Math.hypot(fl.x - x, fl.y - y);
            if (d < fl.size * 0.9 && d < bestD) {
              best = fl;
              bestD = d;
            }
          }
          if (best) {
            best.caught = f.t;
            const lines = best.kind === 'frag' ? ['A piece of your link:', best.text ?? ''] : LABELS[best.kind];
            label = { lines, x: best.x, y: best.y, t: f.t };
            music.chime(best.kind === 'frag' ? 6 : 3, 1);
          } else {
            music.chime(0, 0);
          }
        },
        draw(f) {
          const { press, w, h, dt, t, pointer, boil } = f;
          const v = (40 + speed * 700) * dt;
          if (!ctx.reducedMotion) {
            fallen += v;
            wallY = (wallY + v * 1.3) % 120;
          }
          miles.textContent = Math.round(fallen / 9).toLocaleString('en-GB');

          // The dark of the well: blue and pink overprinting to night, stars knocked out of it.
          const sky = new Path2D();
          sky.rect(0, 0, w, h);
          press.fill(sky, { a: 0.6, b: (g) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgb(60,60,60)'); gr.addColorStop(1, 'rgb(150,150,150)'); return gr; } });
          const starPath = new Path2D();
          for (const p of stars) {
            const y = (((p.y - fallen * 0.3 * (0.3 + p.r)) % h) + h) % h;
            const s = 0.7 + p.r * 1.3;
            starPath.moveTo(p.x + s, y);
            starPath.arc(p.x, y, s, 0, Math.PI * 2);
          }
          press.knock(starPath);

          // The walls: vertical brush strokes sliding upward.
          const sw = wallW;
          const wallFill = new Path2D();
          wallFill.rect(0, 0, sw, h);
          wallFill.rect(w - sw, 0, sw, h);
          press.fill(wallFill, { a: 0.55, b: 0.35, c: 0.5 });
          const grain = new Path2D();
          const shine = new Path2D();
          for (const p of wall) {
            const y = ((p.y - wallY) % (h + 120) + h + 120) % (h + 120) - 60;
            if (p.r < 0.6) dab(grain, p.x, y, Math.PI / 2 + 0.06, 12 + p.r * 10, 1.4, (p.r - 0.3) * 3);
            else if (p.r > 0.9) dab(shine, p.x, y, Math.PI / 2 + 0.06, 8, 1, 0);
          }
          press.fill(grain, { a: 1, b: 0.6 }, { over: true });
          press.knock(shine);
          // Shelves of books and little cupboards, drawn by hand.
          for (let y = -wallY; y < h + 120; y += 120) {
            for (const side of [0, 1]) {
              const x0 = side ? w - sw : 0;
              shelf(press, x0, y, sw, side, boil, Math.round(y / 120));
            }
          }

          // Things in the well, rising past as you fall. The cursor nudges them aside.
          for (const [i, fl] of fallers.entries()) {
            if (!ctx.reducedMotion) {
              const caught = fl.caught >= 0 && t - fl.caught < 1.4;
              if (!caught) fl.y -= v * 1.1;
              if (pointer.inside) {
                const d = Math.hypot(fl.x - pointer.x, fl.y - pointer.y);
                if (d < fl.size * 2) fl.vx += Math.sign(fl.x - pointer.x) * (1 - d / (fl.size * 2)) * 600 * dt;
              }
              fl.vx *= Math.pow(0.08, dt);
              fl.x = Math.max(sw + fl.size * 0.5, Math.min(w - sw - fl.size * 0.5, fl.x + fl.vx * dt));
              fl.rot += fl.vr * dt * (caught ? 0 : 1 + speed * 3);
              if (fl.y < -fl.size) Object.assign(fl, spawn(w, h, h + fl.size, i + Math.floor(fallen)));
              // Rising past the top of the page, things float on up out of the book.
              else if (fl.y < fl.size * 0.2 && fl.kind !== 'frag') {
                const vp = f.toViewport(fl.x, fl.y);
                escape.launch(propStamp(fl.kind, fl.tones), vp.x, vp.y, { size: fl.size * 1.25, vy: -(80 + v / dt * 0.6), vx: fl.vx, vr: fl.vr, drag: 0.85, fade: 0.55, rot: fl.rot });
                Object.assign(fl, spawn(w, h, h + fl.size, i + Math.floor(fallen)));
              }
            }
            const pop = fl.caught >= 0 ? Math.max(0, 1 - (t - fl.caught) / 0.5) : 0;
            const s = (fl.size / 40) * (1 + Math.sin(pop * Math.PI) * 0.35);
            press.with({ x: fl.x, y: fl.y, rot: fl.kind === 'frag' ? fl.rot * 0.2 : fl.rot, s }, () => {
              if (fl.kind === 'frag') tag(press, fl.text ?? '', boil);
              else printProp(press, fl.kind, fl.tones, boil);
            });
          }

          // What you caught, on a paper card.
          if (label && t - label.t < 2.6) {
            const lx = Math.max(sw + 6, Math.min(w - sw - 6, label.x));
            const ly = Math.max(30, label.y - 60);
            const card = curvy(wobble([[lx - 110, ly - 22], [lx + 110, ly - 22], [lx + 110, ly + 24], [lx - 110, ly + 24]], true, 1.2, 70 + (boil % 3), 8));
            press.knock(card);
            press.fill(ribbon([[lx - 110, ly - 22], [lx + 110, ly - 22], [lx + 110, ly + 24], [lx - 110, ly + 24]], { closed: true, w: 1.6, rough: 0.5, seed: 71 }), { a: 1 }, { over: true });
            label.lines.forEach((line, k) => press.text(line, lx, ly - 8 + k * 18, `italic ${k ? 13 : 15}px "IM Fell English", Georgia, serif`, { a: 1, b: 0.8 }));
          }

        },
      });
    },
    {
      scrollLength: 2600,
      copy: COPY,
      progress: (_p, v) => {
        speed = Math.min(3, Math.abs(v));
      },
      text: () => {
        const text = renderText(5);
        const quote = text.querySelector('.text__quote')!;
        quote.after(
          el('p', { class: 'fall-note' }, [
            'The link you followed came apart somewhere above: ',
            el('code', { class: 'fall-url' }, brokenPath(64)),
          ]),
          el('p', { class: 'fall-miles' }, [miles, ' miles fallen']),
          el('p', { class: 'fall-tip' }, 'Things drift past as you fall. Click one to catch it.'),
        );
        return text;
      },
    },
  );
};

/** A shelf of books and a little cupboard, drawn with a loose brush. */
function shelf(press: Press, x0: number, y: number, sw: number, side: number, boil: number, row: number) {
  const s = boil % 3;
  press.fill(ribbon([[x0, y + 62], [x0 + sw, y + 61]], { w: 4, rough: 0.3, amt: 0.6, seed: 80 + row + s }), { a: 1, b: 0.9, c: 0.8 });
  for (let k = 0; k < 4; k++) {
    const bh = 20 + ((k * 7 + side * 5 + row * 3) % 12);
    const bw = sw / 6;
    const bx = x0 + 5 + k * (sw / 4.4);
    const lean = k === 3 ? 4 : 0;
    const pts: Pt[] = [[bx + lean, y + 60 - bh], [bx + bw + lean, y + 60 - bh], [bx + bw, y + 60], [bx, y + 60]];
    press.fill(curvy(wobble(pts, true, 0.5, k + row + s, 4)), BOOKS[(k + side + row + 5) % BOOKS.length]);
  }
  const door: Pt[] = [[x0 + sw * 0.2, y + 76], [x0 + sw * 0.8, y + 76], [x0 + sw * 0.8, y + 104], [x0 + sw * 0.2, y + 104]];
  press.fill(curvy(wobble(door, true, 0.6, 90 + row + s, 4)), side ? { a: 0.9, b: 0.3 } : { a: 0.6, c: 0.7 });
  press.fill(ribbon(door, { closed: true, w: 1.3, rough: 0.4, seed: 91 + row }), { a: 1, b: 0.8 }, { over: true });
}

/** A gold paper tag with one piece of the broken URL printed on it. */
function tag(press: Press, text: string, boil: number) {
  const tw = Math.max(18, text.length * 8.5);
  const pts: Pt[] = [[-tw / 2 - 12, 0], [-tw / 2 - 5, -11], [tw / 2 + 8, -11], [tw / 2 + 8, 11], [-tw / 2 - 5, 11]];
  press.fill(curvy(wobble(pts, true, 0.6, 60 + (boil % 3), 4)), { c: 1, b: 0.12 });
  press.knock(new Path2D(`M ${-tw / 2 - 4} 0 m -2.5 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0`));
  press.text(text, 2, 1, 'italic 15px "IM Fell English", Georgia, serif', { a: 1, b: 0.8 });
}
