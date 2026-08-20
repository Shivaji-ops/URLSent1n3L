function formatTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CaseHistory({ history, isLive, onSelect }) {
  return (
    <div className="card overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <p className="label">Case History</p>
        {!isLive && (
          <span className="label bg-bg px-2 py-1 rounded">Sample data</span>
        )}
      </div>

      {history.length === 0 ? (
        <p className="px-6 py-8 text-sm text-muted text-center">
          No cases filed yet — run your first scan above.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {history.map((entry, i) => {
            const isMalicious = entry.verdict === 'Malicious'
            return (
              <button
                key={entry.case_id ?? i}
                type="button"
                onClick={() => onSelect?.(entry)}
                className="w-full flex items-center gap-4 px-6 py-3.5 text-left
                           hover:bg-bg transition-colors"
              >
                {/* Verdict dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isMalicious ? '#B93232' : '#1E6B45' }}
                />

                {/* Input */}
                <span className="flex-1 font-mono text-sm text-primary truncate">
                  {entry.input}
                </span>

                {/* Attack type */}
                <span className="hidden sm:block font-mono text-xs text-muted w-24 text-right">
                  {entry.attack_type || '—'}
                </span>

                {/* Time */}
                <span className="hidden sm:block font-mono text-xs text-muted w-28 text-right">
                  {formatTime(entry.scanned_at)}
                </span>

                {/* Verdict badge */}
                <span
                  className="font-mono text-xs font-semibold uppercase tracking-wide
                             px-2.5 py-1 rounded shrink-0"
                  style={{
                    backgroundColor: isMalicious ? '#FEF2F2' : '#F0FDF4',
                    color: isMalicious ? '#B93232' : '#1E6B45',
                  }}
                >
                  {entry.verdict}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
