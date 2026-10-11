import { loadFigure, type Figure, type Press, type Tones } from './press';
import { curvy, wobble, ribbon, handEllipse, type Pt } from './brush';

/**
 * Tenniel's figures, printed. Each comes from tools/figure.mjs with the crop offset it
 * printed, so the wash shapes (traced in the plate's own pixels, see tools/plates.json)
 * land on the right parts of the drawing.
 */

export interface PrintedFigure {
  src: string;
  /** Crop offset and source height, from tools/figure.mjs. */
  offset: Pt;
  sourceH: number;
  /** Ink tones for Tenniel's line. */
  ink: Tones;
  /** Loose watercolour-like washes, in plate pixels, printed over the knocked-out figure. */
  washes: { pts: Pt[]; tones: Tones }[];
}

export const RABBIT: PrintedFigure = {
  src: '/illustrations/figures/rabbit.png',
  offset: [136, 6],
  sourceH: 1108,
  // Violet line: blue over pink.
  ink: { a: 1, b: 0.8 },
  washes: [
    // checked coat and sleeve: coral (pink + yellow)
    { pts: [[330, 330], [440, 305], [520, 380], [600, 520], [612, 720], [580, 762], [470, 742], [420, 640], [386, 560], [372, 455]], tones: { b: 0.5, c: 0.55 } },
    { pts: [[192, 400], [300, 392], [322, 470], [226, 522], [182, 462]], tones: { b: 0.5, c: 0.55 } },
    // waistcoat: yellow
    { pts: [[302, 402], [362, 384], [384, 700], [344, 724], [312, 604]], tones: { c: 0.75 } },
    // inside the ears: pink
    { pts: ellipsePts(418, 105, 12, 66, 24), tones: { b: 0.35 } },
    { pts: ellipsePts(492, 112, 14, 64, 20), tones: { b: 0.3 } },
    // the watch: gold
    { pts: ellipsePts(182, 388, 30, 34, 0), tones: { c: 1, b: 0.15 } },
    // the tuft of grass at his feet: green (blue + yellow)
    { pts: [[330, 960], [420, 1000], [520, 1080], [600, 1090], [560, 1112], [380, 1100], [300, 1040]], tones: { a: 0.35, c: 0.7 } },
  ],
};

export const ALICE_CURTAIN: PrintedFigure = {
  src: '/illustrations/figures/alice-curtain.png',
  offset: [0, 0],
  sourceH: 544,
  ink: { a: 1, b: 0.9, c: 0.6 },
  washes: [
    // dress: yellow; hair: gold; stockings and shoes left as line
    { pts: [[20, 200], [150, 150], [200, 230], [310, 260], [300, 390], [200, 410], [40, 360], [10, 280]], tones: { c: 0.55 } },
    { pts: [[170, 0], [330, 0], [345, 110], [300, 210], [200, 190], [150, 120]], tones: { c: 0.4, b: 0.12 } },
  ],
};

function ellipsePts(cx: number, cy: number, rx: number, ry: number, rotDeg: number): Pt[] {
  const r = (rotDeg * Math.PI) / 180;
  return Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return [cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)] as Pt;
  });
}

const loaded = new Map<string, Figure>();
export function preload(fig: PrintedFigure) {
  return loadFigure(fig.src).then((f) => {
    loaded.set(fig.src, f);
    return f;
  });
}

/** The loaded figure images, or undefined until preload() has finished. */
export const figureOf = (fig: PrintedFigure) => loaded.get(fig.src);

/**
 * Print a figure with its feet (bottom centre) at the current origin, `height` tall.
 * Returns its size, or null until the image has loaded.
 */
export function printFigure(press: Press, fig: PrintedFigure, height: number, boil: number, extraInk: Tones = {}, fade = 1) {
  const f = loaded.get(fig.src);
  if (!f) return null;
  const k = height / fig.sourceH;
  const w = f.w * k;
  if (fade <= 0) return { w, h: height };
  press.figure(f, -w / 2, -height, height, { ...fig.ink, ...extraInk }, { fade });
  // Washes: loose, wobbled shapes that drift a little on the boil, like hand colouring.
  for (const [i, wash] of fig.washes.entries()) {
    const pts = wash.pts.map(([x, y]) => [(x - fig.offset[0]) * k - w / 2, (y - fig.offset[1]) * k - height] as Pt);
    press.fill(curvy(wobble(pts, true, 2.2, i * 13 + (boil % 3), 6)), scaleTones(wash.tones, fade), { over: true });
  }
  return { w, h: height };
}

const scaleTones = (t: Tones, k: number): Tones => {
  if (k >= 1) return t;
  const out: Tones = {};
  for (const [n, v] of Object.entries(t) as [keyof Tones, Tones[keyof Tones]][]) out[n] = typeof v === 'number' ? v * k : v;
  return out;
};

/** A point in a figure's plate coordinates, relative to its feet (bottom centre) at `height`. */
export function figurePoint(fig: PrintedFigure, height: number, px: number, py: number): Pt | null {
  const f = loaded.get(fig.src);
  if (!f) return null;
  const k = height / fig.sourceH;
  return [(px - fig.offset[0]) * k - (f.w * k) / 2, (py - fig.offset[1]) * k - height];
}

/** A pocket watch drawn by hand: wobbly rim, ticks, hands at 4:04 (or `time`), and a second hand that ticks. */
export function printWatch(press: Press, x: number, y: number, r: number, t: number, boil: number, time: [number, number] = [4, 4]) {
  const seed = (boil % 3) + 40;
  // the case: gold, with a darker rim
  press.fill(curvy(handEllipse(x, y, r, r, seed, r * 0.04)), { c: 0.95, b: 0.2 });
  press.fill(ribbon(handEllipse(x, y, r, r, seed + 1, r * 0.03), { closed: true, w: r * 0.07, rough: 0.5, seed: seed + 2 }), { a: 0.9, b: 0.7 }, { over: true });
  // the bow and stem
  press.fill(ribbon(handEllipse(x, y - r * 1.18, r * 0.16, r * 0.14, seed + 3), { closed: true, w: r * 0.06, rough: 0.4, seed }), { a: 0.9, b: 0.7 }, { over: true });
  // the face: paper
  press.knock(curvy(handEllipse(x, y, r * 0.8, r * 0.8, seed + 4, r * 0.02)));
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const r0 = r * (k % 3 ? 0.68 : 0.6);
    press.fill(ribbon([[x + Math.sin(a) * r0, y - Math.cos(a) * r0], [x + Math.sin(a) * r * 0.76, y - Math.cos(a) * r * 0.76]], { w: r * (k % 3 ? 0.03 : 0.05), amt: 0, seed: k }), { a: 1, b: 0.8 });
  }
  const hand = (deg: number, len: number, w: number, tones: Tones, s: number) => {
    const a = (deg * Math.PI) / 180;
    press.fill(ribbon([[x - Math.sin(a) * len * 0.12, y + Math.cos(a) * len * 0.12], [x + Math.sin(a) * len, y - Math.cos(a) * len]], { w, taper: 0.35, amt: 0.6, seed: s + boil % 3 }), tones);
  };
  hand(((time[0] % 12) + time[1] / 60) * 30, r * 0.38, r * 0.1, { a: 1, b: 0.8 }, 1);
  hand(time[1] * 6, r * 0.6, r * 0.07, { a: 1, b: 0.8 }, 2);
  hand(Math.floor(t) * 6, r * 0.66, r * 0.035, { b: 1 }, 3);
  press.fill(curvy(handEllipse(x, y, r * 0.06, r * 0.06, seed + 5, 0.3)), { b: 1 });
}

/** Print a figure as a solid silhouette with its feet at the origin. */
export function printSilhouette(press: Press, fig: PrintedFigure, height: number, tones: Tones, dx = 0, dy = 0) {
  const f = loaded.get(fig.src);
  if (!f) return null;
  const w = (f.w / f.h) * height;
  press.silhouette(f, -w / 2 + dx, -height + dy, height, tones);
  return { w, h: height };
}

// ---------- Act 2: Wrong Sizes ----------

const DRESS: Tones = { c: 0.55 };
const HAIR: Tones = { c: 0.45, b: 0.12 };

/** Plate 04: Alice with the DRINK ME bottle. */
export const ALICE_BOTTLE: PrintedFigure = {
  src: '/illustrations/figures/alice-bottle.png',
  offset: [66, 4],
  sourceH: 655,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[175, 300], [300, 260], [470, 400], [420, 455], [260, 470], [165, 440]], tones: DRESS },
    { pts: [[210, 20], [330, 15], [345, 100], [320, 190], [225, 170], [200, 90]], tones: HAIR },
    { pts: [[130, 140], [175, 135], [165, 215], [138, 215]], tones: { a: 0.7, b: 0.35 } },
  ],
};

/** Plate 05: Alice, grown very tall. */
export const ALICE_TALL: PrintedFigure = {
  src: '/illustrations/figures/alice-tall.png',
  offset: [108, 36],
  sourceH: 1180,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[200, 400], [430, 380], [505, 800], [470, 890], [160, 880], [150, 790], [230, 560]], tones: DRESS },
    { pts: [[180, 40], [460, 60], [470, 300], [410, 330], [300, 200], [200, 300], [170, 200]], tones: HAIR },
  ],
};

/** Plate 07: Alice swimming in the pool of tears (head and arm above the water). */
export const ALICE_SWIM: PrintedFigure = {
  src: '/illustrations/figures/alice-swim.png',
  offset: [106, 66],
  sourceH: 230,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[150, 110], [260, 80], [280, 160], [230, 250], [150, 280], [120, 210]], tones: HAIR },
    { pts: [[310, 200], [380, 210], [380, 250], [320, 255]], tones: { b: 0.35 } },
  ],
};

/** Plate 09: the Dodo presents Alice with her own thimble, the creatures crowding round. */
export const DODO: PrintedFigure = {
  src: '/illustrations/figures/dodo.png',
  offset: [6, 36],
  sourceH: 858,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[40, 500], [160, 420], [280, 520], [280, 680], [50, 660]], tones: DRESS },
    { pts: [[340, 330], [600, 380], [690, 560], [600, 700], [440, 700], [350, 560]], tones: { a: 0.35, c: 0.2 } },
    { pts: [[320, 250], [430, 240], [420, 310], [330, 330]], tones: { c: 0.8, b: 0.4 } },
    { pts: [[230, 160], [330, 160], [320, 260], [240, 250]], tones: { b: 0.75, c: 0.3 } },
    { pts: [[0, 760], [780, 760], [780, 880], [0, 880]], tones: { c: 0.3, a: 0.1 } },
  ],
};

/** Plate 12: Alice's enormous hand reaches into the garden; the Rabbit tumbles into the cucumber frame. */
export const HOUSE: PrintedFigure = {
  src: '/illustrations/figures/house.png',
  offset: [16, 16],
  sourceH: 698,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[95, 40], [200, 20], [300, 130], [430, 190], [460, 260], [430, 280], [360, 250], [370, 350], [340, 355], [300, 300], [270, 350], [250, 340], [250, 270], [210, 300], [185, 290], [200, 220], [170, 140], [90, 60]], tones: { c: 0.35, b: 0.25 } },
    { pts: [[140, 400], [300, 400], [320, 480], [200, 520], [150, 470]], tones: { b: 0.5, c: 0.55 } },
    { pts: [[40, 380], [400, 380], [410, 600], [40, 590]], tones: { a: 0.2, c: 0.35 } },
    { pts: [[20, 60], [170, 60], [170, 330], [20, 330]], tones: { b: 0.3, c: 0.4 } },
  ],
};

/** Plate 13, top: Bill the Lizard, kicked up the chimney in a puff of smoke. */
export const BILL: PrintedFigure = {
  src: '/illustrations/figures/bill.png',
  offset: [16, 16],
  sourceH: 848,
  ink: { a: 1, b: 0.8 },
  washes: [{ pts: [[230, 20], [300, 30], [300, 200], [330, 260], [300, 520], [230, 800], [200, 830], [180, 600], [140, 420], [150, 260], [220, 150]], tones: { a: 0.45, c: 0.8 } }],
};

/** Plate 13, bottom: the chimney he came out of. */
export const CHIMNEY: PrintedFigure = {
  src: '/illustrations/figures/chimney.png',
  offset: [46, 826],
  sourceH: 400,
  ink: { a: 1, b: 0.8 },
  washes: [{ pts: [[80, 840], [330, 840], [340, 1100], [90, 1180]], tones: { b: 0.55, c: 0.6 } }],
};

// ---------- Act 3: The Woods ----------

const LEAVES: Tones = { a: 0.3, c: 0.45 };

/** Plate 15: the Caterpillar on his mushroom, with his hookah; Alice peeps over the edge. */
export const CATERPILLAR: PrintedFigure = {
  src: '/illustrations/figures/caterpillar.png',
  offset: [16, 36],
  sourceH: 843,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[20, 600], [300, 600], [320, 860], [20, 860]], tones: LEAVES },
    { pts: [[200, 110], [310, 110], [330, 250], [290, 440], [150, 430], [130, 330], [200, 250]], tones: { a: 0.5, c: 0.08 } },
    { pts: [[40, 450], [300, 390], [520, 400], [630, 450], [600, 520], [300, 545], [60, 500]], tones: { b: 0.4, c: 0.45 } },
    { pts: [[390, 520], [600, 520], [640, 670], [380, 680]], tones: DRESS },
    { pts: [[440, 350], [520, 350], [520, 420], [440, 420]], tones: HAIR },
  ],
};

/** Plate 22: Alice in the wood. */
export const ALICE_WOOD: PrintedFigure = {
  src: '/illustrations/figures/alice-wood.png',
  offset: [36, 76],
  sourceH: 600,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[130, 380], [330, 370], [350, 520], [120, 520]], tones: DRESS },
    { pts: [[180, 110], [290, 110], [300, 240], [180, 250]], tones: HAIR },
    { pts: [[50, 320], [150, 310], [150, 410], [60, 400]], tones: { b: 0.4 } },
  ],
};

/** Plate 23: the Cheshire Cat on his bough; Alice looks up at him. */
export const CHESHIRE_TREE: PrintedFigure = {
  src: '/illustrations/figures/cheshire-tree.png',
  offset: [11, 26],
  sourceH: 1193,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[20, 40], [860, 40], [860, 500], [300, 520], [200, 640], [20, 640]], tones: LEAVES },
    { pts: [[410, 110], [720, 100], [790, 250], [640, 300], [430, 290]], tones: { c: 0.6, b: 0.4 } },
    { pts: [[60, 820], [250, 830], [300, 1080], [40, 1080]], tones: DRESS },
    { pts: [[110, 700], [220, 700], [230, 860], [110, 860]], tones: HAIR },
  ],
};
/** Where the Cat's eyes and grin are, in plate 23. */
export const CHESHIRE_EYES: [number, number][] = [[468, 214], [530, 212]];
export const CHESHIRE_GRIN: [number, number] = [505, 262];

/** Plate 24: the Cat in the tree, his grin the last thing left. */
export const GRIN: PrintedFigure = {
  src: '/illustrations/figures/grin.png',
  offset: [6, 4],
  sourceH: 542,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[0, 0], [846, 0], [846, 548], [0, 548]], tones: { a: 0.22, c: 0.35 } },
    { pts: [[380, 110], [800, 120], [810, 280], [400, 290]], tones: { c: 0.6, b: 0.4 } },
  ],
};

/** Plate 25: the Mad Tea Party. */
export const TEA_PARTY: PrintedFigure = {
  src: '/illustrations/figures/tea-party.png',
  offset: [16, 4],
  sourceH: 652,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[40, 230], [230, 240], [230, 380], [40, 380]], tones: DRESS },
    { pts: [[640, 80], [830, 110], [800, 250], [650, 230]], tones: { b: 0.55, c: 0.2 } },
    { pts: [[350, 90], [500, 90], [510, 300], [380, 320]], tones: { c: 0.45, b: 0.2 } },
    { pts: [[70, 390], [860, 380], [860, 600], [70, 610]], tones: { a: 0.12, c: 0.12 } },
    { pts: [[0, 0], [330, 0], [330, 230], [0, 230]], tones: LEAVES },
  ],
};

// ---------- Act 4: The Court ----------

const RED: Tones = { b: 0.85, c: 0.35 };

/** Plate 28: three card-gardeners painting the white roses red. */
export const GARDENERS: PrintedFigure = {
  src: '/illustrations/figures/gardeners.png',
  offset: [26, 16],
  sourceH: 713,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[270, 20], [380, 40], [470, 140], [450, 250], [330, 280], [200, 270], [110, 200], [120, 90], [190, 30]], tones: LEAVES },
    { pts: [[70, 330], [190, 330], [200, 560], [80, 570]], tones: { c: 0.25, a: 0.08 } },
    { pts: [[300, 360], [470, 350], [470, 560], [310, 560]], tones: { c: 0.25, a: 0.08 } },
    { pts: [[60, 560], [520, 560], [520, 720], [60, 720]], tones: LEAVES },
  ],
};
/** Where the roses are on plate 28, and how big. */
export const ROSES: [number, number, number][] = [[240, 78, 30], [335, 75, 30], [185, 188, 30], [322, 212, 30], [412, 150, 28], [232, 258, 28]];

/** Plate 29: the Queen of Hearts in full cry, the King, the court, and Alice. */
export const QUEEN: PrintedFigure = {
  src: '/illustrations/figures/queen.png',
  offset: [8, 26],
  sourceH: 990,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[40, 60], [300, 40], [600, 50], [840, 70], [840, 280], [600, 300], [300, 300], [40, 280]], tones: { a: 0.25, c: 0.45 } },
    { pts: [[120, 400], [210, 380], [290, 470], [330, 650], [330, 840], [200, 870], [70, 850], [40, 690], [70, 520]], tones: { b: 0.6, c: 0.25 } },
    { pts: [[560, 340], [640, 320], [720, 345], [712, 395], [640, 410], [565, 395]], tones: { c: 0.85, b: 0.25 } },
    { pts: [[490, 570], [580, 555], [640, 690], [655, 780], [560, 800], [455, 785], [470, 680]], tones: DRESS },
    { pts: [[660, 440], [760, 425], [820, 520], [828, 630], [720, 640], [660, 560]], tones: { b: 0.55, c: 0.25 } },
  ],
};

/** Plate 37: the White Rabbit as herald, trumpet and scroll. */
export const HERALD: PrintedFigure = {
  src: '/illustrations/figures/herald.png',
  offset: [16, 6],
  sourceH: 698,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[50, 220], [310, 200], [330, 480], [80, 470]], tones: RED },
    { pts: [[290, 320], [500, 300], [500, 460], [290, 470]], tones: { c: 0.35 } },
    { pts: [[22, 176], [80, 168], [180, 172], [182, 194], [80, 198], [24, 200]], tones: { c: 0.9, b: 0.3 } },
  ],
};
/** Where the herald's scroll and trumpet are, on plate 37. */
export const HERALD_SCROLL: [number, number] = [430, 380];
export const HERALD_TRUMPET: [number, number] = [30, 182];

/** Plate 42: the whole pack rises into the air and comes flying down upon her. */
export const CARD_STORM: PrintedFigure = {
  src: '/illustrations/figures/card-storm.png',
  offset: [16, 16],
  sourceH: 1093,
  ink: { a: 1, b: 0.8 },
  washes: [
    { pts: [[330, 220], [640, 220], [700, 860], [280, 860]], tones: DRESS },
    { pts: [[420, 180], [620, 160], [640, 330], [430, 340]], tones: HAIR },
    { pts: [[620, 600], [800, 600], [800, 800], [630, 800]], tones: { c: 0.2 } },
  ],
};
