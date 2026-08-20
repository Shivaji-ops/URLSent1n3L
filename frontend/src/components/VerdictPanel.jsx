import RiskGauge from './RiskGauge'

function formatTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function formatCaseId(id) {
  if (!id && id !== 0) return null
  if (typeof id === 'number') return `CASE-${String(id).padStart(5, '0')}`
  if (String(id).startsWith('sample')) return null
  return `CASE-${id}`
}

export default function VerdictPanel({ result }) {
  const isMalicious = result.verdict === 'Malicious'
  const caseId = formatCaseId(result.case_id)
  const color = isMalicious ? '#B93232' : '#1E6B45'
  const bg    = isMalicious ? '#FEF2F2' : '#F0FDF4'

  return (
    <div className="card p-6 animate-fade-up">
      {/* Case ID */}
      {caseId && (
        <p className="font-mono text-xs text-muted mb-4">{caseId}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        {/* Gauge */}
        <RiskGauge confidence={result.confidence} verdict={result.verdict} />

        {/* Info */}
        <div className="flex-1 w-full">
          {/* Verdict badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4 animate-stamp-in"
            style={{ backgroundColor: bg }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono font-bold text-lg uppercase tracking-wider" style={{ color }}>
              {result.verdict}
            </span>
          </div>

          {/* Input */}
          <p className="font-mono text-sm text-muted break-all mb-5">{result.input}</p>

          {/* Meta grid */}
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <div>
              <dt className="label mb-1">Type</dt>
              <dd className="font-mono text-sm font-semibold text-primary uppercase">{result.type}</dd>
            </div>
            <div>
              <dt className="label mb-1">Attack Type</dt>
              <dd className="font-mono text-sm font-semibold" style={{ color: result.attack_type ? color : '#6B8070' }}>
                {result.attack_type || '—'}
              </dd>
            </div>
            <div>
              <dt className="label mb-1">Filed</dt>
              <dd className="font-mono text-sm text-primary">{formatTime(result.scanned_at)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
