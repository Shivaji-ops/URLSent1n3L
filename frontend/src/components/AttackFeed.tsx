import { useEffect, useState } from 'react';
import type { AttackRoute } from '@/types/analysis';
import { color, font, severityColor } from '@/styles/tokens';

/**
 * Live attack feed for stage 01. Cycles source -> target country pairs.
 * A 1.5s interval is cheap enough for setState.
 */
export function AttackFeed({ routes, rows = 3 }: { routes: AttackRoute[]; rows?: number }) {
  const [at, setAt] = useState(0);

  useEffect(() => {
    if (!routes.length) return;
    const id = window.setInterval(() => setAt((v) => (v + 1) % routes.length), 1500);
    return () => clearInterval(id);
  }, [routes.length]);

  if (!routes.length) return null;

  return (
    <div
      style={{
        marginTop: 'clamp(8px, 1.4vh, 14px)',
        border: `1px solid ${color.hairline}`,
        borderRadius: 10,
        overflow: 'hidden',
        background: 'oklch(14% 0.015 262 / 0.55)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '7px 13px',
          borderBottom: '1px solid oklch(100% 0 0 / 0.08)'
        }}
      >
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 9.5,
            letterSpacing: '0.14em',
            color: 'oklch(64% 0.02 260)',
            whiteSpace: 'nowrap'
          }}
        >
          LIVE ATTACK FEED
        </span>
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: color.red,
            animation: 'tf-blink 1.4s ease-in-out infinite'
          }}
        />
      </div>

      {Array.from({ length: rows }).map((_, k) => {
        const r = routes[(at + k) % routes.length];
        return (
          <div
            key={k}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 13px',
              opacity: k === 0 ? 1 : 1 - k * 0.16
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: severityColor[r.severity],
                flexShrink: 0
              }}
            />
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 10.5,
                color: 'oklch(92% 0.008 260)',
                width: 64,
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              {r.fromCode} → {r.toCode}
            </span>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 10.5,
                color: 'oklch(66% 0.02 260)',
                whiteSpace: 'nowrap'
              }}
            >
              {r.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
