import { bezier, smoothstep, type Projected } from '../painter';
import type { SceneContext } from './types';

/**
 * Stage 05 — 3D risk convergence.
 * Weighted signal streams arc in as particle flows (speed and density set by
 * each score) and converge on a pulsing risk core carrying score and verdict.
 */
export function drawDecision(c: SceneContext, viewportHeight: number): void {
  const { painter: P, camera: cam, af, time, weight: W, data, analysis: A } = c;
  const ctx = P.ctx;
  const phase = Math.max(0, Math.min(1, (af - 3.5) / 0.55));
  const e = smoothstep(phase);

  const VERDICT_RGB =
    A.verdict === 'MALICIOUS' ? '255,96,120' : A.verdict === 'SUSPICIOUS' ? '255,190,110' : '104,236,180';
  const VERDICT_SPRITE = A.verdict === 'MALICIOUS' ? 2 : A.verdict === 'SUSPICIOUS' ? 1 : 3;

  const core = P.project(0, 0, 0, cam) ?? [P.ox, P.oy, cam.d, cam.fov / cam.d];

  // Label boxes already placed this frame, so nothing stacks.
  const placed: Array<{ x0: number; x1: number; y: number }> = [];

  data.streams.forEach((st, k) => {
    const score = st.signal.score;
    const hot = score >= 80;
    const warm = score >= 65;
    const rgb = hot ? '255,96,120' : warm ? '255,190,110' : '122,156,255';

    // The stream path.
    const pts: Array<Projected | null> = [];
    for (let s = 0; s <= 16; s++) {
      const q = bezier(st.from, st.ctrl, s / 16);
      pts.push(P.project(q[0], q[1], q[2], cam));
    }
    P.polyline(pts, rgb, 0.2 * W, 1);

    // Particle density and speed encode the score.
    const count = 2 + Math.round(score / 26);
    for (let i = 0; i < count; i++) {
      const t = (time * (0.16 + score / 620) + i / count + k * 0.13) % 1;
      const q = bezier(st.from, st.ctrl, t * (0.2 + 0.8 * e));
      P.sprite(
        P.project(q[0], q[1], q[2], cam),
        4.6 + 2.4 * (1 - t),
        hot ? 2 : warm ? 1 : 1,
        (0.42 + 0.5 * t) * W
      );
    }

    const hp = P.project(st.from[0], st.from[1], st.from[2], cam);
    const inward = st.from[0] > 0 ? -1 : 1;
    const align: CanvasTextAlign = inward > 0 ? 'left' : 'right';
    let ny = 0;

    if (hp) {
      // Repel out of the reserved core box, choosing a direction that stays
      // clear of the readout strip, then resolve label-on-label collisions.
      const edge = hp[0] + inward * 13;
      const intoCore = inward > 0 ? edge > core[0] - 78 : edge < core[0] + 78;
      const dy = hp[1] - core[1];
      if (intoCore && Math.abs(dy) < 92) {
        const up = -(92 + dy);
        const down = 92 - dy;
        const limit = viewportHeight - 244;
        ny = dy >= 0 && hp[1] + down + 10 < limit ? down : up;
      }
      const wide = 104;
      const x0 = inward > 0 ? hp[0] + 13 : hp[0] - 13 - wide;
      const dir = ny <= 0 ? -1 : 1;
      for (let guard = 0; guard < 8; guard++) {
        const y = hp[1] + ny;
        const clash = placed.some((b) => Math.abs(b.y - y) < 22 && x0 < b.x1 && x0 + wide > b.x0);
        if (!clash) break;
        ny += dir * 24;
      }
      placed.push({ x0, x1: x0 + wide, y: hp[1] + ny });
    }

    P.sprite(hp, 7, hot ? 2 : 1, 0.8 * W);
    P.tag(st.signal.label.toUpperCase(), hp, inward * 13, ny - 7, 8.5, '190,204,232', 0.85 * W, align);
    P.tag(`${score}  \u00b7  ${st.signal.stage}`, hp, inward * 13, ny + 5, 8, rgb, 0.8 * W, align);
  });

  // The risk core.
  const pulse = 0.86 + 0.14 * Math.sin(time * 2.1);
  P.sprite(core, (26 + 16 * e) * pulse, e > 0.4 ? (VERDICT_SPRITE as 1 | 2 | 3) : 1, (0.7 + 0.3 * e) * W);
  const coreRgb = e > 0.4 ? VERDICT_RGB : '122,156,255';
  P.ring(0, 0, 0, 0.5 + 0.12 * e, 0, time * 0.42, coreRgb, 0.55 * W, cam, 1.3);
  P.ring(0, 0, 0, 0.56 + 0.12 * e, 1, -time * 0.3, coreRgb, 0.35 * W, cam, 1);
  P.ring(0, 0, 0, 0.62 + 0.12 * e, 2, time * 0.24, coreRgb, 0.22 * W, cam, 1);

  ctx.font = `600 ${(20 + 10 * e).toFixed(0)}px 'Space Grotesk', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(${coreRgb},${(0.95 * W).toFixed(3)})`;
  ctx.fillText(String(A.risk), core[0], core[1]);

  if (e > 0.05) {
    // Verdict shockwave + classification.
    for (let r = 0; r < 2; r++) {
      const t = (time * 0.45 + r * 0.5) % 1;
      ctx.strokeStyle = `rgba(${VERDICT_RGB},${((1 - t) * 0.4 * e * W).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(core[0], core[1], 30 + t * 120, 0, 6.2832);
      ctx.stroke();
    }
    ctx.font = `600 ${(13 + 4 * e).toFixed(0)}px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = `rgba(${VERDICT_RGB},${(e * W).toFixed(3)})`;
    ctx.fillText(A.verdict, core[0], core[1] + 28 + 6 * e);
  }

  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
