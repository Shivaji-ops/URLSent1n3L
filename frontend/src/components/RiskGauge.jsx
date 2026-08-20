import { useEffect, useState } from 'react'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function RiskGauge({ confidence, verdict }) {
  const [offset, setOffset] = useState(CIRCUMFERENCE)
  const isMalicious = verdict === 'Malicious'
  const color = isMalicious ? '#B93232' : '#1E6B45'

  useEffect(() => {
    const timer = setTimeout(() => {
      const fill = ((100 - confidence) / 100) * CIRCUMFERENCE
      setOffset(fill)
    }, 100)
    return () => clearTimeout(timer)
  }, [confidence])

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-36 h-36">
        <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
          {/* Track */}
          <circle
            cx="72" cy="72" r={RADIUS}
            fill="none" stroke="#D1DDD7" strokeWidth="10"
          />
          {/* Fill */}
          <circle
            cx="72" cy="72" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-bold text-2xl text-primary leading-none">
            {confidence}%
          </span>
          <span className="label mt-1">confidence</span>
        </div>
      </div>
      <span
        className="font-mono text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
        style={{
          backgroundColor: isMalicious ? '#FEF2F2' : '#F0FDF4',
          color,
        }}
      >
        {isMalicious ? 'High Risk' : 'Low Risk'}
      </span>
    </div>
  )
}
