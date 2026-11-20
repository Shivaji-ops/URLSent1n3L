import { useRef, type ReactNode } from 'react';
import { useProgressEffect, type ProgressBus } from '@/hooks/useStageProgress';

/**
 * The compact readout strip beneath the 3D stage. Stages 02–05 only;
 * stage 01's data lives in the narrative column and the attack feed.
 */
export function StageReadouts({ bus, panels }: { bus: ProgressBus; panels: ReactNode[] }) {
  const els = useRef<Array<HTMLDivElement | null>>([]);

  useProgressEffect(bus, (af) => {
    els.current.forEach((el, i) => {
      if (!el) return;
      const stage = i + 1;
      const dz = af - stage;
      const o = Math.max(0, 1 - Math.abs(dz) / 0.58);
      const s = o * o;
      el.style.opacity = s.toFixed(3);
      el.style.transform = `translateY(${(dz * 26).toFixed(1)}px) scale(${(0.985 + 0.015 * s).toFixed(4)})`;
      el.style.visibility = s < 0.006 ? 'hidden' : 'visible';
      el.style.pointerEvents = s > 0.7 ? 'auto' : 'none';
    });
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 'clamp(478px, 52%, 620px)',
        right: 'clamp(152px, 16vw, 196px)',
        bottom: 92,
        height: 'clamp(136px, 25vh, 196px)',
        pointerEvents: 'none'
      }}
    >
      {panels.map((panel, i) => (
        <div
          key={i}
          ref={(el) => {
            els.current[i] = el;
          }}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            visibility: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            overflow: 'hidden',
            transformOrigin: 'top left'
          }}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
