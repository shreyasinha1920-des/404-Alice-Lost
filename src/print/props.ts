import type { Press, Tones } from './press';
import { curvy, wobble, ribbon, handEllipse, type Pt } from './brush';

/**
 * Things Alice sees in the well, drawn by hand for the press: wobbly outlines, brush
 * lines, labels knocked out to paper. Each is ~40 units across, centred on the origin;
 * call inside press.with() to place, turn and scale it.
 */

export type Prop = 'jar' | 'clock' | 'book' | 'cup' | 'map';

const LINE: Tones = { a: 1, b: 0.85, c: 0.6 };

export function printProp(press: Press, kind: Prop, tones: Tones, boil: number) {
  const s = (boil % 3) * 7;
  const shape = (pts: Pt[], amt = 0.9) => curvy(wobble(pts, true, amt, s + pts.length, 4));
  const outline = (pts: Pt[], w = 1.6) => ribbon(pts, { closed: true, w, rough: 0.4, amt: 0.7, seed: s + 3 });
  switch (kind) {
    case 'jar': {
      const body: Pt[] = [[-13, -15], [13, -15], [16, -10], [16, 15], [12, 20], [-12, 20], [-16, 15], [-16, -10]];
      press.fill(shape(body), tones);
      press.fill(shape([[-15, -22], [15, -22], [15, -15], [-15, -15]], 0.5), { c: 0.5, a: 0.15 });
      press.knock(shape([[-11, -6], [11, -6], [11, 9], [-11, 9]], 0.5));
      press.fill(outline(body), LINE, { over: true });
      press.text('ORANGE', 0, -1, 'italic 4.6px Georgia, serif', { a: 1, b: 0.8 });
      press.text('MARMALADE', 0, 5, 'italic 4.2px Georgia, serif', { a: 1, b: 0.8 });
      break;
    }
    case 'clock': {
      press.fill(curvy(handEllipse(0, 0, 19, 19, s + 1, 0.8)), tones);
      press.knock(curvy(handEllipse(0, 0, 14, 14, s + 2, 0.5)));
      press.fill(ribbon(handEllipse(0, 0, 19, 19, s + 3, 0.6), { closed: true, w: 1.8, rough: 0.5, seed: s }), LINE, { over: true });
      press.fill(ribbon([[0, 2], [7, -4]], { w: 2.4, taper: 0.4, amt: 0.3, seed: 1 }), LINE);
      press.fill(ribbon([[0, 2], [2.5, -11]], { w: 1.6, taper: 0.4, amt: 0.3, seed: 2 }), LINE);
      break;
    }
    case 'book': {
      const cover: Pt[] = [[-16, -21], [16, -20], [17, 21], [-15, 22]];
      press.fill(shape(cover), tones);
      press.knock(shape([[17, -19], [21, -18], [21, 20], [17, 21]], 0.4));
      press.fill(outline(cover, 1.4), LINE, { over: true });
      press.fill(ribbon([[-10, -12], [10, -12]], { w: 1.6, amt: 0.4, seed: 4 }), { c: 1 }, { over: true });
      press.fill(ribbon([[-10, 12], [10, 12]], { w: 1.6, amt: 0.4, seed: 5 }), { c: 1 }, { over: true });
      break;
    }
    case 'cup': {
      const cup: Pt[] = [[-15, -8], [15, -8], [12, 6], [4, 13], [-4, 13], [-12, 6]];
      press.fill(shape(cup), tones);
      press.fill(outline(cup, 1.4), LINE, { over: true });
      press.fill(ribbon(handEllipse(18, 0, 6, 6, s + 4, 0.3).slice(5, 15), { w: 2, amt: 0.3, seed: 6 }), LINE, { over: true });
      press.fill(ribbon(handEllipse(0, 16, 22, 3.5, s + 5, 0.4), { closed: true, w: 1.4, seed: 7 }), LINE, { over: true });
      break;
    }
    case 'map': {
      const sheet: Pt[] = [[-26, -17], [-9, -13], [8, -17], [26, -13], [26, 17], [8, 13], [-9, 17], [-26, 13]];
      press.fill(shape(sheet, 0.5), { c: 0.3 });
      press.fill(outline(sheet, 1.2), LINE, { over: true });
      press.fill(ribbon([[-22, 6], [-12, -4], [-2, 6], [6, -2], [14, 4], [22, -6]], { w: 1.4, amt: 0.6, seed: 8 }), { a: 0.9 }, { over: true });
      press.fill(ribbon([[-18, 10], [0, -10], [18, 8]], { w: 1.1, amt: 0.5, seed: 9 }), { b: 1 }, { over: true });
      break;
    }
  }
}

/** The tiny golden key, drawn with a brush. */
export function printKey(press: Press, boil: number) {
  const s = boil % 3;
  press.fill(ribbon(handEllipse(-13, 0, 7, 7, 30 + s, 0.4), { closed: true, w: 3.4, rough: 0.3, seed: 31 + s }), { c: 1, b: 0.3 });
  press.fill(ribbon([[-6, 0], [21, 0]], { w: 3.4, amt: 0.4, seed: 32 + s }), { c: 1, b: 0.3 });
  press.fill(ribbon([[15, 0], [15, 7]], { w: 3, amt: 0.2, seed: 33 }), { c: 1, b: 0.3 });
  press.fill(ribbon([[20, 0], [20, 5.5]], { w: 3, amt: 0.2, seed: 34 }), { c: 1, b: 0.3 });
}
