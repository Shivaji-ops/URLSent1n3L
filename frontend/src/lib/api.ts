/// <reference types="vite/client" />

/**
 * Thin client for the FastAPI backend (backend/app/main.py).
 * Override the base URL with VITE_API_URL in frontend/.env.
 */
export const API_BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface ScanResult {
  case_id: number | null;
  input: string;
  type: 'url' | 'ip';
  verdict: 'Malicious' | 'Benign' | string;
  confidence: number;
  attack_type: string | null;
  features: Record<string, unknown>;
  flagged_features: string[];
  scanned_at: string;
  /** The IP the URL resolved to (or the submitted IP), and what is known about it. */
  ip_info: IpInfo | null;
  /** 0..100 malicious risk per source; null where a source had nothing to score. */
  risk: { url_model: number | null; ip: number | null; combined: number | null } | null;
  /** Latest analyst decision on this same input from an earlier scan, if any. */
  analyst_action: { action: FeedbackAction; case_id: number; decided_at: string } | null;
}

export interface IpInfo {
  ip: string | null;
  all_ips?: string[];
  /** ok | private | unavailable | unresolved */
  status: string;
  country?: string | null;
  city?: string | null;
  isp?: string | null;
  asn?: string | null;
  is_proxy?: boolean;
  is_hosting?: boolean;
  is_tor?: boolean;
  abuse_score?: number | null;
  abuse_reports?: number | null;
  risk: number | null;
}

export type FeedbackAction = 'allow' | 'block' | 'escalate';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    });
  } catch {
    throw new Error(`Cannot reach the backend at ${API_BASE}. Is uvicorn running?`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function analyzeInput(input: string): Promise<ScanResult> {
  return request('/analyze', { method: 'POST', body: JSON.stringify({ input }) });
}

export function sendFeedback(
  caseId: number | null,
  action: FeedbackAction
): Promise<{ saved: boolean }> {
  return request('/feedback', { method: 'POST', body: JSON.stringify({ case_id: caseId, action }) });
}
