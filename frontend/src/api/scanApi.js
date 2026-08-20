// scanApi.js
// Calls the FastAPI /analyze and /history endpoints.
// Set VITE_API_URL in .env if your backend isn't on localhost:8000.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function analyzeIndicator(rawInput) {
  const res = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: rawInput }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Analysis failed — check the backend is running.')
  }
  return res.json()
}

export async function getHistory(limit = 20) {
  const res = await fetch(`${API_URL}/history?limit=${limit}`)
  if (!res.ok) throw new Error('History unavailable')
  return res.json()
}

export async function submitFeedback(caseId, action) {
  const res = await fetch(`${API_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ case_id: caseId, action }),
  })
  if (!res.ok) throw new Error('Feedback submission failed')
  return res.json()
}
