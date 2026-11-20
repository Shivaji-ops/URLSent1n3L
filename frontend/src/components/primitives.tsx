import type { CSSProperties, ReactNode } from 'react';
import { color, font } from '@/styles/tokens';

/** Glass card used by every stage readout. */
export function Card({
  children,
  style,
  accent
}: {
  children: ReactNode;
  style?: CSSProperties;
  accent?: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${accent ?? color.hairline}`,
        borderRadius: 10,
        background: color.surfaceGlass,
        backdropFilter: 'blur(7px)',
        padding: '9px 11px',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        minWidth: 0,
        overflow: 'hidden',
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <span
      style={{
        fontFamily: font.mono,
        fontSize: 8.5,
        letterSpacing: '0.13em',
        color: accent ?? color.textFaint,
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </span>
  );
}

/** Key on the left, value on the right — the dense mono row. */
export function KeyValue({
  k,
  v,
  valueColor
}: {
  k: string;
  v: ReactNode;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
        minWidth: 0
      }}
    >
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 8.5,
          letterSpacing: '0.08em',
          color: color.textFaint,
          whiteSpace: 'nowrap'
        }}
      >
        {k}
      </span>
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 9.5,
          color: valueColor ?? 'oklch(88% 0.01 260)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {v}
      </span>
    </div>
  );
}

/** Magnitude bar. `pct` is 0..1. */
export function Meter({ pct, barColor, height = 3 }: { pct: number; barColor: string; height?: number }) {
  return (
    <span
      style={{
        height,
        borderRadius: 2,
        background: color.hairlineSoft,
        overflow: 'hidden',
        display: 'block'
      }}
    >
      <span
        style={{
          display: 'block',
          height: '100%',
          borderRadius: 2,
          background: barColor,
          width: `${Math.max(0, Math.min(1, pct)) * 100}%`,
          transition: 'width 420ms cubic-bezier(.2,.8,.2,1)'
        }}
      />
    </span>
  );
}

export function ReadoutHeader({
  label,
  right,
  accent
}: {
  label: string;
  right: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        overflow: 'hidden'
      }}
    >
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 9.5,
          letterSpacing: '0.16em',
          color: accent,
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 9,
          letterSpacing: '0.1em',
          color: color.textFaint,
          whiteSpace: 'nowrap'
        }}
      >
        {right}
      </span>
    </div>
  );
}
