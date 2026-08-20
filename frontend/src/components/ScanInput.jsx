import { useState } from 'react'

const QUICK_CHIPS = [
  'youtube.com',
  'paypal-update.co',
  '185.220.101.47',
  'bit.ly/3xK9q',
  'github.com',
]

export default function ScanInput({ onScan, isScanning }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!value.trim() || isScanning) return
    onScan(value.trim())
  }

  function handleChip(chip) {
    if (isScanning) return
    setValue(chip)
    onScan(chip)
  }

  return (
    <div className="px-6 py-5 bg-surface border-b border-border">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter a URL or IP address to scan..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border rounded-lg
                       font-mono text-sm text-primary placeholder:text-muted
                       focus:border-accent focus:bg-surface outline-none transition-colors"
          />
        </div>
        <button type="submit" disabled={isScanning} className="btn-primary">
          {isScanning ? 'Scanning…' : 'Scan'}
        </button>
      </form>

      {/* Quick chips */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="label">Try:</span>
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChip(chip)}
            disabled={isScanning}
            className="font-mono text-xs text-muted border border-border rounded-full
                       px-3 py-1 hover:border-accent hover:text-accent transition-colors
                       disabled:opacity-40"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
