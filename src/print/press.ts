/**
 * A riso press for live scenes. Adapted from the riso style of the "animate" skill
 * (github.com/cth9191/animate, MIT): a picture is drawn as three grey plates, one per ink;
 * printing screens each plate into halftone dots at its own angle, overprints the inks
 * (they multiply, like real ink), nudges the plates off register and lets a few dots drop out.
 *
 * Differences for the web: the print pass is a WebGL shader, so scenes can animate; and
 * the paper is the page itself. Wherever no ink lands the output is transparent, so an
 * illustration prints straight onto the book's parchment, with no box around it.
 *
 * Drawing is in CSS pixels. Plates hold tone 0 (no ink) to 1 (solid) as grey.
 */

export type Ink = 'a' | 'b' | 'c';
export type Tone = number | ((g: CanvasRenderingContext2D) => CanvasGradient);
export type Tones = Partial<Record<Ink, Tone>>;

export interface InkSet {
  a: [number, number, number];
  b: [number, number, number];
  c: [number, number, number];
}

/** The page's parchment, which plays the paper. */
export const PAPER: [number, number, number] = [239, 228, 201];

/** Act 1's inks: cobalt, fluorescent pink, yellow. Blue and yellow overprint to green; all three to a deep violet-black. */
export const INKS_FALL: InkSet = { a: [38, 72, 196], b: [234, 74, 150], c: [246, 214, 44] };

const INK_NAMES: Ink[] = ['a', 'b', 'c'];
/** Screen angles, as on a real press. */
const ANGLE: Record<Ink, number> = { a: 15, b: 75, c: 45 };
/** Plates off register against the key (a), in CSS px. */
const REG: Record<Ink, [number, number]> = { a: [0, 0], b: [2.2, -1.6], c: [-1.6, 2.2] };

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 uv;
uniform sampler2D ta, tb, tc;
uniform vec2 res;        // device px
uniform float pitch;     // device px per screen cell
uniform vec2 offB, offC; // registration, in uv
uniform vec3 absA, absB, absC, paper;
uniform float boil;
uniform vec3 ang;        // radians for a, b, c

float screen(float tone, vec2 px, float a) {
  if (tone < 0.035) return 0.0;
  if (tone > 0.97) return 1.0;
  float c = cos(a), s = sin(a);
  vec2 q = vec2(c * px.x + s * px.y, -s * px.x + c * px.y) / pitch;
  vec2 f = fract(q) - 0.5;
  // Up to half: a round dot; past half: solid with round paper holes at the cell corners.
  if (tone <= 0.5) {
    float r = sqrt(tone / 3.14159);
    return clamp((r - length(f)) * pitch + 0.5, 0.0, 1.0);
  }
  vec2 g = 0.5 - abs(f);
  float r = sqrt((1.0 - tone) / 3.14159);
  return clamp((length(g) - r) * pitch + 0.5, 0.0, 1.0);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 px = uv * res;
  float t0 = texture2D(ta, uv).r;
  float t1 = texture2D(tb, uv - offB).r;
  float t2 = texture2D(tc, uv - offC).r;
  // Wear: a few specks where one plate failed to print.
  float h = hash(floor(px / 1.6) + boil * 17.0);
  float k0 = h < 0.0025 ? 0.0 : screen(t0, px, ang.x);
  float k1 = (h > 0.0025 && h < 0.005) ? 0.0 : screen(t1, px, ang.y);
  float k2 = (h > 0.005 && h < 0.0075) ? 0.0 : screen(t2, px, ang.z);
  vec3 col = paper * (1.0 - k0 * absA) * (1.0 - k1 * absB) * (1.0 - k2 * absC);
  // Ink only: express the print as colour + alpha over paper, so the page shows through where there is no ink.
  vec3 dark = 1.0 - col / paper;
  float A = max(max(dark.r, dark.g), dark.b);
  if (A < 0.004) { gl_FragColor = vec4(0.0); return; }
  vec3 C = paper - (paper - col) / A;
  gl_FragColor = vec4(C * A, A);
}`;

interface Plate {
  c: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
}

export class Press {
  readonly canvas: HTMLCanvasElement;
  w = 0;
  h = 0;
  private scale = 1;
  private clearMask: HTMLCanvasElement | null = null;
  private washCanvas: HTMLCanvasElement | null = null;
  private clearKey = '';
  private plates: Record<Ink, Plate>;
  private gl: WebGLRenderingContext | null;
  private prog: WebGLProgram | null = null;
  private tex: Record<Ink, WebGLTexture | null> = { a: null, b: null, c: null };
  private u: Record<string, WebGLUniformLocation | null> = {};
  /** Device px per screen cell is pitch × scale. */
  pitch = 4.2;

  constructor(private inks: InkSet = INKS_FALL) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'press';
    const mk = (): Plate => {
      const c = document.createElement('canvas');
      return { c, g: c.getContext('2d', { willReadFrequently: false })! };
    };
    this.plates = { a: mk(), b: mk(), c: mk() };
    this.gl = this.canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (this.gl) this.setupGL(this.gl);
  }

  /** WebGL unavailable: the scene should fall back to a still. */
  get ok() {
    return !!this.gl && !!this.prog && !this.gl.isContextLost();
  }

  /**
   * Give the WebGL context back. Browsers only keep ~16 alive at once and silently drop the
   * oldest beyond that, so every press that is put away must release its own.
   */
  dispose() {
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
    this.prog = null;
  }

  resize(w: number, h: number, dpr = Math.min(devicePixelRatio || 1, 1.5)) {
    this.w = w;
    this.h = h;
    this.scale = dpr;
    const W = Math.max(1, Math.round(w * dpr));
    const H = Math.max(1, Math.round(h * dpr));
    this.canvas.width = W;
    this.canvas.height = H;
    for (const n of INK_NAMES) {
      this.plates[n].c.width = W;
      this.plates[n].c.height = H;
    }
  }

  /** Fresh plates. */
  begin() {
    for (const n of INK_NAMES) {
      const g = this.plates[n].g;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.fillStyle = '#000';
      g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    }
  }

  /** Run fn with the same transform applied to every plate (for moving figures). */
  with(tx: { x: number; y: number; rot?: number; s?: number; sx?: number }, fn: () => void) {
    for (const n of INK_NAMES) {
      const g = this.plates[n].g;
      g.save();
      g.translate(tx.x, tx.y);
      if (tx.rot) g.rotate(tx.rot);
      const s = tx.s ?? 1;
      if (s !== 1 || (tx.sx ?? 1) !== 1) g.scale(s * (tx.sx ?? 1), s);
    }
    fn();
    for (const n of INK_NAMES) this.plates[n].g.restore();
  }

  /**
   * Fill a shape. By default a knockout: listed inks get their tone, the others go to
   * paper inside the shape (what a printed fill does). over: only raise the listed inks.
   */
  fill(path: Path2D, tones: Tones, o: { over?: boolean; alpha?: number } = {}) {
    for (const n of INK_NAMES) {
      const t = tones[n];
      if (o.over && t == null) continue;
      const g = this.plates[n].g;
      g.globalCompositeOperation = o.over ? 'lighten' : 'source-over';
      g.globalAlpha = o.alpha ?? 1;
      g.fillStyle = t == null ? '#000' : typeof t === 'function' ? t(g) : grey(t);
      g.fill(path);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * Fill a shape, but only where a raster mask is opaque: used for hand-colouring a figure,
   * so the washes stay inside its outline instead of printing as boxes round it. The mask
   * (an alpha canvas) is drawn at (x, y, w, h) in the current coordinates. Raises inks only.
   */
  fillWithin(path: Path2D, tones: Tones, mask: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
    for (const n of INK_NAMES) {
      const t = tones[n];
      if (t == null) continue;
      const g = this.plates[n].g;
      const tmp = (this.washCanvas ??= document.createElement('canvas'));
      if (tmp.width !== g.canvas.width || tmp.height !== g.canvas.height) {
        tmp.width = g.canvas.width;
        tmp.height = g.canvas.height;
      }
      const tg = tmp.getContext('2d')!;
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.globalCompositeOperation = 'source-over';
      tg.clearRect(0, 0, tmp.width, tmp.height);
      tg.setTransform(g.getTransform());
      tg.fillStyle = typeof t === 'function' ? t(tg) : grey(t);
      tg.fill(path);
      tg.globalCompositeOperation = 'destination-in';
      tg.drawImage(mask, x, y, w, h);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'lighten';
      g.drawImage(tmp, 0, 0);
      g.restore();
    }
  }

  /** Print only inside `path` while fn() runs (on every plate). */
  clip(path: Path2D, fn: () => void, rule: CanvasFillRule = 'nonzero') {
    for (const n of INK_NAMES) {
      this.plates[n].g.save();
      this.plates[n].g.clip(path, rule);
    }
    try {
      fn();
    } finally {
      for (const n of INK_NAMES) this.plates[n].g.restore();
    }
  }

  /** Knock a shape back to paper on every plate. */
  knock(path: Path2D) {
    this.fill(path, {});
  }

  /**
   * Print a figure (see tools/figure.mjs): its shape knocks to paper, then its ink is
   * printed in the given inks. Pass the prepared canvases from prepareFigure().
   */
  figure(f: Figure, x: number, y: number, height: number, inkTones: Tones, o: { knock?: boolean; fade?: number } = {}) {
    const w = (f.w / f.h) * height;
    // fade < 1 prints the figure part way: its paper and its lines both only partly there.
    const fade = Math.max(0, Math.min(1, o.fade ?? 1));
    if (fade <= 0) return { w, h: height };
    for (const n of INK_NAMES) {
      const g = this.plates[n].g;
      if (o.knock !== false) {
        g.globalCompositeOperation = 'multiply';
        g.globalAlpha = fade;
        g.drawImage(f.paper, x, y, w, height);
        g.globalAlpha = 1;
      }
      const t = inkTones[n];
      if (typeof t === 'number' && t > 0) {
        g.globalCompositeOperation = 'lighten';
        g.globalAlpha = t * fade;
        g.drawImage(f.ink, x, y, w, height);
        g.globalAlpha = 1;
      }
      g.globalCompositeOperation = 'source-over';
    }
    return { w, h: height };
  }

  /** Print a figure's whole shape as a solid in the given inks (a silhouette), offset if wanted. */
  silhouette(f: Figure, x: number, y: number, height: number, tones: Tones) {
    const w = (f.w / f.h) * height;
    for (const n of INK_NAMES) {
      const t = tones[n];
      if (typeof t !== 'number' || t <= 0) continue;
      const g = this.plates[n].g;
      g.globalCompositeOperation = 'lighten';
      g.globalAlpha = t;
      g.drawImage(f.shape, x, y, w, height);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }

  /** Knock type out of every plate (the letters become bare paper). */
  knockText(str: string, x: number, y: number, font: string, align: CanvasTextAlign = 'center') {
    for (const n of INK_NAMES) {
      const g = this.plates[n].g;
      g.font = font;
      g.textAlign = align;
      g.textBaseline = 'middle';
      g.fillStyle = '#000';
      g.fillText(str, x, y);
    }
  }

  /** Printed type: solid ink (so it stays crisp), misregistered like everything else. */
  text(str: string, x: number, y: number, font: string, tones: Tones, align: CanvasTextAlign = 'center', knock = false) {
    for (const n of INK_NAMES) {
      const t = tones[n];
      if (typeof t !== 'number') continue;
      const g = this.plates[n].g;
      g.font = font;
      g.textAlign = align;
      g.textBaseline = 'middle';
      // knock: set the listed plates to exactly this tone under the letters (0 clears an ink)
      g.globalCompositeOperation = knock ? 'source-over' : 'lighten';
      g.fillStyle = grey(t);
      g.fillText(str, x, y);
      g.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * Quiet the picture under the copy: ink thins toward a soft-edged clearing, so the
   * words sit on near-paper, the way a picture book leaves room for its text.
   */
  clearing(r: { x: number; y: number; w: number; h: number }, strength = 0.92) {
    if (r.w <= 0 || r.h <= 0) return;
    // One smooth, blurred fade (no visible steps), made once per size and reused.
    const key = `${this.w}x${this.h}:${r.x},${r.y},${r.w},${r.h}:${strength}`;
    if (this.clearKey !== key) {
      this.clearKey = key;
      const k = 0.25; // the mask is small: it is only a soft gradient
      const c = (this.clearMask ??= document.createElement('canvas'));
      c.width = Math.max(1, Math.round(this.w * k));
      c.height = Math.max(1, Math.round(this.h * k));
      const g = c.getContext('2d')!;
      g.setTransform(k, 0, 0, k, 0, 0);
      g.filter = 'none';
      g.fillStyle = '#fff';
      g.fillRect(0, 0, this.w, this.h);
      const soft = Math.min(r.w, r.h) * 0.32;
      const v = Math.round(255 * (1 - strength));
      g.fillStyle = `rgb(${v},${v},${v})`;
      // Canvas filters ignore the transform, so the blur is given in mask pixels.
      g.filter = `blur(${(soft * k).toFixed(1)}px)`;
      g.beginPath();
      g.roundRect(r.x - soft * 0.35, r.y - soft * 0.35, r.w + soft * 0.7, r.h + soft * 0.7, soft);
      g.fill();
      g.filter = 'none';
    }
    const mask = this.clearMask!;
    this.vignette((g) => {
      g.imageSmoothingEnabled = true;
      g.drawImage(mask, 0, 0, this.w, this.h);
    });
  }

  /** Fade every plate toward nothing outside a soft shape: dots shrink to paper at the edges. */
  vignette(paint: (g: CanvasRenderingContext2D) => void) {
    for (const n of INK_NAMES) {
      const g = this.plates[n].g;
      g.save();
      g.globalCompositeOperation = 'multiply';
      paint(g);
      g.restore();
    }
  }

  /** Screen, overprint and show. boil varies registration and wear a few times a second. */
  print(boil = 0) {
    const gl = this.gl;
    if (!gl || !this.prog) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    INK_NAMES.forEach((n, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.tex[n]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.plates[n].c);
    });
    const v = boil % 3;
    const jx = [0, 0.3, -0.25][v];
    const jy = [0, -0.2, 0.3][v];
    const W = this.canvas.width;
    const H = this.canvas.height;
    // uv y runs up; plate y runs down, so flip the vertical offset.
    gl.uniform2f(this.u.offB, ((REG.b[0] + jx) * this.scale) / W, (-(REG.b[1] + jy) * this.scale) / H);
    gl.uniform2f(this.u.offC, ((REG.c[0] - jy) * this.scale) / W, (-(REG.c[1] + jx) * this.scale) / H);
    gl.uniform2f(this.u.res, W, H);
    gl.uniform1f(this.u.pitch, this.pitch * this.scale);
    gl.uniform1f(this.u.boil, v);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Direct access to one plate, for special effects. */
  plate(n: Ink) {
    return this.plates[n].g;
  }

  private setupGL(gl: WebGLRenderingContext) {
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    this.prog = prog;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    for (const name of ['ta', 'tb', 'tc', 'res', 'pitch', 'offB', 'offC', 'absA', 'absB', 'absC', 'paper', 'boil', 'ang']) {
      this.u[name] = gl.getUniformLocation(prog, name);
    }
    INK_NAMES.forEach((n, i) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.tex[n] = t;
    });
    gl.uniform1i(this.u.ta, 0);
    gl.uniform1i(this.u.tb, 1);
    gl.uniform1i(this.u.tc, 2);
    const p = PAPER.map((v) => v / 255);
    const absorb = (ink: [number, number, number]) => ink.map((v, i) => Math.max(0, 1 - v / PAPER[i]));
    gl.uniform3fv(this.u.paper, p);
    gl.uniform3fv(this.u.absA, absorb(this.inks.a));
    gl.uniform3fv(this.u.absB, absorb(this.inks.b));
    gl.uniform3fv(this.u.absC, absorb(this.inks.c));
    gl.uniform3f(this.u.ang, (ANGLE.a * Math.PI) / 180, (ANGLE.b * Math.PI) / 180, (ANGLE.c * Math.PI) / 180);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
}

export const grey = (v: number) => {
  const u = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgb(${u},${u},${u})`;
};

/** A figure from tools/figure.mjs, split into the two images the press needs. */
export interface Figure {
  w: number;
  h: number;
  /** Grey: white outside the figure, black inside (multiplied into plates to knock to paper). */
  paper: HTMLCanvasElement;
  /** Grey: the line work as tone (lightened into plates). */
  ink: HTMLCanvasElement;
  /** Grey: white inside the figure (for printing it as a solid silhouette). */
  shape: HTMLCanvasElement;
}

const figures = new Map<string, Promise<Figure>>();
export function loadFigure(src: string): Promise<Figure> {
  let p = figures.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const read = document.createElement('canvas');
        read.width = w;
        read.height = h;
        const rg = read.getContext('2d', { willReadFrequently: true })!;
        rg.drawImage(img, 0, 0);
        const d = rg.getImageData(0, 0, w, h);
        const mk = () => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          return c;
        };
        const paper = mk();
        const ink = mk();
        const shape = mk();
        const pd = new ImageData(w, h);
        const id = new ImageData(w, h);
        const sd = new ImageData(w, h);
        for (let i = 0; i < w * h; i++) {
          const inkV = d.data[i * 4];
          const s = d.data[i * 4 + 1];
          pd.data[i * 4] = pd.data[i * 4 + 1] = pd.data[i * 4 + 2] = 255 - s;
          id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = inkV;
          sd.data[i * 4] = sd.data[i * 4 + 1] = sd.data[i * 4 + 2] = s;
          pd.data[i * 4 + 3] = id.data[i * 4 + 3] = sd.data[i * 4 + 3] = 255;
        }
        paper.getContext('2d')!.putImageData(pd, 0, 0);
        ink.getContext('2d')!.putImageData(id, 0, 0);
        shape.getContext('2d')!.putImageData(sd, 0, 0);
        resolve({ w, h, paper, ink, shape });
      };
      img.onerror = reject;
      img.src = src;
    });
    figures.set(src, p);
  }
  return p;
}
