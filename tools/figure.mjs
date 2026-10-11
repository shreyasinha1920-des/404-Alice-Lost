// Turns one of Tenniel's figures into a printable figure for the riso press
// (src/print/): his engraved line work, plus the solid shape it encloses.
//
// Output PNG channels:  R = ink (how dark Tenniel's line is, 0..255)
//                       G = shape (inside the figure, feathered edge)
//                       B = unused, A = 255
// The press knocks the shape back to paper (his white fur stays white), then
// prints the ink in whichever inks the scene chooses, with washes on top.
//
// Usage (sharp is not a project dependency; run from any folder where it is installed):
//   node <project>/tools/figure.mjs <plate-NN.png> <out.png> <close radius> '<[[x,y],...]>' [ink threshold]
// The outline is loose, in plate pixels; Tenniel's lines decide the true edge.
// Prints the crop offset, so wash shapes in plate coordinates can be shifted to match.

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const sharp = createRequire(join(process.cwd(), '/'))('sharp');
const [, , src, out, radius, outline, threshold = '30'] = process.argv;
const points = JSON.parse(outline);
const R = Number(radius);

const base = sharp(src).flatten({ background: '#fff' }).greyscale();
const { width: W, height: H } = await base.metadata();
const grey = await base.clone().extractChannel(0).raw().toBuffer();
const inkBlur = await base.clone().negate().blur(R / 2).extractChannel(0).raw().toBuffer();
const polySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%"/><polygon points="${points.map((p) => p.join(',')).join(' ')}" fill="#fff"/></svg>`;
const poly = await sharp(Buffer.from(polySvg)).extractChannel(0).raw().toBuffer();
const core = await sharp(Buffer.from(polySvg)).blur(R * 1.5).extractChannel(0).raw().toBuffer();

// Solid wherever Tenniel's ink is near, or deep inside the outline; then fill holes.
const solid = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) solid[i] = poly[i] > 127 && (inkBlur[i] > Number(threshold) || core[i] > 250) ? 1 : 0;
const outside = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, x + (H - 1) * W);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const i = stack.pop();
  if (outside[i] || solid[i]) continue;
  outside[i] = 1;
  const x = i % W, y = (i / W) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < W - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - W);
  if (y < H - 1) stack.push(i + W);
}
const fill = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) fill[i] = outside[i] ? 0 : 255;
const shape = await sharp(fill, { raw: { width: W, height: H, channels: 1 } }).blur(R / 3).extractChannel(0).raw().toBuffer();

const px = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const s = Math.min(1, Math.max(0, (shape[i] - 140) / 70));
  // Levels on the ink: clean paper to nothing, keep fine hatching.
  const t = Math.min(1, Math.max(0, (0.9 - grey[i] / 255) / 0.65));
  px[i * 4] = Math.round(t * t * (3 - 2 * t) * s * 255);
  px[i * 4 + 1] = Math.round(s * 255);
  px[i * 4 + 2] = 0;
  px[i * 4 + 3] = 255;
}
const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
const left = Math.max(0, Math.min(...xs) - 4), top = Math.max(0, Math.min(...ys) - 4);
const width = Math.min(W - left, Math.max(...xs) + 4 - left), height = Math.min(H - top, Math.max(...ys) + 4 - top);
mkdirSync(dirname(out), { recursive: true });
await sharp(px, { raw: { width: W, height: H, channels: 4 } }).extract({ left, top, width, height }).png({ compressionLevel: 9 }).toFile(out);
console.log(JSON.stringify({ out, offset: [left, top], size: [width, height] }));
