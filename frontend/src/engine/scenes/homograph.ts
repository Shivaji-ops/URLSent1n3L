import { smoothstep } from '../painter';
import type { PickTarget, SceneContext } from './types';

/**
 * Stage 03 — 3D character inspection.
 * A scanner ring travels the suspect host; the selected glyph lifts out of the
 * line into a wireframe cage, with its codepoint and the ASCII twin beside it.
 * Returns per-glyph hit targets so the canvas is clickable.
 */
export function drawHomograph(c: SceneContext): PickTarget<number>[] {
  const { painter: P, camera: cam, af, time, weight: W, data, analysis: A, charIndex } = c;
  const ctx = P.ctx;
  const phase = Math.max(0, Math.min(1, (af - 1.62) / 0.5));
  const e = smoothstep(phase);
  const sweep = (time * 0.2) % 1;
  const sx = -1.05 + 2.1 * sweep;
  const picks: PickTarget<number>[] = [];

  // Scanner rings travelling the word.
  P.ring(sx, 0, 0.05, 0.62, 2, 0, '150,190,255', 0.34 * W, cam, 1);
  P.ring(sx, 0, 0.05, 0.5, 2, 0, '150,190,255', 0.18 * W, cam, 1);

  data.word.forEach((o) => {
    const selected = o.index === charIndex;
    const near = Math.max(0, 1 - Math.abs(o.x - sx) / 0.3);
    const rgb = o.confusable ? '255,104,124' : '212,226,252';
    let x = o.x;
    let y = o.y;
    let z = o.z;
    let size = 0.15;
    let a = (0.66 + near * 0.34) * W;

    if (selected) {
      // Lift toward the viewer into the inspection volume.
      x = o.x * (1 - e);
      y = o.y * (1 - e) + 0.52 * e;
      z = o.z * (1 - e) + 1.0 * e;
      size = 0.15 + 0.3 * e;
      a = W;
      if (e > 0.1) {
        // Dashed marker showing the slot it was extracted from.
        ctx.setLineDash([2, 4]);
        P.box(o.x, o.y, o.z, 0.075, 0.1, 0.02, '255,104,124', 0.34 * e * W, cam);
        ctx.setLineDash([]);
      }
    } else {
      y -= e * 0.24;
      z -= e * 0.1;
      a *= 1 - 0.24 * e;
    }

    const squash = selected ? Math.cos(time * 0.55) : undefined;
    const p = P.glyph(o.char, x, y, z, size, rgb, a, cam, squash);
    if (p) picks.push([p[0], p[1], Math.max(13, size * p[3] * 0.62), o.index]);

    if (o.confusable && !selected) {
      P.sprite(p, 9, 2, 0.35 * W);
      P.tag('\u25b2', p, 0, size * (p ? p[3] : 0) * 0.75, 8, '255,120,130', 0.7 * W, 'center');
    }
    if (near > 0.78 && !selected) {
      P.tag(o.hex, p, 0, -size * (p ? p[3] : 0) * 0.8, 8.5, '150,190,255', 0.7 * near * W, 'center');
    }
  });

  if (e <= 0.04) return picks;

  // The inspection volume itself.
  const G = A.glyphs[charIndex] ?? A.glyphs[0];
  const bad = G.confusable;
  const rgb = bad ? '255,104,124' : '206,220,248';
  P.box(0, 0.52, 1.0, 0.2, 0.26, 0.2, rgb, 0.4 * e * W, cam);
  P.ring(0, 0.52, 1.0, 0.38, 0, time * 0.5, rgb, 0.3 * e * W, cam, 1);
  P.ring(0, 0.52, 1.0, 0.42, 1, -time * 0.36, rgb, 0.2 * e * W, cam, 1);

  const top = P.project(0, 0.86, 1.0, cam);
  P.tag(G.hex, top, 0, -8, 11, rgb, 0.95 * e * W, 'center');
  P.tag(G.name, top, 0, 6, 8.5, '176,192,224', 0.75 * e * W, 'center');

  if (bad && G.ascii) {
    // The legitimate ASCII twin, and the similarity link between them.
    const twin = P.glyph(G.ascii, 0.78, 0.52, 1.0, 0.4, '120,235,180', 0.9 * e * W, cam);
    P.box(0.78, 0.52, 1.0, 0.16, 0.22, 0.16, '120,235,180', 0.3 * e * W, cam);
    P.tag(`ASCII \u2018${G.ascii}\u2019`, twin, 0, -34, 9, '120,235,180', 0.8 * e * W, 'center');
    P.polyline(
      [P.project(0.22, 0.52, 1.0, cam), P.project(0.58, 0.52, 1.0, cam)],
      '255,190,120',
      0.55 * e * W,
      1
    );
    P.tag(
      `\u2248 ${A.raw.homograph.brandSimilarity.toFixed(2)}`,
      P.project(0.4, 0.52, 1.0, cam),
      0,
      -10,
      9.5,
      '255,206,140',
      0.9 * e * W,
      'center'
    );
  }

  return picks;
}
