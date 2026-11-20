import type { DerivedAnalysis, Severity } from '@/types/analysis';
import { Card, CardLabel, KeyValue, ReadoutHeader } from '../primitives';
import { color, font, severityColor } from '@/styles/tokens';

/** Stage 04 readout: selected node evidence + relationship legend. */
export function EnrichmentReadout({
  analysis,
  nodeId
}: {
  analysis: DerivedAnalysis;
  nodeId: string | null;
}) {
  const E = analysis.raw.enrichment;
  const node = E.nodes.find((n) => n.id === nodeId) ?? E.nodes[0];

  const counts = { malicious: 0, suspicious: 0, neutral: 0, new: 0 } as Record<Severity, number>;
  E.edges.forEach((e) => {
    counts[e.relationship] += 1;
  });

  return (
    <>
      <ReadoutHeader
        label="THREAT INTELLIGENCE GRAPH"
        right={`${E.nodes.length} NODES \u00b7 ${E.edges.length} EDGES`}
        accent={color.violet}
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr 0.85fr',
          gap: 8
        }}
      >
        <Card accent={`${severityColor[node.severity]}`}>
          <CardLabel accent={severityColor[node.severity]}>{node.type}</CardLabel>
          <span
            style={{
              fontFamily: font.display,
              fontSize: 13,
              fontWeight: 600,
              color: color.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {node.label}
          </span>
          {node.rows.map(([k, v]) => (
            <KeyValue key={k} k={k} v={v} />
          ))}
        </Card>

        <Card>
          <CardLabel>RELATIONSHIPS</CardLabel>
          {(
            [
              ['Malicious', 'malicious'],
              ['Suspicious', 'suspicious'],
              ['Newly found', 'new'],
              ['Neutral', 'neutral']
            ] as Array<[string, Severity]>
          ).map(([label, sev]) => (
            <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: severityColor[sev],
                  flexShrink: 0
                }}
              />
              <span style={{ fontFamily: font.mono, fontSize: 9.5, color: color.textDim }}>
                {label}
              </span>
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: 9.5,
                  color: 'oklch(86% 0.01 260)',
                  marginLeft: 'auto'
                }}
              >
                {counts[sev]}
              </span>
            </div>
          ))}
        </Card>

        <Card>
          <CardLabel>CORRELATION</CardLabel>
          <span
            style={{
              fontFamily: font.display,
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1,
              color: 'oklch(78% 0.14 300)'
            }}
          >
            {(E.confidence ?? 0).toFixed(2)}
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
            click any 3D node to inspect its evidence
          </span>
        </Card>
      </div>
    </>
  );
}
