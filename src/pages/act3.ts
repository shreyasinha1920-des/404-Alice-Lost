import { ribbon, curvy, dab, type Pt } from '../print/brush';
import type { Press } from '../print/press';

/** Shared bits for Act 3, The Woods (pages 12 to 17). */

/** A grin, drawn as a crescent of teeth, `r` wide, centred at (x, y). */
export function grin(press: Press, x: number, y: number, r: number, s: number, glow = 0) {
  const outerAt = (q: number): Pt => [x + Math.cos(q) * r, y + Math.sin(q) * r * 0.55];
  const innerAt = (q: number): Pt => [x + Math.cos(q) * r * 0.96, y - r * 0.18 + Math.sin(q) * r * 0.42];
  const pts: Pt[] = [];
  for (let i = 0; i <= 20; i++) pts.push(outerAt(0.1 + (i / 20) * (Math.PI - 0.2)));
  for (let i = 20; i >= 0; i--) pts.push(innerAt(0.1 + (i / 20) * (Math.PI - 0.2)));
  const shape = curvy(pts);
  press.knock(shape);
  press.fill(shape, { b: 0.85 + glow * 0.15, c: 0.3 + glow * 0.5 });
  const teeth = new Path2D();
  for (let i = -5; i <= 5; i++) {
    const a = Math.PI / 2 + i * 0.22;
    dab(teeth, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.36, a, r * 0.17, r * 0.05, 0);
  }
  press.knock(teeth);
  press.fill(ribbon(pts, { closed: true, w: Math.max(1.2, r * 0.05), rough: 0.4, amt: 0.6, seed: 7 + s }), { a: 1, b: 0.8 }, { over: true });
}

