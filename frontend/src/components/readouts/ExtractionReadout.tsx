import type { DerivedAnalysis } from '@/types/analysis';
import { Card, CardLabel, KeyValue, Meter, ReadoutHeader } from '../primitives';
import { color, font } from '@/styles/tokens';

const SHOWN = [
  'url_length',
  'entropy',
  'hyphen_count',
  'digit_count',
  'suspicious_kw',
  'subdomain_count'
];

/** Stage 02 readout: parsed components, computed features, feature vector. */
export function ExtractionReadout({ analysis }: { analysis: DerivedAnalysis }) {
  const u = analysis.parsed;
  const parts: Array<{ label: string; value: string; c: string }> = [
    { label: 'PROTOCOL', value: u ? u.protocol.replace(':', '') : '\u2014', c: 'oklch(64% 0.1 260)' },
    { label: 'SUBDOMAIN', value: analysis.subdomain || '\u2014', c: 'oklch(70% 0.15 255)' },
    { label: 'DOMAIN', value: analysis.domain, c: 'oklch(88% 0.02 260)' },
    { label: 'PATH', value: analysis.path || '/', c: 'oklch(68% 0.15 300)' },
    { label: 'QUERY', value: analysis.query ? analysis.query.slice(1) : '\u2014', c: 'oklch(72% 0.15 70)' }
  ];

  const shown = analysis.features.filter((f) => SHOWN.includes(f.name));
  const cells = analysis.features.concat(analysis.features.slice(0, 6));

  return (
    <>
      <ReadoutHeader
        label="URL PARSER → FEATURE VECTOR"
        right="LEXICAL ENGINE v4"
        accent={color.blue}
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1.05fr 1.25fr 0.7fr',
          gap: 8
        }}
      >
        <Card>
          <CardLabel>COMPONENTS</CardLabel>
          {parts.map((p) => (
            <KeyValue key={p.label} k={p.label} v={p.value} valueColor={p.c} />
          ))}
        </Card>

        <Card>
          <CardLabel>EXTRACTED FEATURES</CardLabel>
          {shown.map((f) => {
            const ratio = Math.max(0.06, Math.min(1, f.value / f.max));
            const barColor =
              ratio > 0.66
                ? 'oklch(70% 0.17 30)'
                : ratio > 0.33
                  ? 'oklch(76% 0.14 70)'
                  : 'oklch(72% 0.13 255)';
            return (
              <div
                key={f.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '92px 1fr 34px',
                  alignItems: 'center',
                  gap: 7
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
                  {f.name}
                </span>
                <Meter pct={ratio} barColor={barColor} />
                <span
                  style={{
                    fontFamily: font.mono,
                    fontSize: 9.5,
                    color: 'oklch(90% 0.008 260)',
                    textAlign: 'right'
                  }}
                >
                  {f.value}
                </span>
              </div>
            );
          })}
        </Card>

        <Card>
          <CardLabel>VECTOR</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
            {cells.map((f, i) => {
              const r = Math.max(0.05, Math.min(1, f.value / f.max));
              return (
                <span
                  key={i}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 2,
                    border: `1px solid ${color.hairlineSoft}`,
                    background: `oklch(${(26 + r * 46).toFixed(0)}% ${(0.03 + r * 0.14).toFixed(3)} ${(255 - r * 60).toFixed(0)})`,
                    display: 'block'
                  }}
                />
              );
            })}
          </div>
          <CardLabel>DIM {cells.length} · F32</CardLabel>
          <span style={{ fontFamily: font.mono, fontSize: 9, color: 'oklch(78% 0.13 255)' }}>
            → RANDOM FOREST
          </span>
        </Card>
      </div>
    </>
  );
}
