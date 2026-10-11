import gsap from 'gsap';
import { stamp, escape } from '../print/escape';
import { curvy, wobble, handEllipse, ribbon, type Pt } from '../print/brush';
import type { Press, Tones } from '../print/press';

/**
 * Page 23: hover the designer's portrait and it bursts into a celebration: riso-printed
 * flowers of every kind (daisies, roses, tulips, forget-me-nots, star-flowers, poppies)
 * and paper confetti pop out from behind her, tumble past the edges of the book and drift
 * off into the room, while a gold glint twinkles in her eyes and a breeze lifts her hair.
 * While you stay, a few more keep coming; move away and the last of them float off.
 */

/** Her face, as an ellipse in percentages of the portrait: the wind leaves it still. */
const FACE = { x: 38, y: 34.5, rx: 16, ry: 20 };

/**
 * Hair blowing: the portrait is redrawn on a canvas in thin horizontal strips, each pushed
 * sideways by a gusting wave that grows toward the ends of her hair, while her face is drawn
 * back over it, still. (A canvas, because SVG filters don't render inside the book's 3D pages.)
 * Returns a stop function.
 */
function blowHair(target: HTMLElement, reduced: boolean) {
  const img = target.querySelector<HTMLImageElement>('img.illus__layer');
  if (!img || reduced || !img.naturalWidth) return () => {};
  const box = img.getBoundingClientRect();
  const local = img.offsetWidth ? { w: img.offsetWidth, h: img.offsetHeight } : { w: box.width, h: box.height };
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const cv = document.createElement('canvas');
  cv.className = 'illus__layer illus__wind';
  cv.width = Math.round(local.w * dpr);
  cv.height = Math.round(local.h * dpr);
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);
  // where the image sits in its box (object-fit: contain)
  const k = Math.min(local.w / img.naturalWidth, local.h / img.naturalHeight);
  const dw = img.naturalWidth * k;
  const dh = img.naturalHeight * k;
  const ox = (local.w - dw) / 2;
  const oy = (local.h - dh) / 2;
  // her face, from the original, with soft edges: drawn back over the blowing hair
  const face = document.createElement('canvas');
  face.width = cv.width;
  face.height = cv.height;
  const fg = face.getContext('2d')!;
  fg.scale(dpr, dpr);
  fg.drawImage(img, ox, oy, dw, dh);
  const fx = ox + (FACE.x / 100) * dw;
  const fy = oy + (FACE.y / 100) * dh;
  fg.globalCompositeOperation = 'destination-in';
  fg.save();
  fg.translate(fx, fy);
  fg.scale(1, FACE.ry / FACE.rx);
  const rr = (FACE.rx / 100) * dw;
  const mask = fg.createRadialGradient(0, 0, 0, 0, 0, rr);
  mask.addColorStop(0.7, '#000');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  fg.fillStyle = mask;
  fg.fillRect(-rr, -rr, rr * 2, rr * 2);
  fg.restore();

  img.after(cv);
  img.style.opacity = '0';
  const strength = { k: 0 };
  gsap.to(strength, { k: 1, duration: 0.8, ease: 'sine.out' });
  let raf = 0;
  const t0 = performance.now();
  const STRIP = 2;
  const tick = (now: number) => {
    const t = (now - t0) / 1000;
    g.clearRect(0, 0, local.w, local.h);
    const gust = strength.k * (0.75 + Math.sin(t * 0.8) * 0.25);
    for (let y = 0; y < dh; y += STRIP) {
      const v = y / dh;
      // still at the crown, freer toward the ends
      const weight = Math.min(1, Math.max(0, (v - 0.12) / 0.6));
      const dx = gust * weight * dw * (0.03 * Math.sin(y * 0.03 - t * 3.1) + 0.011 * Math.sin(y * 0.11 - t * 5.3) + 0.014);
      g.drawImage(img, 0, (y / dh) * img.naturalHeight, img.naturalWidth, (STRIP / dh) * img.naturalHeight + 1, ox + dx, oy + y, dw, STRIP + 0.5);
    }
    g.drawImage(face, 0, 0, local.w, local.h);
    cv.style.transform = img.style.transform;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    gsap.to(strength, {
      k: 0,
      duration: 0.5,
      ease: 'sine.in',
      onComplete: () => {
        cancelAnimationFrame(raf);
        cv.remove();
        img.style.opacity = '';
      },
    });
  };
}

/** Her eyes, as fractions of the portrait image. */
const EYES: [number, number][] = [
  [0.3, 0.285],
  [0.46, 0.275],
];

const PINK: Tones = { b: 0.9 };
const ROSE: Tones = { b: 1, c: 0.25 };
const GOLD: Tones = { c: 1, b: 0.2 };
const BLUE: Tones = { a: 0.85 };
const LILAC: Tones = { a: 0.45, b: 0.5 };
const LINE: Tones = { a: 1, b: 0.8 };

/** n petals round the centre, each a hand-drawn ellipse. */
function petals(p: Press, c: number, n: number, dist: number, rx: number, ry: number, tones: Tones, seed: number, turn = 0) {
  const path = new Path2D();
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + turn;
    curvy(handEllipse(c + Math.cos(a) * dist, c + Math.sin(a) * dist, rx, ry, seed + k, rx * 0.06, a), path);
  }
  p.fill(path, tones);
}

const FLOWERS: ((p: Press, S: number) => void)[] = [
  // daisy: many slim petals, gold heart
  (p, S) => {
    const c = S / 2;
    petals(p, c, 14, S * 0.24, S * 0.15, S * 0.045, PINK, 10);
    const heart = curvy(handEllipse(c, c, S * 0.12, S * 0.12, 3, 0.5));
    p.knock(heart);
    p.fill(heart, GOLD);
  },
  // rose: a spiral of petals
  (p, S) => {
    const c = S / 2;
    p.fill(curvy(handEllipse(c, c, S * 0.36, S * 0.33, 20, 2)), ROSE);
    const spiral: Pt[] = [];
    for (let k = 0; k < 40; k++) {
      const a = k * 0.42;
      const r = S * 0.3 * (1 - k / 44);
      spiral.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
    }
    p.fill(ribbon(spiral, { w: 2.4, taper: 0.4, amt: 0.6, seed: 21 }), LINE, { over: true });
  },
  // tulip: a cup of three petals on a short stem
  (p, S) => {
    const c = S / 2;
    p.fill(ribbon([[c, c + S * 0.1], [c - 2, c + S * 0.45]], { w: 4, taper: 0.3, amt: 0.5, seed: 30 }), { a: 0.7, c: 1 });
    const cup: Pt[] = [[c - S * 0.24, c - S * 0.28], [c - S * 0.1, c - S * 0.12], [c, c - S * 0.32], [c + S * 0.1, c - S * 0.12], [c + S * 0.24, c - S * 0.28], [c + S * 0.22, c + S * 0.02], [c, c + S * 0.14], [c - S * 0.22, c + S * 0.02]];
    p.fill(curvy(wobble(cup, true, 1, 31, 4)), { c: 0.95, b: 0.55 });
    p.fill(ribbon(cup, { closed: true, w: 1.6, rough: 0.4, amt: 0.6, seed: 32 }), LINE, { over: true });
  },
  // forget-me-not: five round blue petals
  (p, S) => {
    const c = S / 2;
    petals(p, c, 5, S * 0.18, S * 0.15, S * 0.15, BLUE, 40);
    const heart = curvy(handEllipse(c, c, S * 0.08, S * 0.08, 45, 0.3));
    p.knock(heart);
    p.fill(heart, GOLD);
  },
  // star-flower: pointed lilac petals
  (p, S) => {
    const c = S / 2;
    const pts: Pt[] = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const r = k % 2 ? S * 0.14 : S * 0.42;
      pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
    }
    p.fill(curvy(wobble(pts, true, 0.8, 50, 4)), LILAC);
    p.fill(curvy(handEllipse(c, c, S * 0.1, S * 0.1, 51, 0.4)), { b: 1, c: 0.6 });
  },
  // poppy: four broad petals, a dark heart
  (p, S) => {
    const c = S / 2;
    petals(p, c, 4, S * 0.17, S * 0.22, S * 0.19, { b: 1, c: 0.7 }, 60, 0.4);
    p.fill(curvy(handEllipse(c, c, S * 0.09, S * 0.09, 64, 0.4)), { a: 1, b: 0.9, c: 0.5 });
  },
];

const flowerStamp = (v: number) => stamp(`flower${v % FLOWERS.length}`, (p, S) => FLOWERS[v % FLOWERS.length](p, S), 2.6);

/** Paper confetti: little squares, strips and curls, in each ink. */
const confettiStamp = (v: number) =>
  stamp(
    `confetti${v % 9}`,
    (p, S) => {
      const c = S / 2;
      const tones: Tones = [{ b: 1 }, { c: 1 }, { a: 0.9 }][v % 3];
      const kind = Math.floor(v / 3) % 3;
      if (kind === 0) p.fill(curvy(wobble([[c - 16, c - 12], [c + 16, c - 14], [c + 14, c + 12], [c - 14, c + 14]], true, 1, v, 4)), tones);
      else if (kind === 1) p.fill(ribbon([[c - 30, c], [c + 30, c - 3]], { w: 9, taper: 0.05, amt: 0.6, seed: v }), tones);
      else {
        const curl: Pt[] = [];
        for (let k = 0; k <= 16; k++) curl.push([c - 34 + k * 4.2, c + Math.sin(k * 0.8) * 10]);
        p.fill(ribbon(curl, { w: 5, taper: 0.1, amt: 0.3, seed: v }), tones);
      }
    },
    2.6,
  );

const glintStamp = () =>
  stamp('bloom-glint', (p, S) => {
    const c = S / 2;
    const pts: Pt[] = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      const r = k % 2 ? S * 0.08 : S * 0.42;
      pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
    }
    p.fill(curvy(wobble(pts, true, 0.5, 3, 4)), { c: 1 });
  });

/** Where the visible image sits inside its element (object-fit: contain). */
function imageRect(img: HTMLImageElement) {
  const r = img.getBoundingClientRect();
  const iw = img.naturalWidth || 800;
  const ih = img.naturalHeight || 1000;
  const k = Math.min(r.width / iw, r.height / ih);
  const w = iw * k;
  const h = ih * k;
  return { x: r.left + (r.width - w) / 2, y: r.top + (r.height - h) / 2, w, h };
}

export function portraitBloom(target: HTMLElement, reduced: () => boolean) {
  let layer: HTMLElement | null = null;
  let stream: number | null = null;
  let open = false;
  let calm = () => {};
  let n = 0;

  /** Pop one flower or bit of confetti out from behind her, flying outward. */
  const pop = (box: ReturnType<typeof imageRect>, big: boolean) => {
    const cx = box.x + box.w * 0.42;
    const cy = box.y + box.h * 0.45;
    // from a point round her outline, heading away from her
    const a = Math.random() * Math.PI * 2;
    const x = cx + Math.cos(a) * box.w * 0.42;
    const y = cy + Math.sin(a) * box.h * 0.4;
    const sp = (big ? 260 : 160) + Math.random() * 260;
    const flower = n++ % 3 !== 2;
    escape.launch(flower ? flowerStamp(Math.floor(Math.random() * 60)) : confettiStamp(Math.floor(Math.random() * 90)), x, y, {
      size: flower ? 26 + Math.random() * 26 : 14 + Math.random() * 10,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      ay: flower ? 70 : 140,
      flutter: flower ? 20 : 70,
      vr: (Math.random() - 0.5) * (flower ? 3 : 9),
      drag: 0.7,
      fade: 0.28,
      vs: flower ? 0.05 : 0,
    });
  };

  const grow = () => {
    if (open) return;
    open = true;
    const img = target.querySelector<HTMLImageElement>('img');
    if (!img) return;
    const box = imageRect(img);
    calm = blowHair(target, reduced());
    // Gold glints in her eyes.
    layer?.remove();
    const l = document.createElement('div');
    l.className = 'bloom';
    l.setAttribute('aria-hidden', 'true');
    const size = Math.max(14, box.w * 0.07);
    const cv = glintStamp();
    const glints = EYES.map(([ex, ey]) => {
      const g = document.createElement('img');
      if (cv) g.src = cv.toDataURL();
      g.alt = '';
      g.className = 'bloom__sprite bloom__glint';
      Object.assign(g.style, { left: `${box.x + ex * box.w - size / 2}px`, top: `${box.y + ey * box.h - size / 2}px`, width: `${size}px`, height: `${size}px` });
      l.append(g);
      return g;
    });
    document.body.append(l);
    layer = l;
    if (reduced()) return;
    gsap.fromTo(glints, { scale: 0, rotation: -45 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(3)', stagger: 0.08 });
    gsap.to(glints, { scale: 0.6, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.6 });
    // The burst, then a gentle stream for as long as you stay.
    for (let i = 0; i < 26; i++) pop(box, true);
    stream = window.setInterval(() => {
      pop(box, false);
      pop(box, false);
    }, 260);
  };

  const wither = () => {
    if (!open) return;
    open = false;
    calm();
    calm = () => {};
    if (stream) clearInterval(stream);
    stream = null;
    const l = layer;
    layer = null;
    if (!l) return;
    gsap.killTweensOf(l.children);
    gsap.to(l.children, { scale: 0, opacity: 0, duration: 0.35, onComplete: () => l.remove() });
  };

  const onEnter = (e: PointerEvent) => e.pointerType === 'mouse' && grow();
  const onLeave = (e: PointerEvent) => e.pointerType === 'mouse' && wither();
  // Touch: a tap toggles it.
  const onTap = (e: PointerEvent) => e.pointerType !== 'mouse' && (open ? wither() : grow());
  target.addEventListener('pointerenter', onEnter);
  target.addEventListener('pointerleave', onLeave);
  target.addEventListener('pointerup', onTap);

  /** Clear it away at once (when the page turns). */
  const reset = () => {
    calm();
    calm = () => {};
    if (stream) clearInterval(stream);
    stream = null;
    layer?.remove();
    layer = null;
    open = false;
  };
  return {
    reset,
    destroy() {
      reset();
      target.removeEventListener('pointerenter', onEnter);
      target.removeEventListener('pointerleave', onLeave);
      target.removeEventListener('pointerup', onTap);
    },
  };
}
