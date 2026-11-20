import type {
  AnalysisResult,
  DerivedAnalysis,
  GlyphAnalysis,
  LexicalFeature,
  RiskSignal,
  Verdict
} from '@/types/analysis';
import { encodeHost } from './punycode';

/** Suspicious keywords counted as a lexical feature. */
export const SUSPICIOUS_KEYWORDS = [
  'login',
  'verify',
  'secure',
  'account',
  'update',
  'confirm',
  'signin',
  'bank'
];

/** Shannon entropy in bits per character. */
export function entropy(s: string): number {
  if (!s.length) return 0;
  const counts: Record<string, number> = {};
  for (const ch of s) counts[ch] = (counts[ch] ?? 0) + 1;
  let h = 0;
  for (const k in counts) {
    const p = counts[k] / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/**
 * The 13 lexical features the visualization displays. Extend this array and
 * both the 3D scene and the readout pick the new feature up automatically.
 */
export function extractFeatures(url: string): LexicalFeature[] {
  let u: URL | null = null;
  try {
    u = new URL(url);
  } catch {
    u = null;
  }
  const host = u ? u.hostname : url;
  const bits = host.split('.');
  const domain = bits.slice(-2).join('.');
  const sub = bits.slice(0, -2).join('.');
  const path = u ? u.pathname : '';
  const query = u ? u.search : '';
  const f = (name: string, value: number, max: number): LexicalFeature => ({ name, value, max });

  return [
    f('url_length', url.length, 120),
    f('domain_length', domain.length, 40),
    f('subdomain_count', sub ? sub.split('.').length : 0, 5),
    f('path_depth', path.split('/').filter(Boolean).length, 6),
    f('query_params', query ? query.slice(1).split('&').length : 0, 6),
    f('special_chars', (url.match(/[^\w:/.?=&-]/g) ?? []).length, 12),
    f('digit_count', (url.match(/\d/g) ?? []).length, 20),
    f('hyphen_count', (url.match(/-/g) ?? []).length, 6),
    f('entropy', Number(entropy(url).toFixed(2)), 6),
    f('host_entropy', Number(entropy(host).toFixed(2)), 5),
    f('suspicious_kw', SUSPICIOUS_KEYWORDS.filter((k) => url.toLowerCase().includes(k)).length, 4),
    f('https', u && u.protocol === 'https:' ? 1 : 0, 1),
    f('pct_encoded', (url.match(/%[0-9a-f]{2}/gi) ?? []).length, 6)
  ];
}

/** Per-character Unicode analysis of a suspect host. */
export function analyseGlyphs(
  suspect: string,
  confusables: Record<string, string>,
  names: Record<string, string> = {}
): GlyphAnalysis[] {
  return Array.from(suspect).map((char, index) => {
    const codePoint = char.codePointAt(0) as number;
    const nonAscii = codePoint > 127;
    const ascii = confusables[char] ?? (nonAscii ? null : char);
    return {
      index,
      char,
      codePoint,
      hex: 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0'),
      name: names[char] ?? (nonAscii ? 'NON-ASCII CODEPOINT' : 'LATIN / ASCII'),
      ascii,
      confusable: nonAscii && Boolean(confusables[char])
    };
  });
}

/** Weighted risk score, 0..100. Weights are normalised, so they need not sum to 1. */
export function computeRisk(signals: RiskSignal[]): number {
  const wsum = signals.reduce((a, s) => a + s.weight, 0) || 1;
  return Math.round(signals.reduce((a, s) => a + s.score * s.weight, 0) / wsum);
}

export function classify(
  risk: number,
  thresholds: { suspicious: number; malicious: number }
): Verdict {
  if (risk >= thresholds.malicious) return 'MALICIOUS';
  if (risk >= thresholds.suspicious) return 'SUSPICIOUS';
  return 'SAFE';
}

/** The signal that contributed most weighted risk — drives the explanation. */
export function decisiveSignal(signals: RiskSignal[]): RiskSignal {
  return signals.slice().sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
}

/** Normalised share of total weighted risk, per signal, as a 0..1 fraction. */
export function signalShares(signals: RiskSignal[]): number[] {
  const total = signals.reduce((a, s) => a + s.score * s.weight, 0) || 1;
  return signals.map((s) => (s.score * s.weight) / total);
}

/**
 * Turns a raw AnalysisResult into everything the UI and engine need.
 * Memoise this per result (see useDerivedAnalysis) — it is pure.
 */
export function deriveAnalysis(raw: AnalysisResult): DerivedAnalysis {
  const url = raw.extraction.url;
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  const host = parsed ? parsed.hostname : url;
  const bits = host.split('.');
  const H = raw.homograph;
  const glyphs = analyseGlyphs(H.suspect, H.confusables, H.names ?? {});
  const risk = computeRisk(raw.decision.signals);

  return {
    raw,
    url,
    parsed,
    host,
    domain: bits.slice(-2).join('.'),
    subdomain: bits.slice(0, -2).join('.'),
    path: parsed ? parsed.pathname : '',
    query: parsed ? parsed.search : '',
    features: extractFeatures(url),
    glyphs,
    punycode: encodeHost(H.suspect),
    firstConfusable: glyphs.findIndex((g) => g.confusable),
    skeleton: glyphs.map((g) => g.ascii ?? g.char).join(''),
    risk,
    verdict: classify(risk, raw.decision.thresholds)
  };
}
