// Makes a flat silhouette of one of Tenniel's figures, for the riso-style scenes.
// The edge comes from Tenniel's own lines, not a hand-traced outline: inside a loose
// outline, the engraving's ink is thickened until it closes into a solid shape, and any
// holes are filled. The result is a white shape on transparency; scenes ink it any colour.
//
// Usage (sharp is not a project dependency; run from any folder where it is installed):
//   node <project>/tools/silhouette.mjs <plate-NN.png> <out.png> <close radius px> '<[[x,y],...]>' [ink threshold 0-255, default 18]
// The loose outline is in the plate's pixel coordinates; it only needs to exclude neighbours.

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const sharp = createRequire(join(process.cwd(), '/'))('sharp');
const [, , src, out, radius, outline, threshold = '18'] = process.argv;
const points = JSON.parse(outline);
const R = Number(radius);

const img = sharp(src).flatten({ background: '#fff' }).greyscale();
const { width: W, height: H } = await img.metadata();

// Ink, thickened: blur the darkness and keep anything with ink nearby.
const inkBlur = await img.clone().negate().blur(R / 2).extractChannel(0).raw().toBuffer();
const polySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%"/><polygon points="${points.map((p) => p.join(',')).join(' ')}" fill="#fff"/></svg>`;
const poly = await sharp(Buffer.from(polySvg)).extractChannel(0).raw().toBuffer();
// The outline's deep interior is always solid: white fur or a pinafore has no ink to close
// around. Ink then decides the edges, where Tenniel's line is.
const core = await sharp(Buffer.from(polySvg)).blur(R * 1.5).extractChannel(0).raw().toBuffer();

const solid = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) solid[i] = poly[i] > 127 && (inkBlur[i] > Number(threshold) || core[i] > 250) ? 1 : 0;

// Fill holes: anything not reachable from the border without crossing the shape is inside.
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

// Shrink back by the amount we thickened, so the silhouette is no fatter than the figure.
const fill = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) fill[i] = outside[i] ? 0 : 255;
const eroded = await sharp(fill, { raw: { width: W, height: H, channels: 1 } }).blur(R / 3).extractChannel(0).raw().toBuffer();

const px = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const t = Math.min(1, Math.max(0, (eroded[i] - 150) / 60));
  px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 255;
  px[i * 4 + 3] = Math.round(t * 255);
}
const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
const left = Math.max(0, Math.min(...xs) - 4), top = Math.max(0, Math.min(...ys) - 4);
mkdirSync(dirname(out), { recursive: true });
await sharp(px, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left, top, width: Math.min(W - left, Math.max(...xs) + 4 - left), height: Math.min(H - top, Math.max(...ys) + 4 - top) })
  .png({ compressionLevel: 9 })
  .toFile(out);
console.log('wrote', out);
