import type { SpriteIndex } from './palette';

/** Camera basis for one frame. */
export interface Camera {
  cy: number;
  sy: number;
  cp: number;
  sp: number;
  /** Eye distance. */
  d: number;
  /** Focal length in px. */
  fov: number;
}

/** [screenX, screenY, depth, scale] */
export type Projected = [number, number, number, number];

/**
 * Software 3D painter over a 2D canvas: perspective projection plus the
 * primitives every scene is built from. No WebGL, no scene graph.
 */
export class Painter {
  ctx: CanvasRenderingContext2D;
  sprites: HTMLCanvasElement[];
  /** Screen-space origin of the world. */
  ox = 0;
  oy = 0;
  w = 0;
  h = 0;
  /** Camera roll (leans into scroll direction). */
  rollC = 1;
  rollS = 0;

  constructor(ctx: CanvasRenderingContext2D, sprites: HTMLCanvasElement[]) {
    this.ctx = ctx;
    this.sprites = sprites;
  }

  /** Yaw, then pitch, then optional roll, then perspective divide. */
  project(x: number, y: number, z: number, c: Camera): Projected | null {
    const x1 = x * c.cy + z * c.sy;
    const z1 = z * c.cy - x * c.sy;
    const y1 = y * c.cp - z1 * c.sp;
    const z2 = z1 * c.cp + y * c.sp + c.d;
    if (z2 < 0.25) return null; // behind the near plane
    const s = c.fov / z2;
    let ax = x1 * s;
    let ay = y1 * s;
    if (this.rollS) {
      const t = ax * this.rollC - ay * this.rollS;
      ay = ax * this.rollS + ay * this.rollC;
      ax = t;
    }
    return [this.ox + ax, this.oy + ay, z2, s];
  }

  /** True when a point sits behind the globe's silhouette. */
  occluded(p: Projected, c: Camera): boolean {
    if (p[2] <= c.d) return false;
    const dx = p[0] - this.ox;
    const dy = p[1] - this.oy;
    const rs = c.fov / Math.sqrt(Math.max(0.05, c.d * c.d - 1));
    return dx * dx + dy * dy < rs * rs;
  }

  /** A character drawn at a world position, depth-scaled. squash fakes rotation. */
  glyph(
    ch: string,
    x: number,
    y: number,
    z: number,
    size: number,
    rgb: string,
    a: number,
    c: Camera,
    squash?: number
  ): Projected | null {
    const p = this.project(x, y, z, c);
    if (!p) return null;
    const fs = size * p[3];
    if (fs < 1.2 || a < 0.01) return p;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p[0], p[1]);
    if (squash != null) ctx.scale(Math.max(0.05, squash), 1);
    ctx.font = `500 ${fs.toFixed(1)}px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(${rgb},${Math.min(1, a).toFixed(3)})`;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    return p;
  }

  /** Screen-space label anchored to a projected point. */
  tag(
    text: string,
    p: Projected | null,
    dx: number,
    dy: number,
    px: number,
    rgb: string,
    a: number,
    align: CanvasTextAlign = 'left'
  ): void {
    if (!p || a < 0.02) return;
    const ctx = this.ctx;
    ctx.font = `500 ${px}px 'IBM Plex Mono', monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(${rgb},${Math.min(1, a).toFixed(3)})`;
    ctx.fillText(text, p[0] + dx, p[1] + dy);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  polyline(pts: Array<Projected | null>, rgb: string, a: number, width = 1, close = false): void {
    const v = pts.filter(Boolean) as Projected[];
    if (v.length < 2) return;
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${rgb},${Math.min(1, a).toFixed(3)})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    v.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    if (close) ctx.closePath();
    ctx.stroke();
  }

  /** Wireframe box — the inspection cage. */
  box(
    cx: number,
    cy: number,
    cz: number,
    hx: number,
    hy: number,
    hz: number,
    rgb: string,
    a: number,
    c: Camera
  ): void {
    const V: Array<Projected | null> = [];
    for (let i = 0; i < 8; i++) {
      V.push(
        this.project(cx + (i & 1 ? hx : -hx), cy + (i & 2 ? hy : -hy), cz + (i & 4 ? hz : -hz), c)
      );
    }
    const E: Array<[number, number]> = [
      [0, 1], [1, 3], [3, 2], [2, 0],
      [4, 5], [5, 7], [7, 6], [6, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    const ctx = this.ctx;
    ctx.strokeStyle = `rgba(${rgb},${Math.min(1, a).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    E.forEach(([i, j]) => {
      const p = V[i];
      const q = V[j];
      if (p && q) {
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
      }
    });
    ctx.stroke();
  }

  /** Ring in world space. axis 0 = XZ, 1 = XY, 2 = YZ. */
  ring(
    cx: number,
    cy: number,
    cz: number,
    r: number,
    axis: 0 | 1 | 2,
    rot: number,
    rgb: string,
    a: number,
    c: Camera,
    width = 1
  ): void {
    const pts: Array<Projected | null> = [];
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (let s = 0; s <= 44; s++) {
      const t = (s / 44) * Math.PI * 2;
      let x = Math.cos(t) * r;
      let y = 0;
      let z = Math.sin(t) * r;
      if (axis === 1) {
        y = Math.sin(t) * r;
        z = 0;
      } else if (axis === 2) {
        x = 0;
        y = Math.cos(t) * r;
        z = Math.sin(t) * r;
      }
      pts.push(this.project(cx + (x * cr - z * sr), cy + y, cz + (x * sr + z * cr), c));
    }
    this.polyline(pts, rgb, a, width, true);
  }

  /** Additive glow blob. */
  sprite(p: Projected | null, r: number, index: SpriteIndex, a: number): void {
    if (!p || a < 0.01) return;
    const ctx = this.ctx;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(this.sprites[index], p[0] - r, p[1] - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
}

/** Quadratic Bézier from `from` toward the origin via `ctrl`. */
export function bezier(
  from: readonly [number, number, number],
  ctrl: readonly [number, number, number],
  t: number
): [number, number, number] {
  const k = 1 - t;
  return [
    k * k * from[0] + 2 * k * t * ctrl[0],
    k * k * from[1] + 2 * k * t * ctrl[1],
    k * k * from[2] + 2 * k * t * ctrl[2]
  ];
}

/** Great-circle interpolation between two unit vectors, with an arc lift. */
export function greatCircle(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
  lift = 0.3
): [number, number, number] {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const om = Math.acos(dot);
  const so = Math.sin(om) || 1e-6;
  const k1 = Math.sin((1 - t) * om) / so;
  const k2 = Math.sin(t * om) / so;
  const l = 1 + Math.sin(t * Math.PI) * lift;
  return [
    (a[0] * k1 + b[0] * k2) * l,
    (a[1] * k1 + b[1] * k2) * l,
    (a[2] * k1 + b[2] * k2) * l
  ];
}

export const smoothstep = (t: number): number => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
