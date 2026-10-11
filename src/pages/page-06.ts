import './act1.css';
import './print.css';
import site from '../site.config';
import { el } from '../engine/dom';
import { renderText } from './shared';
import { spreadPage } from './art';
import { printScene } from '../print/scene';
import { dab, ribbon, curvy, wobble, scatter, handEllipse, type Pt, type Seed } from '../print/brush';
import { escape } from '../print/escape';
import { moteStamp } from '../print/stamps';
import type { PrintFrame } from '../print/scene';
import { ALICE_CURTAIN, preload, printSilhouette } from '../print/tenniel';
import { music } from '../audio/music';
import { doorwayPrint, doorLightPrint, doorLeafPrint, doorEyesPrint, doorWebPrint, printedImg } from './doors';

/**
 * Page 6: the long, low hall of locked doors, by lantern light, printed in riso inks
 * onto the page. The hall is a deep three-ink overprint; the cursor is a lantern, and
 * where it shines the ink thins and the paper glows warm. Tenniel's Alice stands at the
 * curtain in silhouette, rim-lit by the little door glowing behind it. The doors on the
 * text page are real (each is a section of the site); hovering one lights its twin.
 * It is a little haunted: cobwebs hang in the corners, and in the dark, away from the
 * lantern, eyes peer out of the doors (they blink, follow the light, and hide from it).
 */

export default () => {
  // Which real door the visitor is hovering, shared by the text page and the scene.
  const hover = { i: -1, since: 0 };

  const COPY: [number, number, number, number] = [0.58, 0.07, 0.37, 0.66];

  return spreadPage(
    6,
    (ctx) => {
      let wall: Seed[] = [];
      let floor: Seed[] = [];
      let curtain: Seed[] = [];
      let motes: Seed[] = [];
      let wide = true;
      let moteClock = 0;
      let flare = -10;
      preload(ALICE_CURTAIN);

      const doorRect = (w: number, h: number, i: number, n: number) => {
        const span = w * (wide ? 0.24 : 0.5);
        const dw = Math.min(w * (wide ? 0.045 : 0.08), span / n - 8);
        const x = w * (wide ? 0.03 : 0.06) + (i + 0.5) * (span / n) - dw / 2;
        return { x, y: h * (wide ? 0.36 : 0.16), w: dw, h: dw * 1.9 };
      };
      // Golden dust from the lantern drifts up and out of the book.
      const drift = (f: PrintFrame, x: number, y: number, n: number) => {
        for (let i = 0; i < n; i++) {
          const v = f.toViewport(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
          escape.launch(moteStamp(), v.x, v.y, { size: 14 + Math.random() * 14, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 50, flutter: 30, drag: 0.8, fade: 0.25 });
        }
      };
      const archPts = (x: number, y: number, w: number, h: number): Pt[] => {
        const r = w / 2;
        const pts: Pt[] = [[x, y + h]];
        for (let k = 0; k <= 10; k++) {
          const a = Math.PI + (k / 10) * Math.PI;
          pts.push([x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]);
        }
        pts.push([x + w, y + h]);
        return pts;
      };

      const scene = printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 4.2,
        copy: COPY,
        layout(f) {
          const { w, h } = f;
          wide = f.wide;
          wall = scatter(w, h, 7, (_x, y) => y < h * 0.64, 41);
          floor = scatter(w, h, 7, (_x, y) => y >= h * 0.62, 42);
          curtain = scatter(w, h, 5.5, (x, y) => (wide ? x > w * 0.3 && x < w * 0.47 : x > w * 0.68) && y < h * (wide ? 0.9 : 0.45), 43);
          motes = scatter(w, h, 20, () => true, 44);
        },
        click(x, y, f) {
          flare = f.t;
          drift(f, x, y, 6);
          music.chime(5, 1);
        },
        draw(f) {
          const { press, w, h, t, pointer, boil } = f;
          const s = boil % 3;
          const lx = pointer.inside ? pointer.x : w * ((wide ? 0.2 : 0.35) + Math.sin(t * 0.4) * 0.1);
          const ly = pointer.inside ? pointer.y : h * ((wide ? 0.5 : 0.25) + Math.sin(t * 0.31) * 0.05);
          moteClock -= f.dt;
          if (pointer.inside && moteClock <= 0) {
            moteClock = 0.7;
            drift(f, lx, ly, 1);
          }
          const flick = 1 + Math.sin(t * 11) * 0.03 + Math.sin(t * 7.3) * 0.02;
          const flareK = Math.max(0, 1 - (t - flare) / 0.8);
          const radius = h * (0.36 + flareK * 0.25) * flick;
          const door = wide ? { x: w * 0.395, y: h * 0.7, w: w * 0.05, h: h * 0.2 } : { x: w * 0.79, y: h * 0.3, w: w * 0.1, h: h * 0.12 };

          // The hall: walls and floor in a deep overprint, hatched with brush strokes.
          const room = new Path2D();
          room.rect(0, 0, w, h);
          press.fill(room, { a: 0.62, b: 0.5, c: 0.6 });
          const hatch = new Path2D();
          for (const p of wall) if (p.r < 0.6) dab(hatch, p.x, p.y, -0.9 + Math.sin(p.r * 40 + s) * 0.08, 9 + p.r * 6, 1.3, 1);
          for (const p of floor) if (p.r < 0.6) dab(hatch, p.x, p.y, 0.12, 14 + p.r * 8, 1.5, 0.5);
          press.fill(hatch, { a: 1, b: 1, c: 1 }, { over: true });
          // The skirting where wall meets floor.
          press.fill(ribbon([[0, h * 0.63], [w, h * 0.62]], { w: 3, rough: 0.4, seed: 3 + s }), { a: 1, b: 1, c: 1 });

          // The locked doors along the far wall; the one you hover on the page lights up.
          const n = site.sections.length;
          for (let i = 0; i < n; i++) {
            const d = doorRect(w, h, i, n);
            const on = hover.i === i ? Math.min(1, (performance.now() - hover.since) / 250) : 0;
            const pts = archPts(d.x, d.y, d.w, d.h);
            press.fill(curvy(wobble(pts, true, 0.8, 20 + i + s, 5)), { a: 1, b: 1, c: 1 });
            if (on > 0.02) {
              press.fill(curvy(wobble(archPts(d.x + 3, d.y + 3, d.w - 6, d.h - 4), true, 0.6, 30 + i + s, 5)), { c: 0.95 * on, b: 0.25 * on });
            }
            press.fill(ribbon(pts, { closed: true, w: 1.6, rough: 0.5, seed: 40 + i }), on > 0.3 ? { c: 1, b: 0.3 } : { a: 0.6, b: 0.5, c: 0.6 }, { over: on <= 0.3 });
            // Iron straps across the planks.
            for (const k of [0.38, 0.8]) press.fill(ribbon([[d.x + 2, d.y + d.h * k], [d.x + d.w - 2, d.y + d.h * k + 1]], { w: 1.2, rough: 0.5, seed: 60 + i + s }), { a: 0.5, b: 0.45, c: 0.55 }, { over: true });
            // Something behind it, watching: eyes that blink, follow the lantern, and hide from it.
            if (on > 0.3) continue;
            const ex = d.x + d.w / 2;
            const ey = d.y + d.h * 0.3;
            const away = Math.hypot(ex - lx, ey - ly) / radius;
            const blink = (t * 0.55 + i * 1.37) % 3.4 < 0.14;
            if (away < 0.75 || blink) continue;
            const open = Math.min(1, (away - 0.75) * 4);
            const look = Math.max(-1, Math.min(1, (lx - ex) / (w * 0.25)));
            const eyes = new Path2D();
            const pupils = new Path2D();
            for (const side of [-1, 1]) {
              const cx = ex + side * d.w * 0.18;
              curvy(handEllipse(cx, ey, d.w * 0.12, d.w * 0.06 * open, 70 + i * 3 + side, 0.3, side * 0.25), eyes);
              curvy(handEllipse(cx + look * d.w * 0.05, ey, d.w * 0.025, d.w * 0.05 * open, 80 + i, 0.1), pupils);
            }
            press.fill(eyes, { c: 1, b: 0.12 });
            press.fill(pupils, { a: 1, b: 1, c: 1 });
          }

          // Cobwebs in the corners of the hall, pale in the dark.
          const web = new Path2D();
          for (const [cx, cy, dx, dy, r] of (wide ? [[0, 0, 1, 1, h * 0.26], [w, 0, -1, 1, h * 0.2]] : [[0, 0, 1, 1, h * 0.14]]) as [number, number, number, number, number][]) {
            const sway = Math.sin(t * 0.7) * 2;
            for (let k = 0; k <= 5; k++) {
              const a = (k / 5) * (Math.PI / 2);
              ribbon([[cx, cy], [cx + dx * Math.cos(a) * r + sway, cy + dy * Math.sin(a) * r]], { w: 0.8, taper: 0.4, amt: 0.6, seed: 90 + k }, web);
            }
            for (const q of [0.3, 0.5, 0.72, 0.95]) {
              const ring: Pt[] = [];
              for (let k = 0; k <= 5; k++) {
                const a = (k / 5) * (Math.PI / 2);
                ring.push([cx + dx * Math.cos(a) * r * q + sway * q, cy + dy * Math.sin(a) * r * q]);
              }
              ribbon(ring, { w: 0.6, taper: 0.2, amt: 0.8, seed: 99 + Math.round(q * 10) }, web);
            }
          }
          press.fill(web, { a: 0.12, b: 0.1, c: 0.14 });

          // The curtain: long rose brush strokes, swaying a little.
          const folds = new Path2D();
          for (const p of curtain) {
            if (p.r > 0.75) continue;
            const sway = Math.sin(p.y * 0.02 + t * 0.8) * 3;
            ribbon([[p.x, p.y - 14], [p.x + sway, p.y + 14]], { w: 2.4 + p.r * 2, taper: 0.3, amt: 0.4, seed: Math.floor(p.r * 300) + s }, folds);
          }
          const curtainBody = new Path2D();
          if (wide) curtainBody.rect(w * 0.3, 0, w * 0.17, h * 0.9);
          else curtainBody.rect(w * 0.68, 0, w * 0.32, h * 0.45);
          press.fill(curtainBody, { a: 0.35, b: 0.9, c: 0.45 });
          press.fill(folds, { a: 0.8, b: 1, c: 0.6 }, { over: true });

          // The little door, about fifteen inches high, glowing gold through the gap.
          const pulse = 0.85 + Math.sin(t * 1.7) * 0.15;
          press.knock(curvy(wobble(archPts(door.x, door.y, door.w, door.h), true, 0.6, 50 + s, 4)));
          press.fill(curvy(wobble(archPts(door.x, door.y, door.w, door.h), true, 0.6, 50 + s, 4)), { c: 0.8 * pulse });
          press.fill(ribbon(archPts(door.x, door.y, door.w, door.h), { closed: true, w: 1.8, rough: 0.5, seed: 51 }), { a: 1, b: 1, c: 1 });
          // Its light spilling across the floor.
          const spill = new Path2D();
          spill.moveTo(door.x, door.y + door.h);
          spill.lineTo(door.x + door.w, door.y + door.h);
          spill.lineTo(door.x + door.w * 0.3, h);
          spill.lineTo(door.x - w * 0.45, h);
          spill.closePath();
          press.vignette((g) => {
            const gr = g.createLinearGradient(door.x, door.y + door.h, door.x - w * 0.3, h);
            gr.addColorStop(0, `rgb(${Math.round(255 * (1 - 0.55 * pulse))},${Math.round(255 * (1 - 0.55 * pulse))},${Math.round(255 * (1 - 0.55 * pulse))})`);
            gr.addColorStop(1, 'rgb(255,255,255)');
            g.fillStyle = gr;
            g.fill(spill);
          });

          // Tenniel's Alice: a silhouette, rim-lit gold from the doorway she has found.
          press.with({ x: w * (wide ? 0.33 : 0.6), y: h * (wide ? 0.96 : 0.47) }, () => {
            const hh = h * (wide ? 0.6 : 0.32);
            printSilhouette(press, ALICE_CURTAIN, hh, { c: 1, b: 0.25 * pulse }, 3.5, -1.5);
            printSilhouette(press, ALICE_CURTAIN, hh, { a: 1, b: 1 });
          });

          // The lantern: where it shines, the ink thins and the paper glows warm.
          press.vignette((g) => {
            const gr = g.createRadialGradient(lx, ly, 0, lx, ly, radius);
            const lo = 0.12 - flareK * 0.1;
            gr.addColorStop(0, `rgb(${Math.round(lo * 255)},${Math.round(lo * 255)},${Math.round(lo * 255)})`);
            gr.addColorStop(0.55, 'rgb(150,150,150)');
            gr.addColorStop(1, 'rgb(255,255,255)');
            g.fillStyle = gr;
            g.fillRect(0, 0, w, h);
          });
          const warm = new Path2D();
          warm.arc(lx, ly, radius * 0.7, 0, Math.PI * 2);
          press.fill(warm, { c: (g) => { const gr = g.createRadialGradient(lx, ly, 0, lx, ly, radius * 0.7); gr.addColorStop(0, 'rgb(150,150,150)'); gr.addColorStop(1, 'rgb(0,0,0)'); return gr; } }, { over: true });
          // Dust turning in the light: tiny paper motes.
          const dust = new Path2D();
          for (const p of motes) {
            const mx = p.x + Math.sin(t * 0.5 + p.r * 9) * 8;
            const my = p.y + Math.cos(t * 0.4 + p.r * 7) * 8;
            if (Math.hypot(mx - lx, my - ly) > radius * 0.8) continue;
            dust.moveTo(mx + 1.2, my);
            dust.arc(mx, my, 1.2, 0, Math.PI * 2);
          }
          press.knock(dust);

        },
      });
      return scene;
    },
    {
      copy: COPY,
      text: (ctx) => {
        const text = renderText(6);
        const doors = site.sections.map((section, i) => {
          // Printed like the pictures: doorway, light beyond, the leaf, and eyes in its peephole.
          const door = el('a', { class: 'door', href: section.url }, [
            el('span', { class: 'door__frame', 'aria-hidden': 'true' }, [
              printedImg(doorwayPrint(i), 'door__print'),
              printedImg(doorLightPrint(), 'door__print door__light'),
              el('span', { class: 'door__leaf' }, [
                printedImg(doorLeafPrint(i), 'door__print'),
                el('span', { class: 'door__grille' }, [printedImg(doorEyesPrint(), 'door__eyes')]),
              ]),
              printedImg(doorWebPrint(i), 'door__print door__web'),
            ]),
            el('span', { class: 'door__plaque' }, section.label),
          ]);
          door.style.setProperty('--i', String(i));
          const on = () => {
            hover.i = i;
            hover.since = performance.now();
            music.creak();
            music.chime(i * 2, -1);
          };
          const off = () => {
            if (hover.i === i) hover.i = -1;
          };
          door.addEventListener('pointerenter', on);
          door.addEventListener('focus', on);
          door.addEventListener('pointerleave', off);
          door.addEventListener('blur', off);
          // Let the door swing open before leaving; modified clicks behave as normal links.
          door.addEventListener('click', (e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || ctx.reducedMotion) return;
            e.preventDefault();
            door.classList.add('is-open');
            music.creak(true);
            music.chime(7, 1);
            setTimeout(() => (location.href = section.url), 650);
          });
          return door;
        });
        const row = el('nav', { class: 'door-row', 'aria-label': 'Doors out of the hall' }, doors);
        text.querySelector('.text__quote')!.after(row);
        return text;
      },
    },
  );
};
