import './print.css';
import './act2.css';
import gsap from 'gsap';
import { renderText } from './shared';
import { el } from '../engine/dom';
import { sparkleStamp } from '../print/stamps';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, wobble, handEllipse, dab, rng, type Pt } from '../print/brush';
import { escape } from '../print/escape';
import { leafStamp } from '../print/stamps';
import { music } from '../audio/music';
import { sitters, GREENS } from './page-02';

/**
 * Page 22: waking. Back on the riverbank where it began, but now in the gold of evening.
 * The page opens in fog, which clears slowly into warm light; the willow sways, slower and
 * slower; the last leaves drift down past the copy and out of the book. Alice and her
 * sister sit under the tree as they did on the second page. Click the willow and a few
 * more leaves let go. Once the fog has gone, the story ends: "The End" prints itself in
 * gold across the water with a curling flourish, the music settles, and a little sign
 * comes up to meet the person who made the book.
 */

const COPY: [number, number, number, number] = [0.58, 0.06, 0.36, 0.42];

interface Strand {
  x: number;
  y: number;
  len: number;
  r: number;
  tone: number;
}
interface Falling {
  x: number;
  y: number;
  vx: number;
  a: number;
  r: number;
}

export default () => {
  let cta: HTMLElement | null = null;
  const reveal = (reduced: boolean) => {
    if (!cta || !cta.hidden) return;
    cta.hidden = false;
    if (!reduced) gsap.fromTo(cta, { y: 40, scale: 0.4, rotation: -10, opacity: 0 }, { y: 0, scale: 1, rotation: -3, opacity: 1, duration: 0.9, ease: 'back.out(2.2)' });
  };
  return spreadPage(
    22,
    (ctx) => {
      let ended = false;
      let strands: Strand[] = [];
      let falling: Falling[] = [];
      let born = 0;
      let leafClock = 0;
      let treeX = 0;
      let horizon = 0;

      const shed = (f: PrintFrame, n: number) => {
        for (let i = 0; i < n; i++) {
          const x = treeX + (Math.random() - 0.5) * f.w * 0.3;
          const y = f.h * (0.1 + Math.random() * 0.3);
          const v = f.toViewport(x, y);
          escape.launch(leafStamp(i), v.x, v.y, { size: 20 + Math.random() * 14, vx: 30 + Math.random() * 50, vy: 10, ay: 22, flutter: 50, vr: (Math.random() - 0.5) * 2, drag: 0.9, fade: 0.16 });
        }
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4,
        copy: COPY,
        layout(f) {
          const { w, h } = f;
          horizon = h * (f.wide ? 0.66 : 0.32);
          treeX = w * (f.wide ? 0.3 : 0.32);
          // The willow, laid out as on page 2: a dome of strands, hanging like a curtain.
          const R = rng(222);
          strands = [];
          const half = w * (f.wide ? 0.25 : 0.44);
          const count = f.wide ? 560 : 340;
          for (let i = 0; i < count; i++) {
            const u = R() * 2 - 1;
            const x = treeX + u * half + (R() - 0.5) * 10;
            const dome = h * 0.03 + Math.pow(Math.abs(u), 1.6) * horizon * 0.42 + R() * h * 0.04;
            const curtain = 0.5 + 0.5 * Math.sin(x * 0.05) * Math.sin(x * 0.019 + 1);
            const len = (horizon - dome) * (0.5 + curtain * 0.4 + R() * 0.12);
            strands.push({ x, y: dome, len, tone: i % 5 < 2 ? 0 : i % 5 < 4 ? 1 : 2, r: R() });
          }
          strands.sort((a, b) => a.tone - b.tone);
          falling = Array.from({ length: f.wide ? 16 : 9 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: 6 + Math.random() * 10, a: Math.random() * 6, r: Math.random() }));
        },
        enter() {
          born = performance.now() / 1000;
          ended = false;
          music.chime(0, 0);
        },
        click(_x, _y, f) {
          shed(f, 5);
          music.chime(Math.floor(Math.random() * 4), 0);
        },
        draw(f) {
          const { press, w, h, t, dt, boil } = f;
          const s = boil % 3;
          const since = ctx.reducedMotion ? 9 : performance.now() / 1000 - born;
          // Everything slows as she wakes.
          const slow = Math.max(0.25, 1 - since / 10);

          // Evening sky: gold low down, rose higher up; a big low sun.
          const sky = new Path2D();
          sky.rect(0, 0, w, horizon);
          press.fill(sky, {
            c: (g) => { const gr = g.createLinearGradient(0, 0, 0, horizon); gr.addColorStop(0, 'rgb(60,60,60)'); gr.addColorStop(1, 'rgb(200,200,200)'); return gr; },
            b: (g) => { const gr = g.createLinearGradient(0, 0, 0, horizon); gr.addColorStop(0, 'rgb(90,90,90)'); gr.addColorStop(1, 'rgb(20,20,20)'); return gr; },
          });
          const sunX = f.wide ? w * 0.72 : w * 0.82;
          const sun = curvy(handEllipse(sunX, horizon - h * 0.07, h * 0.09, h * 0.09, 3 + s, 1.2));
          press.knock(sun);
          press.fill(sun, { c: 1, b: 0.55 });

          // The far bank, the river, glints of the sun on the water.
          const bank: Pt[] = [[0, horizon + 2]];
          for (let x = 0; x <= w; x += 12) bank.push([x, horizon - h * 0.03 - Math.sin(x * 0.015) * h * 0.012]);
          bank.push([w, horizon + 2]);
          press.fill(curvy(wobble(bank, true, 1.4, 5 + s, 8)), { a: 0.6, b: 0.35, c: 0.9 });
          const water = new Path2D();
          water.rect(0, horizon, w, h - horizon);
          press.fill(water, { a: 0.35, b: 0.3, c: 0.45 });
          const glints = new Path2D();
          for (let i = 0; i < 12; i++) {
            const gy = horizon + (h - horizon) * (0.1 + i * 0.07);
            const gx = sunX + Math.sin(t * 0.6 * slow + i * 1.7) * w * 0.02;
            dab(glints, gx, gy, 0, w * (0.05 - i * 0.003), 2, 0.2);
          }
          press.knock(glints);
          press.fill(glints, { c: 0.8, b: 0.3 }, { over: true });

          // The willow, swaying slower and slower.
          press.fill(ribbon([[treeX - w * 0.01, horizon + 4], [treeX - w * 0.02, horizon - h * 0.2], [treeX + w * 0.015, horizon - h * 0.34], [treeX, h * 0.08]], { w: Math.max(14, w * 0.024), taper: 0.08, rough: 0.3, seed: 2 + s, amt: 2 }), { a: 1, b: 0.75, c: 0.9 });
          const paths = [new Path2D(), new Path2D(), new Path2D()];
          for (const st of strands) {
            const sway = Math.sin(t * 0.7 * slow + st.x * 0.011) * 6 * slow;
            const pts: Pt[] = [];
            for (let k = 0; k <= 6; k++) {
              const q = k / 6;
              pts.push([st.x + sway * q * q * (0.6 + st.r * 0.6), st.y + st.len * q]);
            }
            ribbon(pts, { w: 3 + st.r * 2.2, taper: 0.22, rough: 0.2, seed: Math.floor(st.r * 999) + s, amt: 0.8 }, paths[st.tone]);
          }
          paths.forEach((p, i) => press.fill(p, { ...GREENS[i], b: 0.12 }));

          // Alice and her sister, under the tree, as at the start.
          sitters(press, f.wide ? treeX + w * 0.1 : treeX + w * 0.18, horizon + h * 0.004, h * (f.wide ? 0.08 : 0.055), boil);

          // The last leaves drift down, slowly; now and then one drifts right out of the book.
          const leaves = new Path2D();
          for (const l of falling) {
            l.y += (14 + l.r * 10) * dt * slow;
            l.x += (l.vx + Math.sin(t + l.a) * 8) * dt * slow;
            if (l.y > h + 10) {
              l.y = -10;
              l.x = Math.random() * w;
            }
            dab(leaves, l.x, l.y, l.a + Math.sin(t * 1.5 + l.a), 12 + l.r * 6, 4, 0.5);
          }
          press.fill(leaves, { c: 1, b: 0.45, a: 0.2 }, { over: true });
          leafClock -= dt;
          if (leafClock <= 0 && since > 1.5 && !ctx.reducedMotion) {
            leafClock = 2.6;
            shed(f, 1);
          }

          // The End: once the fog has gone, it prints itself across the water, with a flourish.
          const endK = Math.min(1, Math.max(0, (since - 4.2) / 1.6));
          if (endK > 0) {
            const ex = f.wide ? w * 0.72 : w * 0.5;
            const ey = f.wide ? h * 0.9 : h * 0.43;
            const size = Math.round(f.wide ? h * 0.08 : h * 0.045);
            const font = `italic ${size}px "IM Fell English", Georgia, serif`;
            press.knockText('The End', ex, ey, font);
            press.text('The End', ex + size * 0.03, ey + size * 0.03, font, { b: 0.9 * endK });
            press.text('The End', ex, ey, font, { c: endK, b: 0.2 * endK }, 'center', true);
            // the flourish draws itself in under the words
            const curl: Pt[] = [];
            const span = size * 2.6;
            for (let i = 0; i <= 40; i++) {
              const u = i / 40;
              curl.push([ex - span / 2 + u * span, ey + size * 0.42 + Math.sin(u * Math.PI * 3) * size * 0.12 * Math.sin(u * Math.PI)]);
            }
            const n = Math.max(2, Math.floor(curl.length * endK));
            press.knock(ribbon(curl.slice(0, n), { w: size * 0.07, taper: 0.5, amt: 0.4, seed: 9 }));
            press.fill(ribbon(curl.slice(0, n), { w: size * 0.06, taper: 0.5, amt: 0.4, seed: 9 }), { c: 1, b: 0.3 });
            if (!ended) {
              ended = true;
              [9, 7, 4, 2, 0].forEach((d, i) => setTimeout(() => music.chime(d, 0), i * 220));
              const v = f.toViewport(ex, ey);
              for (let i = 0; i < 10; i++) escape.launch(sparkleStamp(i % 3), v.x, v.y, { size: 14 + Math.random() * 14, vx: (Math.random() - 0.5) * 260, vy: -80 - Math.random() * 160, ay: 60, drag: 0.7, fade: 0.35 });
              setTimeout(() => reveal(ctx.reducedMotion), 1200);
            }
          }

          // The fog of the dream, clearing into the evening light.
          const fog = Math.max(0, 1 - since / 4);
          if (fog > 0) {
            press.vignette((g) => {
              const v = Math.round(255 * (1 - 0.85 * fog));
              g.fillStyle = `rgb(${v},${v},${v})`;
              g.fillRect(0, 0, w, h);
            });
          }
        },
      });
    },
    {
      copy: COPY,
      text: (ctx) => {
        const text = renderText(22);
        // When the story ends, a sign comes up: turn the page to meet who made it.
        cta = el('button', { class: 'pop-cta', type: 'button', hidden: '' }, [
          el('span', { class: 'pop-cta__sign' }, 'Who made this book?'),
          el('span', { class: 'pop-cta__post', 'aria-hidden': 'true' }),
        ]);
        cta.addEventListener('click', () => ctx.next());
        text.append(cta);
        return text;
      },
      destroy: () => {
        cta = null;
      },
    },
  );
};
