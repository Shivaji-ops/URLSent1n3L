import { greatCircle, type Projected } from '../painter';
import type { SceneContext } from './types';

/**
 * Stage 01 — global threat map.
 * Graticule plus geolocated great-circle attack routes with travelling heads,
 * correctly occluded when they pass behind the planet.
 */
export function drawExposure(c: SceneContext, geoReady: boolean): void {
  const { painter: P, camera: cam, time, weight: W, data } = c;
  const ctx = P.ctx;

  if (geoReady) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(120,150,210,${(0.1 * W).toFixed(3)})`;

    // Parallels.
    for (let lat = -60; lat <= 60; lat += 30) {
      const p = (lat * Math.PI) / 180;
      const rr = Math.cos(p);
      const yy = Math.sin(p);
      ctx.beginPath();
      let on = false;
      for (let s = 0; s <= 72; s++) {
        const th = (s / 72) * Math.PI * 2;
        const pr = P.project(Math.cos(th) * rr, yy, Math.sin(th) * rr, cam);
        if (!pr || P.occluded(pr, cam)) {
          on = false;
          continue;
        }
        if (on) ctx.lineTo(pr[0], pr[1]);
        else ctx.moveTo(pr[0], pr[1]);
        on = true;
      }
      ctx.stroke();
    }

    // Meridians.
    for (let lon = 0; lon < 180; lon += 30) {
      const l = (lon * Math.PI) / 180;
      ctx.beginPath();
      let on = false;
      for (let s = 0; s <= 48; s++) {
        const p = -Math.PI / 2 + (s / 48) * Math.PI * 2;
        const pr = P.project(Math.cos(l) * Math.cos(p), Math.sin(p), Math.sin(l) * Math.cos(p), cam);
        if (!pr || P.occluded(pr, cam)) {
          on = false;
          continue;
        }
        if (on) ctx.lineTo(pr[0], pr[1]);
        else ctx.moveTo(pr[0], pr[1]);
        on = true;
      }
      ctx.stroke();
    }
  }

  const SEG = 24;
  data.routes.forEach((rt) => {
    const pts: Array<Projected | null> = [];
    const vis: boolean[] = [];
    for (let s = 0; s <= SEG; s++) {
      const q = greatCircle(rt.a, rt.b, s / SEG);
      const pr = P.project(q[0], q[1], q[2], cam);
      pts.push(pr);
      vis.push(Boolean(pr) && !P.occluded(pr!, cam));
    }

    // Dim full path.
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${rt.rgb},${(0.13 * W).toFixed(3)})`;
    ctx.beginPath();
    let on = false;
    for (let s = 0; s <= SEG; s++) {
      if (!vis[s]) {
        on = false;
        continue;
      }
      const p = pts[s]!;
      if (on) ctx.lineTo(p[0], p[1]);
      else ctx.moveTo(p[0], p[1]);
      on = true;
    }
    ctx.stroke();

    // Bright comet tail behind the head.
    const t = (time * rt.speed + rt.offset) % 1;
    const head = Math.min(SEG, Math.floor(t * SEG));
    ctx.lineWidth = 1.9;
    for (let s = Math.max(1, head - 6); s <= head; s++) {
      if (!vis[s] || !vis[s - 1]) continue;
      const f = 1 - (head - s) / 6;
      ctx.strokeStyle = `rgba(${rt.rgb},${(f * f * 0.85 * W).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(pts[s - 1]![0], pts[s - 1]![1]);
      ctx.lineTo(pts[s]![0], pts[s]![1]);
      ctx.stroke();
    }
    if (vis[head]) P.sprite(pts[head]!, 9, rt.spriteIndex, W);

    // Origin and target markers, with an impact ripple on arrival.
    const src = P.project(rt.a[0], rt.a[1], rt.a[2], cam);
    if (src && !P.occluded(src, cam)) {
      ctx.fillStyle = `rgba(${rt.rgb},${(0.75 * W).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(src[0], src[1], 1.7, 0, 6.2832);
      ctx.fill();
    }
    const tgt = P.project(rt.b[0], rt.b[1], rt.b[2], cam);
    if (tgt && !P.occluded(tgt, cam)) {
      ctx.fillStyle = `rgba(${rt.rgb},${(0.8 * W).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(tgt[0], tgt[1], 2.1, 0, 6.2832);
      ctx.fill();
      if (t > 0.88) {
        const f = (t - 0.88) / 0.12;
        ctx.strokeStyle = `rgba(${rt.rgb},${((1 - f) * 0.6 * W).toFixed(3)})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(tgt[0], tgt[1], 3 + f * 26, 0, 6.2832);
        ctx.stroke();
      }
    }
  });
}
