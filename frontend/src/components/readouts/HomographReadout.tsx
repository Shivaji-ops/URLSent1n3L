import type { DerivedAnalysis } from '@/types/analysis';
import { Card, CardLabel, ReadoutHeader } from '../primitives';
import { color, font } from '@/styles/tokens';

const GOOD = 'oklch(84% 0.15 148)';
const BAD = 'oklch(76% 0.18 22)';
const DIM = 'oklch(88% 0.01 260)';

/** Stage 03 readout: the inspected glyph plus the real Unicode pipeline. */
export function HomographReadout({
  analysis,
  charIndex,
  onSelectChar
}: {
  analysis: DerivedAnalysis;
  charIndex: number;
  onSelectChar: (i: number) => void;
}) {
  const G = analysis.glyphs[charIndex] ?? analysis.glyphs[0];
  const H = analysis.raw.homograph;
  const nonAscii = analysis.glyphs.filter((g) => g.codePoint > 127).length;
  const mapped = analysis.glyphs.filter((g) => g.confusable).length;
  const homoScore = analysis.raw.decision.signals.find((s) => s.key === 'homograph')?.score ?? 0;

  const steps: Array<{ k: string; v: string; dot: string; c: string }> = [
    { k: 'UNICODE DETECTION', v: `${nonAscii} non-ASCII`, dot: BAD, c: BAD },
    { k: 'PUNYCODE', v: analysis.punycode, dot: BAD, c: DIM },
    { k: 'CONFUSABLE MAPPING', v: `${mapped} mapped`, dot: BAD, c: DIM },
    { k: 'SKELETON', v: analysis.skeleton, dot: GOOD, c: GOOD },
    { k: 'BRAND MATCH', v: H.brand, dot: BAD, c: BAD },
    { k: 'SIMILARITY', v: H.brandSimilarity.toFixed(2), dot: BAD, c: DIM }
  ];

  return (
    <>
      <ReadoutHeader
        label="UNICODE / IDN ANALYZER"
        right="CLICK A 3D GLYPH"
        accent="oklch(74% 0.16 22)"
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '0.85fr 1.5fr 0.6fr',
          gap: 8
        }}
      >
        <Card accent={G.confusable ? 'oklch(50% 0.16 22 / 0.5)' : undefined}>
          <CardLabel>INSPECTED</CardLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 26,
                lineHeight: 1,
                color: G.confusable ? BAD : color.text
              }}
            >
              {G.char}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontFamily: font.mono, fontSize: 10, color: 'oklch(92% 0.008 260)' }}>
                {G.hex}
              </span>
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: 8.5,
                  color: color.textDim,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {G.name}
              </span>
            </div>
          </div>
          {/* Keyboard-accessible mirror of the 3D glyph picker. */}
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 'auto' }}>
            {analysis.glyphs.map((g) => (
              <button
                key={g.index}
                type="button"
                onClick={() => onSelectChar(g.index)}
                aria-label={`Inspect ${g.hex}`}
                aria-pressed={g.index === charIndex}
                style={{
                  fontFamily: font.mono,
                  fontSize: 11,
                  width: 12,
                  padding: '1px 0',
                  cursor: 'pointer',
                  borderRadius: 3,
                  border: `1px solid ${g.index === charIndex ? 'oklch(70% 0.14 255)' : 'transparent'}`,
                  background: g.confusable ? 'oklch(50% 0.16 22 / 0.2)' : 'transparent',
                  color: g.confusable ? BAD : color.textMuted
                }}
              >
                {g.char}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardLabel>HOMOGRAPH PIPELINE</CardLabel>
          {steps.map((s) => (
            <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 13 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: s.dot,
                  flexShrink: 0
                }}
              />
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: 8.5,
                  letterSpacing: '0.08em',
                  color: color.textFaint,
                  whiteSpace: 'nowrap'
                }}
              >
                {s.k}
              </span>
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: 9.5,
                  color: s.c,
                  marginLeft: 'auto',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {s.v}
              </span>
            </div>
          ))}
        </Card>

        <Card>
          <CardLabel>RISK</CardLabel>
          <span
            style={{
              fontFamily: font.display,
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1,
              color: 'oklch(72% 0.18 22)'
            }}
          >
            {homoScore}
          </span>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: 8.5,
              lineHeight: 1.45,
              color: color.textDim,
              marginTop: 'auto'
            }}
          >
            contribution to final decision
          </span>
        </Card>
      </div>
    </>
  );
}
