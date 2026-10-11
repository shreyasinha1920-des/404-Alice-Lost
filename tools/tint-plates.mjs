// Hand-tints Tenniel's engravings the way Victorian colourists did: the ink stays
// as it was engraved, and loose watercolour washes go underneath, bleeding a little
// past the lines. Paper stays white; pages multiply it into the parchment.
//
// Usage (sharp is not a project dependency; run from any folder where it is installed):
//   node <project>/tools/tint-plates.mjs <project>/tools/tenniel <project>/public/illustrations [plate ids...]
// Source plates are in tools/tenniel (see SOURCE.md); from Wikimedia Commons, public domain.
// Wash shapes for each plate live in tools/plates.json, in the plate's own pixel coordinates.

import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sharp = createRequire(join(process.cwd(), '/'))('sharp');
const here = dirname(fileURLToPath(import.meta.url));
const plates = JSON.parse(readFileSync(join(here, 'plates.json'), 'utf8'));

const [, , srcDir, outDir, ...only] = process.argv;
const INK = [0x2b, 0x21, 0x18];

const shapeSvg = (s) => {
  const common = `fill="${s.color}" fill-opacity="${s.opacity ?? 0.55}"`;
  if (s.ellipse) {
    const [cx, cy, rx, ry, rot = 0] = s.ellipse;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" ${common}/>`;
  }
  return `<polygon points="${s.points.map((p) => p.join(',')).join(' ')}" ${common}/>`;
};

for (const plate of plates) {
  if (only.length && !only.includes(plate.id)) continue;
  const src = join(srcDir, `plate-${plate.id}.png`);
  const meta = await sharp(src).metadata();
  const w = meta.width, h = meta.height;
  const scale = plate.scale ?? 1;
  const W = Math.round(w * scale), H = Math.round(h * scale);

  // Ink: darkness becomes opacity, in warm sepia rather than black.
  const grey = await sharp(src).flatten({ background: '#fff' }).greyscale().resize(W, H, { kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6 }).extractChannel(0).raw().toBuffer();

  // Washes: soft shapes, blurred and bled with noise so the edges wander like watercolour.
  const blur = Math.max(4, Math.round(Math.min(w, h) * 0.012));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <filter id="bleed" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="${plate.seed ?? 4}" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="${blur * 3}" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feGaussianBlur in="d" stdDeviation="${blur}" result="b"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="m"/>
        <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.25" result="mottle"/>
        <feComposite in="b" in2="mottle" operator="in"/>
      </filter>
    </defs>
    <g filter="url(#bleed)">${plate.washes.map(shapeSvg).join('')}</g>
  </svg>`;
  const wash = await sharp(Buffer.from(svg)).resize(W, H).ensureAlpha().raw().toBuffer();

  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const g = grey[i] / 255;
    // Levels: clean paper to nothing, keep fine hatching crisp.
    const t = Math.min(1, Math.max(0, (0.92 - g) / 0.7));
    const ink = t * t * (3 - 2 * t);
    const wa = wash[i * 4 + 3] / 255;
    const a = ink + wa * (1 - ink);
    for (let c = 0; c < 3; c++) {
      const v = a ? (INK[c] * ink + wash[i * 4 + c] * wa * (1 - ink)) / a : 0;
      out[i * 4 + c] = Math.round(v);
    }
    out[i * 4 + 3] = Math.round(a * 255);
  }

  for (const target of plate.out) {
    const file = join(outDir, target);
    mkdirSync(dirname(file), { recursive: true });
    // Flattened on white: the page shows it with mix-blend-mode: multiply, so white vanishes
    // into the parchment. No alpha channel keeps the file a fraction of the size.
    await sharp(out, { raw: { width: W, height: H, channels: 4 } }).flatten({ background: "#ffffff" }).webp({ quality: 80, effort: 6 }).toFile(file);
    console.log('wrote', file, `${W}x${H}`);
  }
}
