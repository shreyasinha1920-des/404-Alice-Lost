import './print.css';
import { spreadPage } from './art';
import { printScene, type PrintFrame } from '../print/scene';
import { ribbon, curvy, wobble, dab, handEllipse, resample, rng, type Pt } from '../print/brush';
import { escape } from '../print/escape';
import { moteStamp } from '../print/stamps';
import { music } from '../audio/music';

/**
 * Page 17: the door in the tree. A great tree grows across the spread, brushed in riso
 * greens and browns, with a little arched door in its trunk, glowing at the seams. A
 * golden thread draws itself through the undergrowth, winding back and forth like a maze,
 * from the corner of the page to the door. Trace it with your cursor and it lights up
 * behind you; reach the door (or just knock on it) and the door swings open onto light,
 * and the book turns to the next page: back to the hall, and through, at last.
 */

const COPY: [number, number, number, number] = [0.58, 0.05, 0.36, 0.42];

export default () =>
  spreadPage(
    17,
    (ctx) => {
      let path: Pt[] = [];
      let leaves: { x: number; y: number; a: number; s: number }[] = [];
      let born = 0;
      // How far along the thread the reader has traced (0..1), and when the door opened.
      let traced = 0;
      let opened = -1;
      let turned = false;
      let lastLit = 0;

      const door = (f: PrintFrame) => (f.wide ? { x: f.w * 0.3, y: f.h * 0.86, w: f.w * 0.045, h: f.h * 0.16 } : { x: f.w * 0.3, y: f.h * 0.45, w: f.w * 0.08, h: f.h * 0.09 });

      const open = (f: PrintFrame) => {
        if (opened >= 0) return;
        opened = f.t;
        [0, 4, 7, 11].forEach((d, i) => setTimeout(() => music.chime(d, 1), i * 120));
        const d = door(f);
        const v = f.toViewport(d.x, d.y - d.h * 0.5);
        for (let i = 0; i < 12; i++) escape.launch(moteStamp(), v.x, v.y, { size: 16 + Math.random() * 16, vx: (Math.random() - 0.5) * 240, vy: -80 - Math.random() * 160, flutter: 30, drag: 0.7, fade: 0.4 });
        if (!turned) {
          turned = true;
          setTimeout(() => ctx.next(), ctx.reducedMotion ? 300 : 1500);
        }
      };

      return printScene({
        reducedMotion: () => ctx.reducedMotion,
        pitch: 3.8,
        copy: COPY,
        layout(f) {
          const { w, h } = f;
          const d = door(f);
          const R = rng(171);
          // The thread: switchbacks through the undergrowth, from the page corner to the door.
          const raw: Pt[] = f.wide
            ? [[w * 0.9, h * 0.93], [w * 0.64, h * 0.94], [w * 0.62, h * 0.87], [w * 0.9, h * 0.85], [w * 0.92, h * 0.77], [w * 0.6, h * 0.75], [w * 0.52, h * 0.82], [w * 0.47, h * 0.95], [w * 0.4, h * 0.94], [w * 0.37, h * 0.84], [d.x + d.w * 0.2, d.y - 4]]
            : [[w * 0.96, h * 0.47], [w * 0.62, h * 0.47], [w * 0.62, h * 0.42], [w * 0.9, h * 0.4], [w * 0.85, h * 0.35], [w * 0.5, h * 0.36], [w * 0.42, h * 0.46], [d.x + d.w * 0.2, d.y - 3]];
          path = resample(wobble(raw, false, 4, 172, 18), false, 5);
          leaves = Array.from({ length: f.wide ? 420 : 220 }, () => {
            const a = R() * Math.PI * 2;
            const r = Math.sqrt(R());
            return { x: w * (f.wide ? 0.32 : 0.35) + Math.cos(a) * r * w * (f.wide ? 0.3 : 0.4), y: h * (f.wide ? 0.2 : 0.1) + Math.sin(a) * r * h * (f.wide ? 0.2 : 0.1), a: R() * 6, s: R() };
          });
        },
        enter() {
          born = performance.now() / 1000;
          traced = 0;
          lastLit = 0;
          opened = -1;
          turned = false;
        },
        click(x, y, f) {
          const d = door(f);
          if (Math.abs(x - d.x) < d.w * 1.2 && y > d.y - d.h * 1.2 && y < d.y + 10) open(f);
          else music.chime(Math.floor(Math.random() * 5), 0);
        },
        draw(f) {
          const { press, w, h, t, boil, pointer } = f;
          const s = boil % 3;
          const since = ctx.reducedMotion ? 9 : performance.now() / 1000 - born;
          const d = door(f);
          const gy = f.wide ? h : h * 0.5;

          // Twilight in the wood.
          const air = new Path2D();
          air.rect(0, 0, w, h);
          press.fill(air, { a: 0.32, b: 0.2, c: 0.18 });
          const under = new Path2D();
          under.rect(0, f.wide ? h * 0.7 : h * 0.33, w, h);
          press.fill(under, { a: 0.35, c: 0.5 }, { over: true });

          // The great tree: a trunk with roots, bark, and a wide crown across the top.
          const tx = d.x;
          const trunkW = f.wide ? w * 0.13 : w * 0.2;
          press.fill(ribbon([[tx, gy], [tx - trunkW * 0.08, gy - (gy * 0.5)], [tx + trunkW * 0.1, f.wide ? h * 0.18 : h * 0.08]], { w: trunkW, taper: 0.5, rough: 0.15, amt: 0.6, seed: 5 + s }), { a: 0.75, b: 0.6, c: 0.7 });
          const roots = new Path2D();
          for (const [dx, k] of [[-1, 0.7], [-0.5, 0.4], [0.6, 0.5], [1, 0.8]]) ribbon([[tx + dx * trunkW * 0.3, gy - trunkW * 0.3], [tx + dx * trunkW * (0.6 + k), gy]], { w: trunkW * 0.18, taper: 0.8, amt: 1, seed: Math.floor(k * 10) }, roots);
          press.fill(roots, { a: 0.75, b: 0.6, c: 0.7 });
          const bark = new Path2D();
          for (let i = 0; i < 26; i++) dab(bark, tx + Math.sin(i * 2.3) * trunkW * 0.3, gy - (i / 26) * gy * 0.8, Math.PI / 2 + Math.sin(i) * 0.1, 18, 1.4, 0.4);
          press.fill(bark, { a: 1, b: 0.9, c: 0.8 }, { over: true });
          // the crown: a dark mass first, then leaves in three greens over it
          const cx = w * (f.wide ? 0.32 : 0.35);
          const cy = h * (f.wide ? 0.2 : 0.1);
          const mass = new Path2D();
          for (let i = 0; i < 7; i++) curvy(handEllipse(cx + Math.cos(i * 0.9) * w * (f.wide ? 0.16 : 0.22), cy + Math.sin(i * 1.3) * h * (f.wide ? 0.08 : 0.04), w * (f.wide ? 0.12 : 0.16), h * (f.wide ? 0.12 : 0.06), 60 + i, 6), mass);
          press.fill(mass, { a: 0.8, c: 0.85, b: 0.2 });
          const crown = [new Path2D(), new Path2D(), new Path2D()];
          for (const [i, l] of leaves.entries()) dab(crown[i % 3], l.x + Math.sin(t * 0.7 + l.a) * 2, l.y, l.a, 18 + l.s * 20, 6 + l.s * 5, 0.5);
          press.fill(crown[0], { a: 0.95, c: 1 }, { over: true });
          press.fill(crown[1], { a: 0.5, c: 1 }, { over: true });
          press.fill(crown[2], { a: 0.2, c: 0.95 }, { over: true });

          // The door: dark wood, arched, light leaking round the edges; open, it's all light.
          const openK = opened < 0 ? 0 : Math.min(1, (t - opened) / 0.8);
          const arch: Pt[] = [[d.x - d.w / 2, d.y]];
          for (let k = 0; k <= 10; k++) {
            const a = Math.PI + (k / 10) * Math.PI;
            arch.push([d.x + Math.cos(a) * d.w / 2, d.y - d.h + d.w / 2 + Math.sin(a) * d.w / 2]);
          }
          arch.push([d.x + d.w / 2, d.y]);
          const pulse = 0.75 + Math.sin(t * 2) * 0.25;
          press.knock(curvy(wobble(arch.map(([x, y]) => [d.x + (x - d.x) * 1.25, d.y - (d.y - y) * 1.12] as Pt), true, 0.6, 8, 4)));
          press.fill(curvy(wobble(arch.map(([x, y]) => [d.x + (x - d.x) * 1.25, d.y - (d.y - y) * 1.12] as Pt), true, 0.6, 8, 4)), { c: 0.9 * pulse, b: 0.2 });
          if (openK < 1) {
            // the leaf swings in: it narrows toward its hinge
            const leaf = arch.map(([x, y]) => [d.x - d.w / 2 + (x - (d.x - d.w / 2)) * (1 - openK * 0.85), y] as Pt);
            press.fill(curvy(wobble(leaf, true, 0.5, 9, 4)), { a: 0.85, b: 0.7, c: 0.75 });
            press.fill(curvy(handEllipse(d.x - d.w / 2 + d.w * 0.75 * (1 - openK * 0.85), d.y - d.h * 0.45, d.w * 0.06, d.w * 0.06, 10, 0.3)), { c: 1 });
          }
          press.fill(ribbon(arch, { closed: true, w: 2, rough: 0.5, amt: 0.6, seed: 11 + s }), { a: 1, b: 0.9 }, { over: true });
          if (openK > 0) {
            press.vignette((g) => {
              const gr = g.createRadialGradient(d.x, d.y - d.h * 0.5, 0, d.x, d.y - d.h * 0.5, d.h * 3 * openK);
              gr.addColorStop(0, 'rgb(40,40,40)');
              gr.addColorStop(1, 'rgb(255,255,255)');
              g.fillStyle = gr;
              g.fillRect(0, 0, w, h);
            });
          }

          // The golden thread: it draws itself in, then lights up wherever you trace it.
          const drawn = Math.min(1, Math.max(0, (since - 0.4) / 3));
          const n = Math.max(2, Math.floor(path.length * drawn));
          if (pointer.inside && opened < 0) {
            // follow the reader along the thread, only forward from where they've got to
            const front = Math.floor(traced * path.length);
            for (let i = front; i < Math.min(n, front + 24); i++) {
              const [px, py] = path[i];
              if (Math.hypot(px - pointer.x, py - pointer.y) < 34) traced = Math.max(traced, i / (path.length - 1));
            }
            if (traced > 0.97) open(f);
          }
          const lit = Math.floor(traced * (path.length - 1));
          if (n > 1) {
            const shown = path.slice(0, n);
            // A pale, trodden trail through the undergrowth, with the thread running along it.
            const trail = ribbon(shown, { w: 9, taper: 0.02, rough: 0.5, amt: 1, seed: 16 });
            press.knock(trail);
            press.fill(trail, { c: 0.3, b: 0.05 });
            const line = ribbon(shown, { w: 1.4, taper: 0.02, amt: 0.4, seed: 24 });
            press.fill(line, { c: 0.95, b: 0.45, a: 0.15 });
            // The thread itself, in marching dashes that run toward the door: follow me.
            const dashes = new Path2D();
            const step = 7;
            const offset = Math.floor(t * 9) % (step * 2);
            for (let i = lit + offset; i < n - 1; i += step * 2) ribbon(path.slice(i, Math.min(n, i + step + 1)), { w: 2.6, taper: 0.3, amt: 0.3, seed: i }, dashes);
            press.knock(dashes);
            press.fill(dashes, { c: 1, b: 0.1 });
            // A spark that runs along it, again and again, from where you are to the door.
            if (opened < 0 && drawn >= 1) {
              const u = (t * 0.22) % 1;
              const at = path[Math.min(n - 1, lit + Math.floor(u * (n - 1 - lit)))];
              const r = 7 + Math.sin(t * 10) * 1.5;
              press.fill(curvy(handEllipse(at[0], at[1], r * 2.2, r * 2.2, 18, 1)), { c: 0.7, b: 0.2 }, { over: true, alpha: 0.6 });
              press.knock(curvy(handEllipse(at[0], at[1], r, r, 19, 0.6)));
              press.fill(curvy(handEllipse(at[0], at[1], r, r, 19, 0.6)), { c: 1, b: 0.15 });
            }
          }
          if (lit > 1) {
            // Where you've traced: solid, brighter, and wider.
            const litPath = ribbon(path.slice(0, lit + 1), { w: 8, taper: 0.02, amt: 0.4, seed: 13 + s });
            // a wide, breathing glow round the traced thread
            const breathe = 0.75 + Math.sin(t * 3) * 0.25;
            press.fill(ribbon(path.slice(0, lit + 1), { w: 34, taper: 0.02, amt: 0.4, seed: 17 }), { c: 0.75, b: 0.2 }, { over: true, alpha: 0.55 * breathe });
            press.fill(ribbon(path.slice(0, lit + 1), { w: 18, taper: 0.02, amt: 0.4, seed: 25 }), { c: 0.95, b: 0.3 }, { over: true, alpha: 0.85 });
            press.knock(litPath);
            press.fill(litPath, { c: 1, b: 0.12 });
            // and a white-hot core
            press.knock(ribbon(path.slice(0, lit + 1), { w: 2.2, taper: 0.02, amt: 0.4, seed: 26 }));
            const [bx, by] = path[lit];
            const r = 9 + Math.sin(t * 6) * 2;
            press.fill(ribbon(handEllipse(bx, by, r * 1.8, r * 1.8, 20, 1), { closed: true, w: 2.4, amt: 0.4, seed: 21 }), { c: 1, b: 0.5 }, { over: true });
            press.knock(curvy(handEllipse(bx, by, r, r, 14, 0.5)));
            press.fill(curvy(handEllipse(bx, by, r, r, 14, 0.5)), { c: 1, b: 0.5 });
            // sparkles shake off the thread as you trace it
            if (lit > lastLit + 6) {
              lastLit = lit;
              const v = f.toViewport(bx, by);
              escape.launch(moteStamp(), v.x, v.y, { size: 18, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 40, flutter: 20, drag: 0.7, fade: 0.8 });
            }
          } else if (n > 1) {
            // a bead waiting at the start, pulsing, ringed: start here
            const [bx, by] = path[0];
            const r = 9 + Math.sin(t * 4) * 2.5;
            press.fill(ribbon(handEllipse(bx, by, r * 2, r * 2, 22, 1), { closed: true, w: 2.4, amt: 0.4, seed: 23 }), { c: 1, b: 0.5 }, { over: true });
            press.knock(curvy(handEllipse(bx, by, r, r, 15, 0.4)));
            press.fill(curvy(handEllipse(bx, by, r, r, 15, 0.4)), { c: 1, b: 0.4 });
          }
        },
      });
    },
    { copy: COPY },
  );
