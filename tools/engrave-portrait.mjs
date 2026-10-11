// Regenerates public/illustrations/page-23/fg.webp from the portfolio portrait.
// Needs sharp (not a project dependency): npx -p sharp@0.34.4 node tools/engrave-portrait.mjs <portrait.png> out.png 230 110 840 1050 800
// then convert out.png to webp. Crop numbers frame the head and shoulders of portrait.webp (1254x1254).
// Turns a photo into a line engraving (Tenniel-style): wavy parallel lines whose
// width follows tone, cross-hatching in the darks, and fine contour lines.
// Usage: node engrave.mjs in.png out.png left top width height outWidth
import sharp from 'sharp';

const [, , inPath, outPath, L, T, CW, CH, OW] = process.argv;
const crop = { left: +L, top: +T, width: +CW, height: +CH };
const W = +OW;
const H = Math.round((W * crop.height) / crop.width);

const base = sharp(inPath).extract(crop).resize(W, H);
const rgb = await base.clone().removeAlpha().raw().toBuffer();
const gray = (sigma) =>
  base.clone().greyscale().blur(sigma).extractChannel(0).raw().toBuffer().then((b) => Float32Array.from(b, (v) => v / 255));
const [g05, g1, g25, g8] = await Promise.all([gray(0.5), gray(1.0), gray(2.4), gray(8)]);

const N = W * H;
const lum = new Float32Array(N);
const sat = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const r = rgb[i * 3] / 255, g = rgb[i * 3 + 1] / 255, b = rgb[i * 3 + 2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  sat[i] = mx === 0 ? 0 : (mx - mn) / mx;
}

// Background: grey, unsaturated, light, and connected to the border.
const bg = new Uint8Array(N);
const isBg = (i) => sat[i] < 0.12 && lum[i] > 0.52;
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, x + (H - 1) * W);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const i = stack.pop();
  if (bg[i] || !isBg(i)) continue;
  bg[i] = 1;
  const x = i % W, y = (i / W) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < W - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - W);
  if (y < H - 1) stack.push(i + W);
}
// Soften the cut-out edge.
const bgSoft = Float32Array.from(await sharp(Buffer.from(bg.map((v) => v * 255)), { raw: { width: W, height: H, channels: 1 } }).blur(2.5).toColourspace('b-w').extractChannel(0).raw().toBuffer(), (v) => v / 255);

const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const S = W / 125; // line spacing
const fx = W * 0.39, fy = H * 0.31; // face centre: lines curve around it
const sets = [
  // angle, from-tone, width factor, waviness
  { a: -0.42, from: 0.0, k: 0.36, wave: 1.0 },
  { a: 0.95, from: 0.5, k: 0.26, wave: 0.6 },
  { a: -1.35, from: 0.82, k: 0.2, wave: 0.4 },
];

const out = Buffer.alloc(N * 4);
const cx = W * 0.5, cy = H * 0.46;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    // Vignette: an oval that fades to paper, as in a vignetted plate.
    const ox = (x - cx) / (W * 0.56), oy = (y - cy) / (H * 0.6);
    const vig = (1 - smooth(0.72, 1.0, Math.sqrt(ox * ox + oy * oy))) * (1 - smooth(0.7, 1.0, y / H) * 0.85);
    const subject = 1 - bgSoft[i];

    // Tone with a little local contrast so features hold together.
    const l = g05[i] * 0.8 + (g05[i] - g8[i] + 0.5) * 0.2;
    let d = smooth(0.8, 0.12, l);
    d = d * vig * subject;

    let ink = 0;
    for (const s of sets) {
      if (d <= s.from) continue;
      const dd = (d - s.from) / (1 - s.from);
      const ca = Math.cos(s.a), sa = Math.sin(s.a);
      const v = x * ca + y * sa;
      // Lines bend with the large-scale form of the face, like an engraver following a cheek.
      const rx = (x - fx) / W, ry = (y - fy) / H;
      const bulge = Math.exp(-(rx * rx + ry * ry) * 9) * W * 0.05;
      let u = -x * sa + y * ca + s.wave * (2.5 * Math.sin(v * 0.022) + 22 * (g8[i] - 0.5) + bulge * Math.sign(-rx * sa + ry * ca));
      const dist = Math.abs(((u / S) % 1 + 1) % 1 - 0.5) * S;
      const half = dd * S * s.k;
      ink = Math.max(ink, smooth(half + 0.7, half - 0.7, dist));
    }

    // Contour lines from a difference of Gaussians.
    const dog = g25[i] - g1[i];
    const edge = smooth(0.012, 0.045, dog) * subject * vig;
    ink = Math.max(ink, edge);
    // Light ridges (strands of hair, the shine on an earring) are carved back out to paper.
    const ridge = smooth(0.006, 0.03, g1[i] - g25[i]);
    ink *= 1 - ridge * 0.85;

    out[i * 4] = 0x2b;
    out[i * 4 + 1] = 0x21;
    out[i * 4 + 2] = 0x18;
    out[i * 4 + 3] = Math.round(ink * 255);
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9, palette: false }).toFile(outPath);
console.log('wrote', outPath, W, 'x', H);
