import type { Act } from '../story';

/**
 * Simple generative music, made in the browser with the Web Audio API (no files):
 * a music box picks out a melody over a soft pad, each act in its own key and mode,
 * plus quiet sounds for page turns and little interactions.
 *
 * Browsers only allow sound after the visitor interacts, so nothing plays until the
 * first click, tap or key press. The visitor can turn it off; that choice is remembered.
 */

const KEY = 'rabbit-hole-music';

/** Scale degrees in semitones, and a root note (MIDI), for each act. */
const MODES: Record<Act, { root: number; scale: number[]; chords: number[][]; tempo: number }> = {
  // Dreamy, floating: Lydian, which never quite lands.
  'The Fall': { root: 62, scale: [0, 2, 4, 6, 7, 9, 11], chords: [[0, 4, 7, 11], [2, 6, 9], [-1, 4, 7], [0, 4, 9]], tempo: 84 },
  // Things the wrong size: whole tones, slightly unsettled.
  'Wrong Sizes': { root: 60, scale: [0, 2, 4, 6, 8, 10], chords: [[0, 4, 8], [2, 6, 10], [0, 6, 10], [4, 8, 12]], tempo: 92 },
  // The woods: minor pentatonic, a folk tune in the trees.
  'The Woods': { root: 64, scale: [0, 3, 5, 7, 10], chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 5, 7]], tempo: 76 },
  // The court: harmonic minor, a little grand and a little mad.
  'The Court and Home': { root: 62, scale: [0, 2, 3, 5, 7, 8, 11], chords: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-1, 2, 5, 8]], tempo: 88 },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class Music {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private reverb!: ConvolverNode;
  private padNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private timer = 0;
  private step = 0;
  private nextTime = 0;
  private act: Act = 'The Fall';
  private listeners = new Set<(on: boolean) => void>();
  private motif: number[] = [];
  enabled = true;

  constructor() {
    try {
      this.enabled = localStorage.getItem(KEY) !== 'off';
    } catch {
      /* storage unavailable: default to on */
    }
    // Start on the first real gesture (autoplay rules), if music is on.
    const unlock = (e: Event) => {
      // A press on the music button is handled by toggle() itself.
      if ((e.target as Element | null)?.closest?.('.ui-sound')) return;
      if (this.enabled) this.start();
      this.listeners.forEach((fn) => fn(this.enabled));
      removeEventListener('pointerdown', unlock);
      removeEventListener('keydown', unlock);
    };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (this.enabled) this.ctx.resume();
    });
  }

  onChange(fn: (on: boolean) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Sound is actually playing (enabled, and the browser has allowed it to start). */
  get playing() {
    return this.enabled && !!this.ctx && this.timer !== 0;
  }

  toggle() {
    // On, but not yet started (no interaction so far): the first press starts it.
    if (this.enabled && !this.playing) {
      this.start();
      this.listeners.forEach((fn) => fn(true));
      return;
    }
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(KEY, this.enabled ? 'on' : 'off');
    } catch {
      /* not remembered, which is fine */
    }
    if (this.enabled) this.start();
    else this.stop();
    this.listeners.forEach((fn) => fn(this.enabled));
  }

  setAct(act: Act) {
    if (act === this.act) return;
    this.act = act;
    this.motif = [];
    if (this.ctx && this.enabled) this.playPad();
  }

  // ---------- Sound effects (always gentle, and silent when music is off) ----------

  /** A page turning: a short brush of filtered noise. */
  turn() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise(ctx, 0.5);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(900, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(bp).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + 0.5);
  }

  /** A small bright note, for touches and discoveries. degree is a step in the act's scale. */
  chime(degree = 0, octave = 1) {
    const ctx = this.ready();
    if (!ctx) return;
    const m = MODES[this.act];
    this.bell(ctx, ctx.currentTime, this.note(m, degree) + 12 * octave, 0.11, 1.6, this.sfxBus);
  }

  /** A little falling run, for things dropped or falling. */
  fall() {
    const ctx = this.ready();
    if (!ctx) return;
    const m = MODES[this.act];
    for (let i = 0; i < 5; i++) this.bell(ctx, ctx.currentTime + i * 0.07, this.note(m, 8 - i * 2) + 12, 0.06, 0.9, this.sfxBus);
  }

  /** An old hinge: a low, stuttering creak. */
  creak(long = false) {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = long ? 0.9 : 0.45;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    // the stick-slip of a dry hinge: pitch stepping up and down in little jerks
    let f = 70 + Math.random() * 30;
    for (let s = 0; s < dur; s += 0.035) {
      f = Math.max(50, Math.min(190, f + (Math.random() - 0.35) * 26));
      osc.frequency.setValueAtTime(f, t + s);
    }
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.06);
    g.gain.setValueAtTime(0.05, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(bp).connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // ---------- Internals ----------

  private ready() {
    return this.enabled && this.ctx && this.ctx.state === 'running' ? this.ctx : null;
  }

  private start() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    ctx.resume();
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0.8, t, 0.6);
    this.playPad();
    if (!this.timer) {
      this.nextTime = ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 50);
    }
  }

  private stop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0, t, 0.25);
    clearInterval(this.timer);
    this.timer = 0;
  }

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    this.master.connect(comp).connect(ctx.destination);

    // A soft room: a convolver fed with decaying noise.
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.reverb.connect(wet).connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.55;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.7;
    this.sfxBus.connect(this.master);
    this.sfxBus.connect(this.reverb);
  }

  private note(m: (typeof MODES)[Act], degree: number) {
    const n = m.scale.length;
    const oct = Math.floor(degree / n);
    const idx = ((degree % n) + n) % n;
    return m.root + m.scale[idx] + 12 * oct;
  }

  /** A music-box tine: a sine with a quieter, faster-fading overtone. */
  private bell(ctx: AudioContext, t: number, note: number, vol: number, decay: number, out: AudioNode) {
    const f = midi(note);
    for (const [ratio, gain, d] of [
      [1, 1, decay],
      [2.01, 0.35, decay * 0.45],
      [4.2, 0.12, decay * 0.2],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * gain, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + d + 0.05);
    }
  }

  private playPad() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const p of this.padNodes) {
      p.gain.gain.setTargetAtTime(0, t, 0.8);
      p.osc.stop(t + 4);
    }
    this.padNodes = [];
    const m = MODES[this.act];
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(this.musicBus);
    for (const [i, deg] of m.chords[0].entries()) {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = midi(m.root - 12 + deg);
        osc.detune.value = detune + i;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(0.028, t, 1.5);
        osc.connect(gain).connect(lp);
        osc.start(t);
        this.padNodes.push({ osc, gain });
      }
    }
  }

  /** Look ahead and schedule notes slightly in the future, so timing never stutters. */
  private schedule() {
    const ctx = this.ctx!;
    const m = MODES[this.act];
    const beat = 60 / m.tempo / 2; // eighth notes
    while (this.nextTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(this.step / 8);
      const pos = this.step % 8;
      // Change the pad chord every two bars.
      if (pos === 0 && bar % 2 === 0) this.shiftPad(m, Math.floor(bar / 2) % m.chords.length);
      // A short motif, repeated with small changes, reads as a tune rather than noise.
      if (this.motif.length === 0 || (pos === 0 && bar % 4 === 0)) this.newMotif(m);
      const deg = this.motif[pos];
      if (deg !== null && deg !== undefined && !Number.isNaN(deg)) {
        const accent = pos === 0 ? 1.25 : 1;
        this.bell(ctx, this.nextTime, this.note(m, deg) + 12, 0.055 * accent, 1.8, this.musicBus);
      }
      this.nextTime += beat * (pos % 2 ? 0.92 : 1.08); // a little swing
      this.step++;
    }
  }

  private shiftPad(m: (typeof MODES)[Act], idx: number) {
    const ctx = this.ctx!;
    const chord = m.chords[idx];
    this.padNodes.forEach((p, i) => {
      const deg = chord[Math.floor(i / 2) % chord.length];
      p.osc.frequency.setTargetAtTime(midi(m.root - 12 + deg), ctx.currentTime, 0.4);
    });
  }

  private newMotif(m: (typeof MODES)[Act]) {
    const n = m.scale.length;
    let d = Math.floor(Math.random() * n);
    this.motif = Array.from({ length: 8 }, (_, i) => {
      if (i > 0 && Math.random() < 0.3) return NaN; // rests
      d += [-2, -1, 1, 1, 2, -1][Math.floor(Math.random() * 6)];
      d = Math.max(-1, Math.min(n + 3, d));
      return d;
    });
  }

  private noise(ctx: AudioContext, seconds: number) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export const music = new Music();
