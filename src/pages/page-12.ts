import './print.css';
import './act3.css';
import { spreadPage } from './art';
import { renderText } from './shared';
import { el } from '../engine/dom';
import site, { type SiteLink } from '../site.config';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, handEllipse, scatter, dab, type Seed } from '../print/brush';
import { CATERPILLAR, preload, printFigure, figurePoint } from '../print/tenniel';
import { escape } from '../print/escape';
import { music } from '../audio/music';
import { puffStamp } from './act2';

/**
 * Page 12: advice from a Caterpillar. Tenniel's Caterpillar sits on his mushroom on the
 * left page, smoking. His smoke curls up, drifts toward your cursor, and now and then
 * gathers itself into his question, "Who are you?". Click and he blows a smoke ring.
 * On the right page, he asks the reader too: where were you trying to go? Type, and the
 * page suggests the right places on the portfolio.
 */

const COPY: [number, number, number, number] = [0.57, 0.06, 0.37, 0.6];

interface Puff {
  x: number;
  y: number;
  vx: number;
  born: number;
  r: number;
}
interface Ring {
  x: number;
  y: number;
  born: number;
}

/** Everything a visitor might have been looking for: the home sections and every page. */
const PLACES: SiteLink[] = [...site.sections, ...site.pages];

function suggest(q: string): SiteLink[] {
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  if (!words.length) return [site.sections[0], site.pages.find((p) => p.label === 'AI Projects') ?? site.pages[0], site.sections[1]];
  const score = (p: SiteLink) => {
    const hay = [p.label, ...(p.keywords ?? [])].join(' ').toLowerCase();
    return words.reduce((s, w) => s + (hay.includes(w) ? (p.label.toLowerCase().includes(w) ? 3 : 1) : 0), 0);
  };
  return PLACES.map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.p);
}

export default () =>
  spreadPage(
    12,
    (ctx) => {
      let grass: Seed[] = [];
      let puffs: Puff[] = [];
      let rings: Ring[] = [];
      let puffClock = 0;
      // The question in the smoke: when it last began to form.
      let asked = 1.5;
      preload(CATERPILLAR);

      const fig = (f: PrintFrame) => (f.wide ? { x: f.w * 0.26, y: f.h * 0.985, h: f.h * 0.9 } : { x: f.w * 0.5, y: f.h * 0.47, h: f.h * 0.43 });
      // His mouth, at the hookah's mouthpiece, in spread coordinates.
      const mouth = (f: PrintFrame) => {
        const g = fig(f);
        const p = figurePoint(CATERPILLAR, g.h, 318, 196);
        return p ? { x: g.x + p[0], y: g.y + p[1] } : null;
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.6,
        copy: COPY,
        layout(f) {
          grass = scatter(f.w, f.h, 10, (_x, y) => y > f.h * (f.wide ? 0.72 : 0.38) && y < (f.wide ? f.h : f.h * 0.5), 121);
          puffs = [];
        },
        click(_x, _y, f) {
          const m = mouth(f);
          if (!m) return;
          rings.push({ x: m.x, y: m.y, born: f.t });
          music.chime(2, 0);
          const v = f.toViewport(m.x, m.y);
          escape.launch(puffStamp(0), v.x, v.y, { size: 50, vx: 60, vy: -90, drag: 0.8, fade: 0.4, vs: 0.8 });
        },
        draw(f) {
          const { press, w, h, t, dt, boil, pointer } = f;
          const s = boil % 3;
          const ground = f.wide ? h * 0.72 : h * 0.38;

          // A dim violet wood, with long grass along the bottom.
          const sky = new Path2D();
          sky.rect(0, 0, w, h);
          press.fill(sky, { a: 0.2, b: 0.16, c: 0.1 });
          const blades = new Path2D();
          for (const g of grass) {
            const sway = Math.sin(t * 1.2 + g.x * 0.02) * 4 + (pointer.inside ? (pointer.x - g.x) * 0.01 : 0);
            ribbon([[g.x, g.y + 18], [g.x + sway, g.y - 10 - g.r * 22]], { w: 2 + g.r * 1.5, taper: 0.9, amt: 0.4, seed: Math.floor(g.r * 99) + s }, blades);
          }
          press.fill(blades, { a: 0.55, c: 0.75 }, { over: true });
          const lawn = new Path2D();
          lawn.rect(0, ground, w, h);
          press.fill(lawn, { a: 0.25, c: 0.5 }, { over: true });

          const g = fig(f);
          press.with({ x: g.x, y: g.y }, () => printFigure(press, CATERPILLAR, g.h, boil));

          // His smoke: soft puffs rising from the mouthpiece, drawn toward the cursor.
          const m = mouth(f);
          if (m) {
            puffClock -= dt;
            if (puffClock <= 0) {
              puffClock = 0.35;
              puffs.push({ x: m.x, y: m.y, vx: 6 + Math.random() * 10, born: t, r: Math.random() });
            }
          }
          puffs = puffs.filter((p) => t - p.born < 6);
          const smoke = new Path2D();
          for (const p of puffs) {
            const age = t - p.born;
            const pull = pointer.inside ? Math.max(-30, Math.min(30, (pointer.x - p.x) * 0.06)) : 0;
            p.x += (p.vx + pull + Math.sin(age * 1.3 + p.r * 6) * 14) * dt;
            p.y -= (16 + age * 4) * dt * (f.wide ? 1 : 0.6);
            const rr = (4 + age * 7) * (f.wide ? 1 : 0.6);
            curvy(handEllipse(p.x, p.y, rr, rr * 0.75, Math.floor(p.r * 40), rr * 0.15), smoke);
          }
          press.fill(smoke, { a: 0.14, b: 0.08, c: 0.06 }, { over: true });

          // Smoke rings, when clicked.
          rings = rings.filter((r) => t - r.born < 2.6);
          for (const r of rings) {
            const age = t - r.born;
            const rr = 8 + age * 26;
            press.fill(ribbon(handEllipse(r.x + age * 30, r.y - age * 40, rr, rr * 0.45, 3, 1), { closed: true, w: 4 * (1 - age / 2.6) + 1, amt: 0.5, seed: 4 + s }), { a: 0.22, b: 0.12 }, { over: true });
          }

          // "Who are you?", written in smoke above him: it gathers, hangs, and drifts apart.
          const age = (t - asked) % 9;
          const k = age < 1.5 ? age / 1.5 : age < 4.5 ? 1 : age < 6 ? 1 - (age - 4.5) / 1.5 : 0;
          if (k > 0.01) {
            const qx = f.wide ? w * 0.27 : w * 0.5;
            const qy = f.wide ? h * 0.1 : h * 0.06;
            const size = Math.round(f.wide ? h * 0.075 : h * 0.04);
            const drift = (1 - k) * 10;
            press.text('Who are you?', qx + Math.sin(t * 0.7) * 4, qy - drift, `italic ${size}px "IM Fell English", Georgia, serif`, { a: 0.7 * k, b: 0.4 * k });
          }

          // The mushroom's spots twinkle faintly.
          const spots = new Path2D();
          for (let i = 0; i < 5; i++) dab(spots, g.x - g.h * 0.2 + i * g.h * 0.09, g.y - g.h * 0.45 + Math.sin(i * 2) * g.h * 0.02, 0, g.h * 0.02, g.h * 0.01, 0);
          press.fill(spots, { c: 0.6 + Math.sin(t * 2) * 0.2 }, { over: true });
        },
      });
    },
    {
      copy: COPY,
      text: () => {
        const text = renderText(12);
        // "Who are you?" asked of the reader: where were you trying to go?
        const input = el('input', {
          class: 'ask__input',
          type: 'search',
          id: 'ask-where',
          placeholder: 'e.g. case studies, AI, about her…',
          autocomplete: 'off',
          spellcheck: 'false',
        }) as HTMLInputElement;
        const list = el('ul', { class: 'ask__list', 'aria-live': 'polite' });
        const show = () => {
          const found = suggest(input.value);
          list.replaceChildren(
            ...(found.length
              ? found.map((p) => el('li', {}, [el('a', { href: p.url }, p.label)]))
              : [el('li', { class: 'ask__none' }, 'Hmm. Try “work”, “AI” or “resume”.')]),
          );
        };
        input.addEventListener('input', show);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const first = list.querySelector('a');
            if (first) location.href = first.href;
          }
          e.stopPropagation();
        });
        show();
        const ask = el('div', { class: 'ask' }, [el('label', { class: 'ask__label', for: 'ask-where' }, 'Where were you trying to go?'), input, list]);
        text.querySelector('.text__hint')!.before(ask);
        return text;
      },
    },
  );
