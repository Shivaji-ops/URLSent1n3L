import { useState, useEffect } from 'react'

export default function Header({ totalCases }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const clock = time.toLocaleTimeString('en-IN', { hour12: false })
  const date  = time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-surface border-b border-border">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
            <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
            <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.9"/>
          </svg>
        </div>
        <div>
          <h1 className="font-mono font-bold text-base text-primary leading-none">Triage Desk</h1>
          <p className="label mt-0.5">Indicator Classification System</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-6">
        <div className="hidden sm:block text-right">
          <p className="font-mono text-xs text-muted">{date}</p>
          <p className="font-mono text-sm font-semibold text-primary">{clock}</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="label">Cases on file</p>
          <p className="font-mono font-bold text-primary text-sm">{totalCases}</p>
        </div>
        <div className="flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-benign animate-pulse-dot" />
          <span className="font-mono text-xs text-primary font-medium">System Online</span>
        </div>
      </div>
    </header>
  )
}
