// Cuts a figure out of a tinted plate along a hand-traced outline, with a feathered
// edge, so it can move on its own (e.g. the White Rabbit tumbling down the well).
//
// Usage (sharp is not a project dependency; run from any folder where it is installed):
//   node <project>/tools/cutout.mjs <tinted plate.webp> <out.webp> <source width> <source height> '<[[x,y],...]>'
// The outline is in the source plate's pixel coordinates (as in tools/plates.json).

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const sharp = createRequire(join(process.cwd(), '/'))('sharp');
const [, , src, out, sw, sh, outline] = process.argv;
const points = JSON.parse(outline);

const meta = await sharp(src).metadata();
const W = meta.width, H = meta.height;
const kx = W / Number(sw);
const ky = H / Number(sh);
const poly = points.map(([x, y]) => `${(x * kx).toFixed(1)},${(y * ky).toFixed(1)}`).join(' ');
// A wide blur, then keeping only its core, pulls the edge inward and softens it:
// a hand-traced outline is always a little loose.
const feather = Math.max(3, Math.round(W * 0.016));
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <filter id="f"><feGaussianBlur stdDeviation="${feather}"/></filter>
  <rect width="100%" height="100%" fill="#000"/>
  <polygon points="${poly}" fill="#fff" filter="url(#f)"/>
</svg>`;
const mask = await sharp(Buffer.from(maskSvg)).extractChannel(0).raw().toBuffer();
const rgb = await sharp(src).removeAlpha().raw().toBuffer();

const px = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  px[i * 4] = rgb[i * 3];
  px[i * 4 + 1] = rgb[i * 3 + 1];
  px[i * 4 + 2] = rgb[i * 3 + 2];
  const m = mask[i] / 255;
  const t = Math.min(1, Math.max(0, (m - 0.62) / 0.3));
  px[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255);
}
// Trim to the outline's bounding box.
const xs = points.map((p) => p[0] * kx), ys = points.map((p) => p[1] * ky);
const left = Math.max(0, Math.floor(Math.min(...xs) - feather * 2));
const top = Math.max(0, Math.floor(Math.min(...ys) - feather * 2));
const width = Math.min(W - left, Math.ceil(Math.max(...xs) + feather * 2) - left);
const height = Math.min(H - top, Math.ceil(Math.max(...ys) + feather * 2) - top);
mkdirSync(dirname(out), { recursive: true });
await sharp(px, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left, top, width, height })
  .resize({ width: Math.min(width, 520) })
  .webp({ quality: 82, alphaQuality: 85 })
  .toFile(out);
console.log('wrote', out);
