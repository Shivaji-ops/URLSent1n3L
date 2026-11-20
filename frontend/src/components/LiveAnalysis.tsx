import { useState, type CSSProperties, type FormEvent } from 'react';
import { analyzeInput, sendFeedback, type FeedbackAction, type IpInfo, type ScanResult } from '@/lib/api';
import { color, font, riskColor, verdictColor } from '@/styles/tokens';

const panel: CSSProperties = {
  background: color.surfaceGlass,
  border: `1px solid ${color.hairline}`,
  borderRadius: 16,
  padding: 'clamp(18px, 3vw, 28px)'
};

const label: CSSProperties = {
  fontFamily: font.mono,
  fontSize: 10.5,
  letterSpacing: '0.12em',
  color: color.textDim
};

function toVerdict(v: string): 'SAFE' | 'MALICIOUS' {
  return v.toLowerCase() === 'malicious' ? 'MALICIOUS' : 'SAFE';
}

function isBlocked(r: ScanResult): boolean {
  return r.analyst_action?.action === 'block';
}

/** Badge text: an analyst block outranks the model verdict. */
function verdictLabel(r: ScanResult): string {
  return isBlocked(r) ? 'BLOCKED' : toVerdict(r.verdict);
}

function formatValue(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  if (v === null || v === undefined) return '—';
  return String(v);
}

/** Live checker: posts a URL or IP to the backend and shows the verdict. */
export function LiveAnalysis({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const r = await analyzeInput(value);
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const act = async (action: FeedbackAction) => {
    if (!result) return;
    try {
      const r = await sendFeedback(result.case_id, action);
      if (r.saved && result.case_id != null) {
        const decided: ScanResult = {
          ...result,
          analyst_action: { action, case_id: result.case_id, decided_at: new Date().toISOString() }
        };
        setResult(decided);
        setHistory((h) => h.map((x) => (x === result ? decided : x)));
      }
      setFeedback(r.saved ? `Recorded: ${action}` : `Marked ${action} (not persisted — no database)`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Feedback failed');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(120% 80% at 50% 0%, ${color.surface}, ${color.bgDeep})`,
        color: color.text,
        fontFamily: font.body
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '26px clamp(20px, 4vw, 56px)'
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
          <span style={{ fontFamily: font.display, fontSize: 15, fontWeight: 600 }}>Triage Desk</span>
          <span style={{ ...label, borderLeft: `1px solid ${color.hairline}`, paddingLeft: 12 }}>
            LIVE&nbsp;ANALYSIS
          </span>
        </div>
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: '0.04em',
            color: color.textMuted,
            background: 'oklch(100% 0 0 / 0.04)',
            border: '1px solid oklch(100% 0 0 / 0.12)',
            borderRadius: 100,
            padding: '6px 13px',
            cursor: 'pointer'
          }}
        >
          ← BACK TO FIELD
        </button>
      </header>

      <main
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '24px clamp(16px, 4vw, 32px) 64px',
          display: 'grid',
          gap: 20
        }}
      >
        <div>
          <h1 style={{ fontFamily: font.display, fontSize: 'clamp(26px, 4vw, 36px)', margin: '0 0 6px' }}>
            Live URL Analysis
          </h1>
          <p style={{ margin: 0, color: color.textMuted }}>
            Paste a URL or IPv4 address to classify it against the URLSentinel model.
          </p>
        </div>

        <form onSubmit={submit} style={{ ...panel, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://example.com/login  or  45.133.1.87"
            autoFocus
            spellCheck={false}
            style={{
              flex: '1 1 320px',
              minWidth: 0,
              fontFamily: font.mono,
              fontSize: 14,
              color: color.text,
              background: color.bgDeep,
              border: `1px solid ${color.hairline}`,
              borderRadius: 10,
              padding: '12px 14px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: color.text,
              background: 'linear-gradient(135deg, oklch(62% 0.17 250), oklch(56% 0.17 300))',
              border: 'none',
              borderRadius: 10,
              padding: '12px 22px',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading || !input.trim() ? 0.55 : 1
            }}
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </form>

        {error && (
          <div style={{ ...panel, borderColor: 'oklch(70% 0.19 22 / 0.5)', color: color.red }}>{error}</div>
        )}

        {result && <ResultPanel result={result} onAction={act} feedback={feedback} />}

        {history.length > 1 && (
          <section style={panel}>
            <div style={{ ...label, marginBottom: 12 }}>THIS SESSION</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {history.map((h, i) => {
                const v = toVerdict(h.verdict);
                return (
                  <button
                    key={`${h.scanned_at}-${i}`}
                    type="button"
                    onClick={() => {
                      setResult(h);
                      setFeedback(null);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      textAlign: 'left',
                      background: 'transparent',
                      border: `1px solid ${color.hairlineSoft}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    <span
                      style={{
                        fontFamily: font.mono,
                        fontSize: 12.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {h.input}
                    </span>
                    <span style={{ fontFamily: font.mono, fontSize: 11, color: verdictColor(v) }}>
                      {verdictLabel(h)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ResultPanel({
  result,
  onAction,
  feedback
}: {
  result: ScanResult;
  onAction: (a: FeedbackAction) => void;
  feedback: string | null;
}) {
  const v = toVerdict(result.verdict);
  const tint = verdictColor(v);
  const flagged = new Set(result.flagged_features);
  const entries = Object.entries(result.features);

  return (
    <section style={{ ...panel, display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            fontFamily: font.display,
            fontSize: 28,
            fontWeight: 700,
            color: tint,
            border: `1px solid ${tint}`,
            borderRadius: 12,
            padding: '6px 16px'
          }}
        >
          {verdictLabel(result)}
        </div>
        <div style={{ display: 'grid', gap: 4, minWidth: 0, flex: 1 }}>
          <span style={{ fontFamily: font.mono, fontSize: 13, wordBreak: 'break-all' }}>{result.input}</span>
          <span style={label}>
            {result.type.toUpperCase()} · CONFIDENCE {result.confidence}%
            {result.attack_type ? ` · ${result.attack_type.toUpperCase()}` : ''}
            {result.case_id != null ? ` · CASE #${result.case_id}` : ''}
          </span>
        </div>
      </div>

      {result.analyst_action && (
        <div
          style={{
            fontSize: 13,
            color: isBlocked(result) ? color.red : color.textMuted,
            background: isBlocked(result) ? 'oklch(70% 0.19 22 / 0.1)' : 'oklch(100% 0 0 / 0.04)',
            border: `1px solid ${isBlocked(result) ? 'oklch(70% 0.19 22 / 0.4)' : color.hairline}`,
            borderRadius: 10,
            padding: '10px 14px'
          }}
        >
          {isBlocked(result) ? 'Blocked' : `Marked “${result.analyst_action.action}”`} by an analyst on case #
          {result.analyst_action.case_id} · {new Date(result.analyst_action.decided_at).toLocaleString()}
        </div>
      )}

      <div style={{ height: 6, borderRadius: 6, background: color.hairline, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, result.confidence)}%`, height: '100%', background: tint }} />
      </div>

      {result.risk && <RiskBreakdown risk={result.risk} />}

      {result.ip_info && <IpCard info={result.ip_info} />}

      {entries.length > 0 && (
        <div>
          <div style={{ ...label, marginBottom: 10 }}>
            FEATURES{flagged.size ? ` · ${flagged.size} FLAGGED` : ''}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 6
            }}
          >
            {entries.map(([k, val]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontFamily: font.mono,
                  fontSize: 12,
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: flagged.has(k) ? 'oklch(70% 0.19 22 / 0.12)' : 'oklch(100% 0 0 / 0.03)',
                  border: `1px solid ${flagged.has(k) ? 'oklch(70% 0.19 22 / 0.4)' : color.hairlineSoft}`
                }}
              >
                <span style={{ color: flagged.has(k) ? color.red : color.textMuted }}>{k}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatValue(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span style={{ ...label, marginRight: 4 }}>ANALYST ACTION</span>
        {(['allow', 'block', 'escalate'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onAction(a)}
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'capitalize',
              background: 'oklch(100% 0 0 / 0.05)',
              border: '1px solid oklch(100% 0 0 / 0.14)',
              borderRadius: 100,
              padding: '7px 16px',
              cursor: 'pointer'
            }}
          >
            {a}
          </button>
        ))}
        {feedback && <span style={{ fontSize: 13, color: color.textMuted }}>{feedback}</span>}
      </div>
    </section>
  );
}

function RiskBreakdown({ risk }: { risk: NonNullable<ScanResult['risk']> }) {
  const rows: Array<[string, number | null, string]> = [
    ['URL MODEL', risk.url_model, '75%'],
    ['IP DATA', risk.ip, '25%'],
    ['COMBINED', risk.combined, '']
  ];
  return (
    <div>
      <div style={{ ...label, marginBottom: 10 }}>MALICIOUS RISK</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map(([name, value, weight]) => (
          <div
            key={name}
            style={{ display: 'grid', gridTemplateColumns: '110px 1fr 64px', alignItems: 'center', gap: 12 }}
          >
            <span style={{ ...label, color: name === 'COMBINED' ? color.text : color.textDim }}>
              {name}
              {weight && value != null ? <span style={{ color: color.textFaint }}> ×{weight}</span> : null}
            </span>
            <div style={{ height: 6, borderRadius: 6, background: color.hairline, overflow: 'hidden' }}>
              {value != null && (
                <div style={{ width: `${value}%`, height: '100%', background: riskColor(value) }} />
              )}
            </div>
            <span style={{ fontFamily: font.mono, fontSize: 12, textAlign: 'right' }}>
              {value != null ? value : 'n/a'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const IP_STATUS_TEXT: Record<string, string> = {
  unresolved: 'Domain does not resolve to any IP — dead, taken down, or never registered.',
  private: 'Private / internal address — no public intelligence available.',
  unavailable: 'IP lookup services were unreachable — scored on the URL alone.'
};

function IpCard({ info }: { info: IpInfo }) {
  // Hosting is normal for websites, so it reads as a note rather than a threat.
  const tags: Array<[string, boolean, string]> = [
    ['TOR EXIT', Boolean(info.is_tor), color.red],
    ['PROXY / VPN', Boolean(info.is_proxy), color.red],
    ['HOSTING', Boolean(info.is_hosting), color.amber]
  ];
  const rows: Array<[string, string]> = [
    ['IP', info.ip ?? '—'],
    ['LOCATION', [info.city, info.country].filter(Boolean).join(', ') || '—'],
    ['ISP', info.isp ?? '—'],
    ['ASN', info.asn ?? '—'],
    [
      'ABUSE REPORTS',
      info.abuse_score == null
        ? 'not configured'
        : `${info.abuse_score}% confidence · ${info.abuse_reports ?? 0} reports`
    ]
  ];
  const others = (info.all_ips ?? []).filter((ip) => ip !== info.ip);

  return (
    <div>
      <div style={{ ...label, marginBottom: 10 }}>IP DATA</div>
      {info.status !== 'ok' ? (
        <div
          style={{
            fontSize: 13,
            color: color.textMuted,
            border: `1px solid ${color.hairline}`,
            borderRadius: 10,
            padding: '10px 14px'
          }}
        >
          {info.ip && <span style={{ fontFamily: font.mono, color: color.text }}>{info.ip} · </span>}
          {IP_STATUS_TEXT[info.status] ?? info.status}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 6
            }}
          >
            {rows.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontFamily: font.mono,
                  fontSize: 12,
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: 'oklch(100% 0 0 / 0.03)',
                  border: `1px solid ${color.hairlineSoft}`
                }}
              >
                <span style={{ color: color.textMuted }}>{k}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map(([t, on, tint]) => (
              <span
                key={t}
                style={{
                  fontFamily: font.mono,
                  fontSize: 10.5,
                  letterSpacing: '0.08em',
                  padding: '4px 10px',
                  borderRadius: 100,
                  color: on ? tint : color.textFaint,
                  border: `1px solid ${on ? tint : color.hairlineSoft}`
                }}
              >
                {t}: {on ? 'YES' : 'NO'}
              </span>
            ))}
          </div>
          {others.length > 0 && (
            <span style={{ ...label, letterSpacing: '0.04em' }}>ALSO RESOLVES TO {others.join(' · ')}</span>
          )}
        </div>
      )}
    </div>
  );
}
