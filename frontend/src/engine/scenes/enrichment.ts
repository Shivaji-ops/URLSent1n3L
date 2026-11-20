import { SEVERITY_RGB, SPRITE } from '../palette';
import type { Projected } from '../painter';
import type { PickTarget, SceneContext } from './types';

/**
 * Stage 04 — 3D threat-intelligence network.
 * The indicator sits at the centre inside counter-rotating rings; evidence
 * nodes orbit on two shells, wired by glowing edges carrying intel packets.
 * Fully data-driven: add nodes/edges, not code.
 */
export function drawEnrichment(c: SceneContext): PickTarget<string>[] {
  const { painter: P, camera: cam, af, time, weight: W, data, analysis: A, nodeId } = c;
  const ctx = P.ctx;
  const phase = Math.max(0, Math.min(1, (af - 2.55) / 0.6));

  // Orbit positions, revealed shell by shell.
  const pos = new Map<string, [number, number, number]>();
  data.net.forEach((o) => {
    if (!o.orbit) {
      pos.set(o.node.id, [0, 0, 0]);
      return;
    }
    const t = o.base + time * o.spin;
    const raw =
      o.node.ring === 2
        ? Math.max(0, Math.min(1, (phase - 0.15) / 0.6))
        : Math.max(0, Math.min(1, phase / 0.5));
    const g = raw * raw * (3 - 2 * raw);
    pos.set(o.node.id, [Math.cos(t) * o.orbit * g, o.y * g, Math.sin(t) * o.orbit * g]);
  });

  // Edges, with a packet travelling each one.
  A.raw.enrichment.edges.forEach((ed, k) => {
    const a = pos.get(ed.source);
    const b = pos.get(ed.target);
    if (!a || !b) return;
    const rgb = SEVERITY_RGB[ed.relationship];
    const pts: Array<Projected | null> = [];
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const lift = Math.sin(t * Math.PI) * 0.16;
      pts.push(
        P.project(
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t + lift,
          a[2] + (b[2] - a[2]) * t,
          cam
        )
      );
    }
    const hot = ed.relationship === 'malicious';
    P.polyline(pts, rgb, (hot ? 0.3 : 0.18) * W, hot ? 1.3 : 1);
    const t = (time * 0.34 + k * 0.17) % 1;
    P.sprite(pts[Math.min(12, Math.floor(t * 12))], 5, SPRITE[ed.relationship], 0.75 * W);
  });

  // Nodes, painted back to front.
  const drawn = data.net
    .map((o) => {
      const p = pos.get(o.node.id)!;
      return { o, pr: P.project(p[0], p[1], p[2], cam) };
    })
    .filter((d) => d.pr)
    .sort((a, b) => b.pr![2] - a.pr![2]);

  const picks: PickTarget<string>[] = [];
  drawn.forEach(({ o, pr }) => {
    const p = pr!;
    const selected = o.node.id === nodeId;
    const rgb = SEVERITY_RGB[o.node.severity];
    const r = o.size * p[3];
    const pulse = 0.8 + 0.2 * Math.sin(time * 1.5 + o.base * 3);

    P.sprite(p, r * (selected ? 2.3 : 1.7) * pulse, SPRITE[o.node.severity], (selected ? 0.95 : 0.62) * W);

    if (!o.orbit) {
      P.ring(0, 0, 0, 0.42, 0, time * 0.3, rgb, 0.4 * W, cam, 1.2);
      P.ring(0, 0, 0, 0.46, 1, -time * 0.22, rgb, 0.26 * W, cam, 1);
    }
    if (selected) {
      ctx.strokeStyle = `rgba(190,214,255,${(0.75 * W).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p[0], p[1], r * 2.6 + 7, 0, 6.2832);
      ctx.stroke();
    }

    // Outer-shell labels cycle so the network never becomes a wall of text.
    const showLabel = selected || o.node.ring < 2 || Math.sin(time * 0.5 + o.base * 2) > 0.1;
    const ly = o.node.ring === 1 ? -(r * 2.1 + 9) : r * 2.1 + (o.node.ring ? 10 : 17);
    if (showLabel) {
      P.tag(
        o.node.label,
        p,
        0,
        ly,
        o.orbit ? 8.5 : 11,
        selected ? '236,244,255' : '184,198,226',
        (selected ? 1 : 0.62) * W,
        'center'
      );
    }
    if (selected) P.tag(o.node.type, p, 0, ly + (ly < 0 ? -11 : 11), 8.5, rgb, 0.9 * W, 'center');

    picks.push([p[0], p[1], Math.max(15, r * 2.4), o.node.id]);
  });

  return picks;
}
