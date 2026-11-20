import type { AnalysisResult, DerivedAnalysis } from '@/types/analysis';
import { deriveAnalysis } from '@/lib/analysis';
import { isLand, loadLandMask, type LandMask } from '@/lib/geo';
import { buildSprites, PALETTE, STAGE_TINT } from './palette';
import { Painter, type Camera } from './painter';
import { buildSceneData, type SceneData } from './sceneData';
import { drawExposure } from './scenes/exposure';
import { drawExtraction } from './scenes/extraction';
import { drawHomograph } from './scenes/homograph';
import { drawEnrichment } from './scenes/enrichment';
import { drawDecision } from './scenes/decision';
import type { PickTarget, SceneContext } from './scenes/types';

export const STAGE_COUNT = 5;

export interface EngineOptions {
  analysis: AnalysisResult;
  /** Particle count. 800–4200; 2600 is the design default. */
  particleCount?: number;
  /** Motion-trail length, 0–1. */
  trailLength?: number;
  bloom?: boolean;
  autoOrbit?: boolean;
  /** Called ~11×/s with the smoothed stage position — drive DOM HUD from this. */
  onProgress?: (af: number) => void;
  /** Called when the user clicks a glyph (stage 03) or intel node (stage 04). */
  onPick?: (pick: { charIndex?: number; nodeId?: string }) => void;
}

interface Pulse {
  t: number;
}

/**
 * Software 3D renderer for the five-stage analysis pipeline.
 *
 * Framework-agnostic and imperative by design: React never re-renders per
 * frame. Own it from a ref, feed it scroll progress, dispose it on unmount.
 */
export class ThreatFieldEngine {
  /* ---- config ---- */
  private opts: Required<Omit<EngineOptions, 'onProgress' | 'onPick' | 'analysis'>> & EngineOptions;
  private analysis: DerivedAnalysis;
  private scene: SceneData;

  /* ---- canvas ---- */
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private painter: Painter | null = null;
  private sprites: HTMLCanvasElement[];
  private glowCanvas: HTMLCanvasElement;
  private glowCtx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;

  /* ---- particle field ---- */
  private n = 0;
  private pos = new Float32Array(0);
  private targets: Float32Array[] = [];
  private ease = new Float32Array(0);
  private hostile = new Uint8Array(0);
  private core = new Uint8Array(0);
  private land: Uint8Array | null = null;
  /** Previous screen positions, for velocity streaks. */
  private prevScreen = new Float32Array(0);
  private sx = new Float32Array(0);
  private sy = new Float32Array(0);
  private sz = new Float32Array(0);
  private sr = new Float32Array(0);
  private sa = new Float32Array(0);
  private sc = new Uint8Array(0);
  private order: number[] = [];

  /* ---- camera / timing ---- */
  private af = 0;
  private afSmooth = 0;
  private spin = 0;
  private dragYaw = 0;
  private dragPitch = 0;
  private roll = 0;
  private scrollVel = 0;
  private scrollDelta = 0;
  private t0 = 0;
  private prevNow = 0;
  private lastFrame = 0;
  private lastProgress = 0;
  private stageIndex = 0;
  private flashAt = -9999;
  private pulses: Pulse[] = [];
  private reduceMotion = false;

  /* ---- interaction ---- */
  private mouse = { x: -9999, y: -9999, on: false };
  private drag: { x: number; y: number; moved: number } | null = null;
  private charIndex: number;
  private nodeId: string;
  private pickChars: PickTarget<number>[] | null = null;
  private pickNodes: PickTarget<string>[] | null = null;

  /* ---- lifecycle ---- */
  private alive = false;
  private frameToken = 0;
  private watchdog: number | null = null;
  private mask: LandMask | null = null;
  private geoReady = false;

  constructor(canvas: HTMLCanvasElement, options: EngineOptions) {
    this.canvas = canvas;
    this.opts = {
      particleCount: 2600,
      trailLength: 0.5,
      bloom: true,
      autoOrbit: true,
      ...options
    };
    this.analysis = deriveAnalysis(options.analysis);
    this.scene = buildSceneData(this.analysis);
    this.charIndex = Math.max(0, this.analysis.firstConfusable);
    this.nodeId = options.analysis.enrichment.nodes[0]?.id ?? '';

    this.sprites = buildSprites();
    this.glowCanvas = document.createElement('canvas');
    this.glowCtx = this.glowCanvas.getContext('2d')!;
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  /* ================================================================ public */

  start(): void {
    if (this.alive) return;
    this.alive = true;
    this.t0 = performance.now();
    this.build();
    this.resize();
    this.loadGeography();

    // Self-rearming loop with a generation token: a discarded mount (React
    // Strict Mode double-invoke) can never keep a second loop running.
    const token = ++this.frameToken;
    const tick = (now: number) => {
      if (!this.alive || token !== this.frameToken) return;
      this.lastFrame = performance.now();
      this.frame(now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Recovers from rAF throttling in background/hidden tabs.
    this.watchdog = window.setInterval(() => {
      if (this.alive && performance.now() - this.lastFrame > 600) {
        requestAnimationFrame(tick);
      }
    }, 700);

    this.frame(performance.now());
  }

  destroy(): void {
    this.alive = false;
    this.frameToken++;
    if (this.watchdog !== null) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
  }

  /** Scroll progress as a stage position, 0..4. */
  setProgress(af: number, delta = 0): void {
    this.af = Math.max(0, Math.min(STAGE_COUNT - 1, af));
    this.scrollDelta = delta;
    this.scrollVel = Math.min(90, Math.abs(delta) + this.scrollVel * 0.7);
  }

  setSelection(sel: { charIndex?: number; nodeId?: string }): void {
    if (sel.charIndex != null) this.charIndex = sel.charIndex;
    if (sel.nodeId != null) this.nodeId = sel.nodeId;
  }

  setAutoOrbit(on: boolean): void {
    this.opts.autoOrbit = on;
  }

  setOption<K extends 'particleCount' | 'trailLength' | 'bloom'>(
    key: K,
    value: EngineOptions[K]
  ): void {
    (this.opts as Record<string, unknown>)[key] = value;
    if (key === 'particleCount') this.build();
  }

  /** Replace the analysed indicator; rebuilds derived data and geometry only. */
  setAnalysis(result: AnalysisResult): void {
    this.analysis = deriveAnalysis(result);
    this.scene = buildSceneData(this.analysis);
    this.charIndex = Math.max(0, this.analysis.firstConfusable);
    this.nodeId = result.enrichment.nodes[0]?.id ?? '';
  }

  /** World-space shockwave through the particle field. */
  emitPulse(): void {
    this.pulses.push({ t: performance.now() });
    if (this.pulses.length > 4) this.pulses.shift();
  }

  resize(): void {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;
    this.painter = new Painter(this.ctx, this.sprites);
    this.glowCanvas.width = Math.max(2, Math.round(w / 4));
    this.glowCanvas.height = Math.max(2, Math.round(h / 4));
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#0d0e15';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /* ---- pointer plumbing (wire these to the canvas element) ---- */

  pointerDown(e: PointerEvent): void {
    this.drag = { x: e.clientX, y: e.clientY, moved: 0 };
    this.canvas.style.cursor = 'grabbing';
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* not capturable */
    }
  }

  pointerMove(e: PointerEvent): void {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
    this.mouse.on = true;
    if (!this.drag) return;
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
    this.drag.moved += Math.abs(dx) + Math.abs(dy);
    this.dragYaw += dx * 0.005;
    this.dragPitch = Math.max(-0.75, Math.min(0.75, this.dragPitch + dy * 0.004));
  }

  pointerUp(e?: PointerEvent): void {
    if (e?.type === 'pointerleave') this.mouse.on = false;
    this.canvas.style.cursor = 'grab';
    if (this.drag && this.drag.moved < 6) this.handleClick(e);
    this.drag = null;
  }

  private handleClick(e?: PointerEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const mx = e ? e.clientX - r.left : this.mouse.x;
    const my = e ? e.clientY - r.top : this.mouse.y;

    const nearest = <T,>(list: PickTarget<T>[] | null): T | null => {
      if (!list) return null;
      let best: T | null = null;
      let bd = Infinity;
      list.forEach((p) => {
        const dx = mx - p[0];
        const dy = my - p[1];
        const d2 = dx * dx + dy * dy;
        if (d2 < p[2] * p[2] && d2 < bd) {
          bd = d2;
          best = p[3];
        }
      });
      return best;
    };

    const ci = nearest(this.pickChars);
    if (ci != null) {
      this.charIndex = ci;
      this.opts.onPick?.({ charIndex: ci });
      return;
    }
    const nid = nearest(this.pickNodes);
    if (nid != null) {
      this.nodeId = nid;
      this.opts.onPick?.({ nodeId: nid });
      return;
    }
    this.emitPulse();
  }

  /* ============================================================== geometry */

  /**
   * One morph target per stage. Particles interpolate between the two nearest
   * targets, each at its own easing rate, so transitions feel physical.
   */
  private build(): void {
    const N = Math.max(300, Math.min(4200, Math.round(this.opts.particleCount ?? 2600)));
    this.n = N;

    // Deterministic LCG: the field looks identical on every load.
    let seed = 20260821;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    this.pos = new Float32Array(N * 3);
    this.ease = new Float32Array(N);
    this.hostile = new Uint8Array(N);
    this.core = new Uint8Array(N);
    this.targets = Array.from({ length: STAGE_COUNT }, () => new Float32Array(N * 3));

    for (let i = 0; i < N; i++) {
      this.ease[i] = 0.035 + rnd() * 0.055;
      this.hostile[i] = rnd() < 0.2 ? 1 : 0;
      this.core[i] = !this.hostile[i] && rnd() < 0.09 ? 1 : 0;
    }

    const GA = Math.PI * (3 - Math.sqrt(5)); // golden angle

    // 0 — exposure: sphere (replaced by real coastlines once the mask loads).
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = GA * i;
      const R = 1.02 + rnd() * 0.06;
      this.targets[0].set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
    }

    // 1 — extraction: flat feature matrix.
    const cols = Math.ceil(Math.sqrt(N));
    for (let i = 0; i < N; i++) {
      const cx = (i % cols) / (cols - 1) - 0.5;
      const cz = Math.floor(i / cols) / (cols - 1) - 0.5;
      const x = cx * 3.5;
      const z = cz * 3.5;
      this.targets[1].set([x, Math.sin(x * 2.2 + z * 1.4) * 0.07 + (rnd() - 0.5) * 0.02, z], i * 3);
    }

    // 2 — homograph: a substituted codepoint dents the shell.
    const ox = -1.9;
    const oy = 1.35;
    const oz = -0.9;
    let hostileCount = 0;
    for (let i = 0; i < N; i++) hostileCount += this.hostile[i];
    hostileCount = Math.max(1, hostileCount);
    let hIdx = 0;
    for (let i = 0; i < N; i++) {
      if (this.hostile[i]) {
        const t = hIdx++ / hostileCount;
        const k = Math.pow(t, 0.7);
        const spread = 0.16 * (1 - k) + 0.02;
        this.targets[2].set(
          [
            ox * (1 - k) + (rnd() - 0.5) * spread * 2,
            oy * (1 - k) + (rnd() - 0.5) * spread * 2,
            oz * (1 - k) + (rnd() - 0.5) * spread * 2
          ],
          i * 3
        );
      } else {
        const y = 1 - (i / (N - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const th = GA * i;
        const x = Math.cos(th) * r;
        const z = Math.sin(th) * r;
        const dx = x - ox * 0.5;
        const dy = y - oy * 0.5;
        const dz = z - oz * 0.5;
        const dd = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const s = 1.05 - Math.exp(-dd * dd * 2.6) * 0.5;
        this.targets[2].set([x * s, y * s, z * s], i * 3);
      }
    }

    // 3 — enrichment: evidence clusters.
    const clusters: Array<[number, number, number]> = [];
    for (let c = 0; c < 4; c++) {
      const a = (c / 4) * Math.PI * 2 + 0.5;
      clusters.push([Math.cos(a) * 1.42, c % 2 ? 0.4 : -0.4, Math.sin(a) * 1.42]);
    }
    for (let i = 0; i < N; i++) {
      const C = clusters[i % 4];
      const g = () => (rnd() + rnd() + rnd() - 1.5) * 0.24;
      this.targets[3].set([C[0] + g(), C[1] + g(), C[2] + g()], i * 3);
    }

    // 4 — decision: quarantine shell, verdict core, feedback ring.
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = GA * i;
      if (this.core[i]) {
        this.targets[4].set([Math.cos(th) * r * 0.32, y * 0.32, Math.sin(th) * r * 0.32], i * 3);
      } else if (this.hostile[i]) {
        const a = GA * i;
        const rr = 1.62 + rnd() * 0.05;
        this.targets[4].set([Math.cos(a) * rr, (rnd() - 0.5) * 0.05, Math.sin(a) * rr], i * 3);
      } else {
        const R = 1.28 + (i % 3) * 0.035;
        this.targets[4].set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
      }
    }

    this.prevScreen = new Float32Array(N * 2);
    this.sx = new Float32Array(N);
    this.sy = new Float32Array(N);
    this.sz = new Float32Array(N);
    this.sr = new Float32Array(N);
    this.sa = new Float32Array(N);
    this.sc = new Uint8Array(N);
    this.order = new Array(N);

    // Start wide and fly in.
    this.pos.set(this.targets[0]);
    for (let i = 0; i < N * 3; i++) this.pos[i] *= 1.9;

    if (this.mask) this.applyGeography();
  }

  private async loadGeography(): Promise<void> {
    try {
      this.mask = await loadLandMask();
      this.applyGeography();
      this.geoReady = true;
    } catch {
      this.geoReady = false; // graceful: stage 01 stays an abstract sphere
    }
  }

  /** Resamples stage-0 particles onto real coastlines. */
  private applyGeography(): void {
    const mask = this.mask;
    const N = this.n;
    if (!mask || !N) return;

    const M = Math.max(6000, N * 5);
    const GA = Math.PI * (3 - Math.sqrt(5));
    const DEG = 180 / Math.PI;
    const land: number[] = [];
    const sea: number[] = [];

    for (let k = 0; k < M; k++) {
      const y = 1 - (k / (M - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = GA * k;
      const x = Math.cos(th) * r;
      const z = Math.sin(th) * r;
      const lat = Math.asin(y) * DEG;
      const lon = Math.atan2(z, x) * DEG;
      (isLand(mask, lat, lon) ? land : sea).push(x, y, z);
    }

    const lc = land.length / 3;
    const sn = sea.length / 3;
    if (lc < 50) return;

    this.land = new Uint8Array(N);
    // Over-sample land so continents read; ocean sits slightly inside.
    const quota = Math.min(Math.round(N * 0.84), lc);
    for (let i = 0; i < N; i++) {
      const onLand = i < quota;
      const src = onLand ? land : sea;
      const count = onLand ? lc : sn;
      const idx = onLand
        ? Math.floor((i * count) / quota) % count
        : Math.floor(((i - quota) * count) / Math.max(1, N - quota)) % count;
      const R = onLand ? 1.012 : 0.955;
      this.land[i] = onLand ? 1 : 0;
      this.targets[0].set([src[idx * 3] * R, src[idx * 3 + 1] * R, src[idx * 3 + 2] * R], i * 3);
    }
  }

  /* ================================================================= frame */

  private frame(now: number): void {
    if (!this.ctx || !this.painter || !this.w) {
      this.resize();
      if (!this.ctx || !this.painter) return;
    }
    const ctx = this.ctx;
    const P = this.painter;
    const w = this.w;
    const h = this.h;
    const time = (now - this.t0) / 1000;

    // Frame-rate independence: everything scales by elapsed time.
    const dt = Math.max(6, Math.min(48, now - (this.prevNow || now - 16)));
    this.prevNow = now;
    const step = dt / 16.7;

    const before = this.afSmooth;
    this.afSmooth += (this.af - this.afSmooth) * Math.min(1, 0.085 * step);
    const af = this.afSmooth;

    const A = Math.max(0, Math.min(STAGE_COUNT - 2, Math.floor(af)));
    const B = Math.min(STAGE_COUNT - 1, A + 1);
    const raw = Math.max(0, Math.min(1, af - A));
    const e = raw * raw * (3 - 2 * raw);

    const wt = (k: number) => Math.max(0, 1 - Math.abs(af - k) / 0.85);
    const w0 = wt(0);
    const w1 = wt(1);
    const w2 = wt(2);
    const w3 = wt(3);
    const w4 = wt(4);
    const sceneW = Math.max(w1, w2, w3, w4);
    // Particle field recedes to atmosphere while a stage scene owns the frame.
    const fieldDim = 1 - 0.9 * sceneW;

    this.scrollVel = Math.max(0, this.scrollVel * Math.pow(0.86, step) - 0.15);
    const energy = Math.min(1, Math.abs(af - before) * 24 + Math.min(0.75, this.scrollVel / 48));

    const idx = Math.round(af);
    if (idx !== this.stageIndex) {
      this.stageIndex = idx;
      if (!this.reduceMotion) this.flashAt = now;
    }

    /* ---- camera ---- */
    if (this.opts.autoOrbit && !this.drag && !this.reduceMotion) this.spin += 0.0016 * step;
    // Text-based scenes lock face-on; globe and network keep free orbit.
    const faceOn = Math.max(w1, w2, w4);
    const yawFree = 0.4 + this.spin + this.dragYaw + af * 0.22;
    const yaw =
      yawFree * (1 - faceOn) + (this.dragYaw * 0.35 + Math.sin(time * 0.18) * 0.05) * faceOn;
    const pitch = (-0.16 + this.dragPitch) * (1 - faceOn * 0.55) + faceOn * 0.03;
    const zoom = [4.15, 3.15, 3.35, 3.95, 3.4];
    const d = zoom[A] + (zoom[B] - zoom[A]) * e;
    const fov = Math.min(w, h) * 0.62;
    const cam: Camera = {
      cy: Math.cos(yaw),
      sy: Math.sin(yaw),
      cp: Math.cos(pitch),
      sp: Math.sin(pitch),
      d,
      fov
    };

    const rollTarget = Math.max(-0.045, Math.min(0.045, this.scrollDelta * 0.0007));
    this.roll += (rollTarget - this.roll) * Math.min(1, 0.08 * step);
    P.rollC = Math.cos(this.roll);
    P.rollS = Math.sin(this.roll);
    P.w = w;
    P.h = h;

    // Off-centre right so the field reads against the left copy column.
    const centre = w > 980 ? 0.7 : w > 760 ? 0.66 : 0.6;
    P.ox = w * (centre - 0.022 * sceneW);
    P.oy = h * (0.5 - 0.085 * sceneW);

    /* ---- background: trail fade + stage colour grade ---- */
    const ta = STAGE_TINT[A];
    const tb = STAGE_TINT[B];
    const tint = [0, 1, 2].map((i) => Math.round(ta[i] + (tb[i] - ta[i]) * e)).join(',');

    const trail = this.reduceMotion ? 0 : Math.max(0, Math.min(1, this.opts.trailLength ?? 0.5));
    let fade = Math.max(0.09, Math.min(1, (0.66 - 0.4 * trail - 0.3 * energy) * step));
    // The globe needs a crisper clear or coastlines smear.
    if (w0 > 0.3) fade = Math.max(fade, Math.min(1, (0.55 + 0.45 * w0) * step));
    const bright = Math.max(0.5, Math.min(1, fade / 0.46));

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(13,14,21,${fade.toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(P.ox, h * 0.47, 0, P.ox, h * 0.47, Math.max(w, h) * 0.55);
    glow.addColorStop(0, `rgba(${tint},${(0.1 * fade).toFixed(4)})`);
    glow.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const pulses = this.pulses.filter((p) => now - p.t < 2600);
    this.pulses = pulses;

    /* ---- solid planet body, so continents read as land ---- */
    const rs = fov / Math.sqrt(Math.max(0.05, d * d - 1));
    if (this.geoReady && w0 > 0.03) {
      ctx.globalCompositeOperation = 'source-over';
      const ocean = ctx.createRadialGradient(
        P.ox - rs * 0.3,
        P.oy - rs * 0.35,
        rs * 0.1,
        P.ox,
        P.oy,
        rs
      );
      ocean.addColorStop(0, `rgba(17,25,48,${(0.96 * w0).toFixed(3)})`);
      ocean.addColorStop(0.72, `rgba(11,15,29,${(0.96 * w0).toFixed(3)})`);
      ocean.addColorStop(1, `rgba(7,9,17,${(0.98 * w0).toFixed(3)})`);
      ctx.fillStyle = ocean;
      ctx.beginPath();
      ctx.arc(P.ox, P.oy, rs, 0, 6.2832);
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      const atm = ctx.createRadialGradient(P.ox, P.oy, rs * 0.86, P.ox, P.oy, rs * 1.22);
      atm.addColorStop(0, 'rgba(96,132,220,0)');
      atm.addColorStop(0.55, `rgba(110,146,235,${(0.16 * w0).toFixed(3)})`);
      atm.addColorStop(1, 'rgba(110,146,235,0)');
      ctx.fillStyle = atm;
      ctx.beginPath();
      ctx.arc(P.ox, P.oy, rs * 1.22, 0, 6.2832);
      ctx.fill();
      ctx.strokeStyle = `rgba(150,180,255,${(0.3 * w0).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(P.ox, P.oy, rs, 0, 6.2832);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';

    /* ---- particle integration + projection ---- */
    const TA = this.targets[A];
    const TB = this.targets[B];
    const pos = this.pos;
    const prev = this.prevScreen;
    const streaks: number[][] = [[], [], [], [], [], [], []];
    const mOn = this.mouse.on;
    const mx = this.mouse.x;
    const my = this.mouse.y;
    let count = 0;

    for (let i = 0; i < this.n; i++) {
      const j = i * 3;
      const q = i * 2;
      const tx = TA[j] + (TB[j] - TA[j]) * e;
      const ty = TA[j + 1] + (TB[j + 1] - TA[j + 1]) * e;
      const tz = TA[j + 2] + (TB[j + 2] - TA[j + 2]) * e;
      const k = Math.min(0.55, this.ease[i] * step);
      pos[j] += (tx - pos[j]) * k;
      pos[j + 1] += (ty - pos[j + 1]) * k;
      pos[j + 2] += (tz - pos[j + 2]) * k;

      let x = pos[j];
      let y = pos[j + 1];
      let z = pos[j + 2];
      const dist = Math.sqrt(x * x + y * y + z * z) || 1e-4;

      // Expanding shockwaves from clicks / sweeps.
      for (let p = 0; p < pulses.length; p++) {
        const age = (now - pulses[p].t) / 1000;
        const g =
          Math.exp(-Math.pow(dist - age * 1.5, 2) / 0.012) * 0.42 * Math.max(0, 1 - age / 2.6);
        if (g > 0.001) {
          const s = g / dist;
          x += pos[j] * s;
          y += pos[j + 1] * s;
          z += pos[j + 2] * s;
        }
      }

      if (!this.reduceMotion) {
        x += Math.sin(time * 0.7 + i) * 0.012;
        y += Math.cos(time * 0.62 + i * 1.3) * 0.012;
      }

      const pr = P.project(x, y, z, cam);
      if (!pr) {
        prev[q] = 0;
        prev[q + 1] = 0;
        continue;
      }
      let px = pr[0];
      let py = pr[1];
      const depth = pr[2];
      const scale = pr[3];
      if (px < -80 || px > w + 80 || py < -80 || py > h + 80) {
        prev[q] = 0;
        prev[q + 1] = 0;
        continue;
      }
      // Cull the far hemisphere so the globe reads solid.
      if (this.geoReady && w0 > 0.5 && depth > d) {
        prev[q] = 0;
        prev[q + 1] = 0;
        continue;
      }

      // Cursor magnet.
      let boost = 0;
      if (mOn) {
        const dx = px - mx;
        const dy = py - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < 26000) {
          const f = 1 - d2 / 26000;
          const push = (f * f * 30) / Math.max(26, Math.sqrt(d2));
          px += dx * push;
          py += dy * push;
          boost = f * f * 0.45;
        }
      }

      // Palette by role and stage.
      let c = 0;
      if (this.hostile[i]) c = w4 > 0.45 ? 3 : w2 > 0.25 || w3 > 0.5 ? 2 : 0;
      else if (this.core[i]) c = 1;
      else if (w4 > 0.5) c = 4;
      if (this.geoReady && this.land && w0 > 0.4) c = this.land[i] ? 6 : 5;

      let a = Math.min(1, Math.max(0.08, (1.75 / depth) * 0.72));
      if (c === 2) a = Math.min(1, a * 1.45);
      if (c === 5) a *= 0.14;
      if (c === 6) a = Math.min(1, a * 1.85);
      a *= fieldDim;
      if (w0 > 0.35 && depth > d) a *= 1 - 0.72 * w0;
      a = Math.min(1, (a + boost) * bright);

      const ox2 = prev[q];
      const oy2 = prev[q + 1];
      prev[q] = px;
      prev[q + 1] = py;
      if (ox2 !== 0 || oy2 !== 0) {
        const vx = px - ox2;
        const vy = py - oy2;
        const vm = vx * vx + vy * vy;
        if (vm > 12 && vm < 120000) streaks[c].push(ox2, oy2, px, py);
      }

      this.sx[count] = px;
      this.sy[count] = py;
      this.sz[count] = depth;
      this.sr[count] = Math.max(0.62, Math.min(3.4, scale * 0.0098)) * (c === 5 ? 0.6 : c === 6 ? 1.4 : 1);
      this.sa[count] = a;
      this.sc[count] = c;
      this.order[count] = count;
      count++;
    }

    /* ---- velocity streaks ---- */
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.05;
    for (let c = 0; c < 7; c++) {
      const s = streaks[c];
      if (s.length < 4) continue;
      const p = PALETTE[c];
      ctx.strokeStyle = `rgba(${p[0]},${p[1]},${p[2]},${(0.1 + 0.22 * energy).toFixed(3)})`;
      ctx.beginPath();
      for (let n = 0; n < s.length; n += 4) {
        ctx.moveTo(s[n], s[n + 1]);
        ctx.lineTo(s[n + 2], s[n + 3]);
      }
      ctx.stroke();
    }

    /* ---- depth-sorted soft sprites ---- */
    this.order.length = count;
    this.order.sort((a2, b2) => this.sz[b2] - this.sz[a2]);
    for (let n = 0; n < count; n++) {
      const i = this.order[n];
      const r = this.sr[i] * 2.55;
      ctx.globalAlpha = this.sa[i];
      ctx.drawImage(this.sprites[this.sc[i]], this.sx[i] - r, this.sy[i] - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;

    /* ---- stage scenes ---- */
    const base = {
      painter: P,
      camera: cam,
      af,
      time,
      data: this.scene,
      analysis: this.analysis,
      charIndex: this.charIndex,
      nodeId: this.nodeId
    };
    if (w0 > 0.02) drawExposure({ ...base, weight: w0 } as SceneContext, this.geoReady);
    if (w1 > 0.02) drawExtraction({ ...base, weight: w1 } as SceneContext);
    this.pickChars =
      w2 > 0.02 ? drawHomograph({ ...base, weight: w2 } as SceneContext) : null;
    this.pickNodes =
      w3 > 0.02 ? drawEnrichment({ ...base, weight: w3 } as SceneContext) : null;
    if (w4 > 0.02) drawDecision({ ...base, weight: w4 } as SceneContext, h);

    /* ---- cursor reticle ---- */
    if (mOn && !this.reduceMotion) {
      ctx.strokeStyle = `rgba(${tint},0.34)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx, my, 27, 0, 6.2832);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 42, my);
      ctx.lineTo(mx - 33, my);
      ctx.moveTo(mx + 33, my);
      ctx.lineTo(mx + 42, my);
      ctx.moveTo(mx, my - 42);
      ctx.lineTo(mx, my - 33);
      ctx.moveTo(mx, my + 33);
      ctx.lineTo(mx, my + 42);
      ctx.stroke();
    }

    /* ---- bloom: blur on the quarter-res buffer, composite back ---- */
    if (this.opts.bloom && !this.reduceMotion && this.glowCanvas.width > 2) {
      const g = this.glowCanvas;
      const gx = this.glowCtx;
      gx.setTransform(1, 0, 0, 1, 0, 0);
      gx.clearRect(0, 0, g.width, g.height);
      gx.filter = 'blur(1.6px)';
      gx.drawImage(this.canvas, 0, 0, g.width, g.height);
      gx.filter = 'none';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32 - 0.14 * w0;
      ctx.drawImage(g, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    /* ---- stage-change glitch ---- */
    const flash = 1 - Math.min(1, (now - this.flashAt) / 400);
    if (flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(${tint},${(0.035 * flash).toFixed(4)})`;
      ctx.fillRect(0, 0, w, h);
      for (let b = 0; b < 6; b++) {
        const yb = (b * 149 + Math.floor(now / 55) * 37) % Math.max(1, h);
        ctx.fillStyle = `rgba(${tint},${(0.1 * flash).toFixed(4)})`;
        ctx.fillRect(0, yb | 0, w, 1 + (b % 2));
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // Throttled progress notification — the only engine -> React channel.
    if (now - this.lastProgress > 90) {
      this.lastProgress = now;
      this.opts.onProgress?.(af);
    }
  }
}
