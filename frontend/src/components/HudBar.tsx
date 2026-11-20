import { useRef, type CSSProperties } from 'react';
import { STAGE_STATUS } from '@/engine/palette';
import { useProgressEffect, type ProgressBus } from '@/hooks/useStageProgress';
import { color, font } from '@/styles/tokens';

const pill: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 7,
  fontFamily: font.mono,
  fontSize: 11,
  letterSpacing: '0.04em',
  color: 'oklch(64% 0.02 260)',
  background: 'oklch(100% 0 0 / 0.04)',
  border: '1px solid oklch(100% 0 0 / 0.08)',
  borderRadius: 100,
  padding: '6px 13px',
  whiteSpace: 'nowrap'
};

/** Top telemetry bar. Values tick imperatively from the progress bus. */
export function HudBar({ bus, blockedSeed = 2874120 }: { bus: ProgressBus; blockedSeed?: number }) {
  const queue = useRef<HTMLSpanElement | null>(null);
  const blocked = useRef<HTMLSpanElement | null>(null);
  const status = useRef<HTMLSpanElement | null>(null);
  const total = useRef(blockedSeed);

  useProgressEffect(bus, (af) => {
    if (queue.current) queue.current.textContent = `${(1.18 + af * 0.31).toFixed(2)} M`;
    total.current += Math.round(3 + Math.random() * 9);
    if (blocked.current) blocked.current.textContent = total.current.toLocaleString();
    if (status.current) status.current.textContent = STAGE_STATUS[Math.round(af)] ?? 'INGEST';
  });

  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        padding: '26px clamp(20px, 4vw, 56px)',
        pointerEvents: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 26,
            height: 26,
            background: 'linear-gradient(145deg, oklch(70% 0.17 250), oklch(62% 0.17 300))',
            clipPath: 'polygon(50% 0%, 100% 20%, 100% 65%, 50% 100%, 0% 65%, 0% 20%)'
          }}
        />
        <span
          style={{ fontFamily: font.display, fontSize: 15, fontWeight: 600, letterSpacing: '0.01em' }}
        >
          Triage Desk
        </span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 10.5,
            letterSpacing: '0.12em',
            color: color.textDim,
            borderLeft: '1px solid oklch(100% 0 0 / 0.14)',
            paddingLeft: 12
          }}
        >
          INDICATOR&nbsp;FIELD
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'flex-end'
        }}
      >
        <div style={pill}>
          QUEUE <span ref={queue} style={{ color: 'oklch(92% 0.008 260)' }}>0</span>
        </div>
        <div style={pill}>
          BLOCKED <span ref={blocked} style={{ color: 'oklch(80% 0.14 145)' }}>0</span>
        </div>
        <div style={{ ...pill, alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'oklch(78% 0.16 145)',
              animation: 'tf-blink 1.6s ease-in-out infinite'
            }}
          />
          <span ref={status}>INGEST</span>
        </div>
      </div>
    </header>
  );
}
