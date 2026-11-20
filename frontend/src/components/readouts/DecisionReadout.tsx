import type { DerivedAnalysis } from '@/types/analysis';
import { decisiveSignal, signalShares } from '@/lib/analysis';
import { Card, CardLabel, KeyValue, Meter, ReadoutHeader } from '../primitives';
import { color, font, riskColor, verdictColor } from '@/styles/tokens';

/** Stage 05 readout: contributing signals and the explainable verdict. */
export function DecisionReadout({ analysis }: { analysis: DerivedAnalysis }) {
  const D = analysis.raw.decision;
  const shares = signalShares(D.signals);
  const top = decisiveSignal(D.signals);
  const vc = verdictColor(analysis.verdict);

  return (
    <>
      <ReadoutHeader
        label="RISK ENGINE — SIGNAL CONVERGENCE"
        right="WEIGHTED · EXPLAINABLE"
        accent="oklch(78% 0.15 148)"
      />
      <div
        style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 8 }}
      >
        <Card>
          <CardLabel>CONTRIBUTING SIGNALS</CardLabel>
          {D.signals.map((s, i) => (
            <div
              key={s.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '96px 1fr 30px 66px',
                alignItems: 'center',
                gap: 8
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
                {s.label}
              </span>
              <Meter pct={s.score / 100} barColor={riskColor(s.score)} />
              <span
                style={{
                  fontFamily: font.display,
                  fontSize: 11,
                  fontWeight: 600,
                  color: riskColor(s.score),
                  textAlign: 'right'
                }}
              >
                {s.score}
              </span>
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: 8,
                  letterSpacing: '0.06em',
                  color: 'oklch(54% 0.02 260)',
                  textAlign: 'right',
                  whiteSpace: 'nowrap'
                }}
                title={`${(shares[i] * 100).toFixed(0)}% of weighted risk`}
              >
                {s.stage}
              </span>
            </div>
          ))}
        </Card>

        <Card accent="oklch(60% 0.16 22 / 0.4)">
          <CardLabel>FINAL DECISION</CardLabel>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: font.display,
                fontSize: 22,
                lineHeight: 1,
                fontWeight: 600,
                color: vc
              }}
            >
              {analysis.verdict}
            </span>
            <span
              style={{
                fontFamily: font.display,
                fontSize: 14,
                fontWeight: 600,
                color: 'oklch(92% 0.008 260)'
              }}
            >
              {analysis.risk}
            </span>
          </div>
          <Meter pct={analysis.risk / 100} barColor={vc} height={4} />
          <KeyValue k="DECISIVE SIGNAL" v={`${top.label} (${top.stage})`} />
          <KeyValue k="THRESHOLD" v={`\u2265 ${D.thresholds.malicious} malicious`} />
          <KeyValue k="MODEL" v={D.model ?? 'Random Forest'} />
        </Card>
      </div>
    </>
  );
}
