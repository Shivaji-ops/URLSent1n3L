export default function RecommendedAction({ result, onAction }) {
  const isMalicious = result.verdict === 'Malicious'
  const confidence  = result.confidence

  // Determine recommended action based on verdict + confidence
  let recommended, description
  if (isMalicious && confidence >= 80) {
    recommended = 'block'
    description = 'High confidence malicious indicator. Block immediately and do not deliver to recipient.'
  } else if (isMalicious && confidence < 80) {
    recommended = 'escalate'
    description = 'Potentially malicious but confidence is moderate. Escalate for manual review before deciding.'
  } else {
    recommended = 'allow'
    description = 'No malicious indicators detected. Safe to release to the recipient.'
  }

  const actions = [
    {
      key: 'allow',
      label: 'Allow',
      color: 'bg-benign text-white hover:bg-primary',
      outline: 'border-benign text-benign',
    },
    {
      key: 'block',
      label: 'Block',
      color: 'bg-threat text-white hover:bg-red-800',
      outline: 'border-threat text-threat',
    },
    {
      key: 'escalate',
      label: 'Escalate',
      color: 'bg-amber text-white hover:bg-yellow-700',
      outline: 'border-amber text-amber',
    },
  ]

  return (
    <div className="card p-6 animate-fade-up">
      <p className="label mb-3">Recommended Action</p>

      <p
        className="font-mono font-bold text-xl mb-1 capitalize"
        style={{
          color: recommended === 'allow' ? '#1E6B45' :
                 recommended === 'block' ? '#B93232' : '#C9922A',
        }}
      >
        {recommended === 'allow' ? 'Allow & Deliver' :
         recommended === 'block' ? 'Block & Quarantine' :
         'Escalate for Review'}
      </p>

      <p className="text-sm text-muted mb-5 leading-relaxed">{description}</p>

      <div className="flex gap-2">
        {actions.map(({ key, label, color, outline }) => (
          <button
            key={key}
            type="button"
            onClick={() => onAction?.(key)}
            className={`flex-1 font-mono text-xs uppercase tracking-[0.1em] py-2 rounded-lg
                        font-semibold border transition-colors
                        ${key === recommended ? color + ' border-transparent' : 'bg-transparent border ' + outline}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
