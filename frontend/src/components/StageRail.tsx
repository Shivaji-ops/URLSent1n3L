import { useRef } from 'react';
import { STAGE_HUE, STAGE_NAMES } from '@/engine/palette';
import { useProgressEffect, type ProgressBus } from '@/hooks/useStageProgress';
import { color, font } from '@/styles/tokens';

/**
 * The pipeline navigation: completed / active / pending, plus a fill rail and
 * a processing-state readout. Driven imperatively — zero renders per frame.
 */
export function StageRail({ bus, onGoTo }: { bus: ProgressBus; onGoTo: (stage: number) => void }) {
  const fill = useRef<HTMLDivElement | null>(null);
  const dots = useRef<Array<HTMLSpanElement | null>>([]);
  const state = useRef<HTMLDivElement | null>(null);

  useProgressEffect(bus, (af) => {
    const near = Math.max(0, Math.min(4, Math.round(af)));

    if (fill.current) {
      fill.current.style.height = `${((af / 4) * 100).toFixed(1)}%`;
      fill.current.style.boxShadow = `0 0 12px oklch(70% 0.16 ${STAGE_HUE[near]} / 0.55)`;
    }
    if (state.current) {
      state.current.textContent = `STAGE ${near + 1}/5 \u00b7 ${STAGE_NAMES[near]}`;
      state.current.style.color = `oklch(74% 0.13 ${STAGE_HUE[near]})`;
    }
    dots.current.forEach((el, k) => {
      if (!el) return;
      const active = Math.abs(af - k) < 0.5;
      const done = af - k >= 0.5;
      el.style.background = active
        ? `linear-gradient(135deg, oklch(80% 0.15 ${STAGE_HUE[k]}), oklch(64% 0.17 ${STAGE_HUE[k]}))`
        : done
          ? `oklch(52% 0.09 ${STAGE_HUE[k]})`
          : color.bg;
      el.style.borderColor = active || done ? 'transparent' : 'oklch(100% 0 0 / 0.3)';
      el.style.transform = active ? 'scale(1.35)' : 'scale(1)';
      el.style.boxShadow = active ? `0 0 13px oklch(72% 0.16 ${STAGE_HUE[k]} / 0.6)` : 'none';
    });
  });

  return (
    <nav
      aria-label="Analysis pipeline"
      style={{
        position: 'absolute',
        right: 'clamp(18px, 3vw, 44px)',
        top: '50%',
        transform: 'translateY(-50%)',
        height: 300,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 4,
          top: 4,
          bottom: 4,
          width: 1,
          background: 'oklch(100% 0 0 / 0.12)'
        }}
      />
      <div
        ref={fill}
        style={{
          position: 'absolute',
          right: 4,
          top: 4,
          width: 1,
          height: 0,
          background: 'linear-gradient(oklch(72% 0.16 255), oklch(70% 0.16 300))'
        }}
      />
      <div
        ref={state}
        style={{
          position: 'absolute',
          right: 22,
          top: 318,
          fontFamily: font.mono,
          fontSize: 9,
          letterSpacing: '0.14em',
          color: color.blue,
          whiteSpace: 'nowrap'
        }}
      >
        STAGE 1/5
      </div>

      {STAGE_NAMES.map((name, k) => (
        <button
          key={name}
          type="button"
          onClick={() => onGoTo(k)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: font.mono,
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'oklch(60% 0.02 260)',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'oklch(92% 0.01 260)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'oklch(60% 0.02 260)';
          }}
        >
          {name}
          <span
            ref={(el) => {
              dots.current[k] = el;
            }}
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              border: '1px solid oklch(100% 0 0 / 0.3)',
              background: color.bg,
              transition:
                'transform 280ms cubic-bezier(.2,.8,.2,1), box-shadow 280ms ease, background 280ms ease'
            }}
          />
        </button>
      ))}
    </nav>
  );
}
