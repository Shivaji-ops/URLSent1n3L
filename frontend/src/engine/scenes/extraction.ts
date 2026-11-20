import { smoothstep } from '../painter';
import type { SceneContext } from './types';

/**
 * Stage 02 — 3D URL deconstruction.
 * A scan plane sweeps the floating URL; the string then separates into
 * labelled depth lanes and emits feature values as wired HUD chips.
 */
export function drawExtraction(c: SceneContext): void {
  const { painter: P, camera: cam, af, time, weight: W, data } = c;
  const phase = Math.max(0, Math.min(1, (af - 0.58) / 0.5));
  const e = smoothstep(phase);
  const scanX = -1.85 + 3.7 * ((time * 0.26) % 1);

  // The scanning plane.
  P.polyline(
    [
      P.project(scanX, -1.15, -0.75, cam),
      P.project(scanX, 1.15, -0.75, cam),
      P.project(scanX, 1.15, 0.85, cam),
      P.project(scanX, -1.15, 0.85, cam)
    ],
    '150,190,255',
    0.2 * W,
    1,
    true
  );
  P.tag('SCAN', P.project(scanX, 1.15, 0.05, cam), 0, -12, 9, '176,204,255', 0.5 * W, 'center');

  // The URL itself: assembled at e=0, separated into lanes at e=1.
  data.groups.forEach((g) => {
    g.chars.forEach((ch) => {
      const x = ch.x0 + (ch.x1 - ch.x0) * e;
      const y = ch.y1 * e;
      const z = ch.z1 * e;
      const near = Math.max(0, 1 - Math.abs(x - scanX) / 0.22);
      const a = (0.42 + 0.5 * e + near * 0.5) * W;
      P.glyph(ch.ch, x, y, z, 0.1 + 0.03 * e + near * 0.02, g.rgb, a, cam);
      if (near > 0.35) P.sprite(P.project(x, y, z, cam), 7 * near, 1, 0.5 * near * W);
    });
    P.tag(
      g.label,
      P.project(-0.98, g.lane[1] * e, g.lane[2] * e, cam),
      -9,
      0,
      9,
      g.rgb,
      0.72 * e * W,
      'right'
    );
  });

  // Extracted features fly out, still wired to the lane that produced them.
  const cp = Math.max(0, Math.min(1, (phase - 0.32) / 0.5));
  if (cp < 0.02) return;
  data.chips.forEach((chip, k) => {
    const pulse = 0.75 + 0.25 * Math.sin(time * 1.6 + k);
    const g = data.groups[chip.lane % Math.max(1, data.groups.length)];
    const from = g ? P.project(g.lane[0], g.lane[1] * e, g.lane[2] * e, cam) : null;
    const to = P.project(chip.p[0] * cp, chip.p[1] * cp, chip.p[2] * cp, cam);
    P.polyline([from, to], chip.hot ? '255,130,120' : '122,156,255', 0.16 * cp * W, 1);
    P.sprite(to, 5.5, chip.hot ? 2 : 1, 0.7 * cp * pulse * W);
    P.tag(
      `${chip.name}  ${chip.value}`,
      to,
      -9,
      0,
      9,
      chip.hot ? '255,150,140' : '202,214,240',
      0.85 * cp * W,
      'right'
    );
  });
}
