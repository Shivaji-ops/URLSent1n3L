import { useRef, type CSSProperties, type ReactNode } from 'react';
import { STAGE_COPY } from '@/content/stages';
import { useProgressEffect, type ProgressBus } from '@/hooks/useStageProgress';
import { color, font } from '@/styles/tokens';

/**
 * The left copy column: one panel per stage, cross-fading with blur.
 * Panels are absolutely stacked and driven imperatively.
 */
export function NarrativeColumn({ bus, children }: { bus: ProgressBus; children?: ReactNode }) {
  const panels = useRef<Array<HTMLDivElement | null>>([]);

  useProgressEffect(bus, (af) => {
    panels.current.forEach((el, k) => {
      if (!el) return;
      const dz = af - k;
      const o = Math.max(0, 1 - Math.abs(dz) / 0.62);
      const s = o * o;
      el.style.opacity = s.toFixed(3);
      el.style.transform = `translateY(calc(-50% + ${(dz * 42).toFixed(1)}px)) translateX(${(dz * -16).toFixed(1)}px) scale(${(0.972 + 0.028 * s).toFixed(4)})`;
      el.style.filter = o < 0.98 ? `blur(${((1 - o) * 5).toFixed(1)}px)` : 'none';
      el.style.visibility = s < 0.004 ? 'hidden' : 'visible';
    });
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 'clamp(20px, 4vw, 56px)',
        top: 88,
        bottom: 86,
        width: 'min(430px, 46vw)',
        pointerEvents: 'none'
      }}
    >
      {STAGE_COPY.map((stage, k) => (
        <div
          key={stage.name}
          data-screen-label={stage.index}
          ref={(el) => {
            panels.current[k] = el;
          }}
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            width: '100%',
            transform: 'translateY(-50%)',
            opacity: k === 0 ? 1 : 0
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: font.mono,
              fontSize: 11,
              letterSpacing: '0.14em',
              color: stage.hue,
              marginBottom: 'clamp(10px, 1.8vh, 18px)'
            }}
          >
            <span style={{ width: 22, height: 1, background: stage.hue }} />
            {stage.index} &nbsp;{stage.name}
          </div>

          <h2
            style={{
              fontFamily: font.display,
              fontSize: 'clamp(23px, 2.4vh + 0.8vw, 42px)',
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              fontWeight: 600,
              margin: '0 0 clamp(10px, 1.8vh, 18px)',
              textWrap: 'pretty'
            } as CSSProperties}
          >
            {stage.headline}
          </h2>

          <p
            style={{
              fontSize: 'clamp(13px, 1.55vh, 15px)',
              lineHeight: 1.6,
              color: color.textMuted,
              margin: '0 0 clamp(14px, 2.6vh, 26px)',
              maxWidth: 385,
              textWrap: 'pretty'
            } as CSSProperties}
          >
            {stage.body}
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              background: 'oklch(100% 0 0 / 0.08)',
              borderRadius: 10,
              overflow: 'hidden'
            }}
          >
            {stage.rows.map((row) => (
              <div
                key={row.k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  padding: 'clamp(7px, 1.25vh, 11px) 14px',
                  background: color.surface
                }}
              >
                <span
                  style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    color: color.textDim
                  }}
                >
                  {row.k}
                </span>
                <span
                  style={{
                    fontFamily: font.display,
                    fontSize: 15,
                    fontWeight: 600,
                    color: row.accent
                  }}
                >
                  {row.v}
                </span>
              </div>
            ))}
          </div>

          {/* Stage 01 gets the live feed inside the copy column. */}
          {k === 0 ? children : null}
        </div>
      ))}
    </div>
  );
}
