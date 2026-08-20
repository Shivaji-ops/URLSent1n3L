import { useState, useEffect } from 'react'

const STEPS = [
  'Parsing indicator',
  'Extracting lexical features',
  'Checking allowlist',
  'Running classifier',
  'Generating verdict',
]

export default function ScanProgress({ active }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!active) { setStep(0); return }
    setStep(0)
    const t = setInterval(() => setStep((s) => (s < STEPS.length - 1 ? s + 1 : s)), 250)
    return () => clearInterval(t)
  }, [active])

  if (!active) return null

  return (
    <div className="px-6 py-4 border-b border-border bg-bg animate-fade-up">
      <p className="label mb-3">Analysis in progress</p>
      <div className="flex flex-col gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2.5 font-mono text-xs">
            <span className={`w-4 text-center transition-colors ${
              i < step  ? 'text-benign'  :
              i === step ? 'text-accent'  :
              'text-border'
            }`}>
              {i < step ? '✓' : i === step ? '›' : '·'}
            </span>
            <span className={i <= step ? 'text-primary' : 'text-border'}>
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
