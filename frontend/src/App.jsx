import { useState, useEffect } from 'react'
import { analyzeIndicator, getHistory, submitFeedback } from './api/scanApi'
import { sampleScans } from './data/sampleScans'
import Header from './components/Header'
import ScanInput from './components/ScanInput'
import ScanProgress from './components/ScanProgress'
import VerdictPanel from './components/VerdictPanel'
import RecommendedAction from './components/RecommendedAction'
import EvidenceLog from './components/EvidenceLog'
import ThreatSummary from './components/ThreatSummary'
import CaseHistory from './components/CaseHistory'

export default function App() {
  const [isScanning, setIsScanning]   = useState(false)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState(null)
  const [history, setHistory]         = useState(sampleScans)
  const [historyIsLive, setHistoryIsLive] = useState(false)
  const [actionMsg, setActionMsg]     = useState(null)

  // Load real history from DB on mount
  useEffect(() => {
    getHistory()
      .then((rows) => { setHistory(rows); setHistoryIsLive(true) })
      .catch(() => {}) // fall back to sample data silently
  }, [])

  async function handleScan(input) {
    setIsScanning(true)
    setError(null)
    setResult(null)
    setActionMsg(null)
    try {
      const data = await analyzeIndicator(input)
      setResult(data)
      setHistory((prev) => [data, ...prev.slice(0, 49)])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsScanning(false)
    }
  }

  async function handleAction(action) {
    if (!result) return
    try {
      await submitFeedback(result.case_id, action)
    } catch (_) {}
    const labels = { allow: 'Allowed', block: 'Blocked', escalate: 'Escalated' }
    setActionMsg(`Case ${labels[action] || action}.`)
  }

  function handleSelectCase(entry) {
    setResult(entry)
    setError(null)
    setActionMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header totalCases={history.length} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col gap-5">

        {/* Scan input */}
        <div className="card overflow-hidden">
          <ScanInput onScan={handleScan} isScanning={isScanning} />
          <ScanProgress active={isScanning} />
        </div>

        {/* Error */}
        {error && (
          <div className="card px-5 py-4 border-threat/30 bg-red-50">
            <p className="font-mono text-sm text-threat">{error}</p>
          </div>
        )}

        {/* Action feedback */}
        {actionMsg && (
          <div className="card px-5 py-4 border-benign/30 bg-green-50">
            <p className="font-mono text-sm text-benign">{actionMsg}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Verdict + recommended action */}
            <div className="grid sm:grid-cols-[1fr_280px] gap-5">
              <VerdictPanel result={result} />
              <RecommendedAction result={result} onAction={handleAction} />
            </div>

            {/* Evidence + threat summary */}
            <div className="grid sm:grid-cols-2 gap-5">
              <EvidenceLog result={result} />
              <ThreatSummary result={result} />
            </div>
          </>
        )}

        {/* Case history */}
        <CaseHistory
          history={history}
          isLive={historyIsLive}
          onSelect={handleSelectCase}
        />

      </main>
    </div>
  )
}
