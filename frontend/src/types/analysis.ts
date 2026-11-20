/**
 * The single contract between backend and every visualization.
 *
 * Nothing in the UI or the render engine reads anything outside this shape,
 * so swapping the mock for a real API response requires no UI changes.
 */

export type Severity = 'malicious' | 'suspicious' | 'neutral' | 'new';

export type StageId = 'exposure' | 'extraction' | 'homograph' | 'enrichment' | 'decision';

/** Stage 01 — global threat landscape. */
export interface ExposureData {
  /** Great-circle attack routes rendered on the globe. */
  routes: AttackRoute[];
  /** Header telemetry. */
  queueMillions?: number;
  blockedToday?: number;
}

export interface AttackRoute {
  /** [latitude, longitude] of the attack origin. */
  from: [number, number];
  /** [latitude, longitude] of the target. */
  to: [number, number];
  /** ISO country codes, shown in the live feed. */
  fromCode: string;
  toCode: string;
  /** Human-readable vector, e.g. "Credential phishing". */
  label: string;
  /** Drives colour + sprite. */
  severity: Severity;
}

/** Stage 02 — the raw indicator. Features are DERIVED, never sent. */
export interface ExtractionData {
  url: string;
}

/** Stage 03 — Unicode / IDN analysis inputs. */
export interface HomographData {
  /** The ASCII domain the suspect is imitating, for side-by-side display. */
  legitimate: string;
  /** The indicator as received, including any non-ASCII codepoints. */
  suspect: string;
  /** Brand the skeleton resolves to. */
  brand: string;
  /** Optional human names per codepoint (falls back to a generic label). */
  names?: Record<string, string>;
  /** Unicode confusable map: non-ASCII glyph -> ASCII skeleton character. */
  confusables: Record<string, string>;
  /** 0..1 similarity against the matched brand. */
  brandSimilarity: number;
}

/** Stage 04 — threat-intelligence graph. Extensible: add nodes, not code. */
export interface EnrichmentData {
  nodes: IntelNode[];
  edges: IntelEdge[];
  /** Overall correlation confidence, 0..1, shown in the readout. */
  confidence?: number;
}

export interface IntelNode {
  id: string;
  label: string;
  /** Entity type, e.g. 'IP ADDRESS', 'CAMPAIGN', 'PASSIVE DNS'. */
  type: string;
  severity: Severity;
  /** 0 = the analysed indicator, 1 = direct evidence, 2 = correlated intel. */
  ring: 0 | 1 | 2;
  /** Key/value evidence rows shown when the node is selected. */
  rows: Array<[string, string]>;
}

export interface IntelEdge {
  source: string;
  target: string;
  relationship: Severity;
}

/** Stage 05 — explainable decision. */
export interface DecisionData {
  thresholds: { suspicious: number; malicious: number };
  signals: RiskSignal[];
  /** Optional model name for the readout. */
  model?: string;
}

export interface RiskSignal {
  key: string;
  label: string;
  /** 0..100. */
  score: number;
  /** Relative weight; need not sum to 1 (normalised at read time). */
  weight: number;
  /** Which pipeline stage produced this evidence. */
  stage: 'EXPOSURE' | 'EXTRACTION' | 'HOMOGRAPH' | 'ENRICHMENT' | 'DECISION';
}

export interface AnalysisResult {
  exposure: ExposureData;
  extraction: ExtractionData;
  homograph: HomographData;
  enrichment: EnrichmentData;
  decision: DecisionData;
}

export type Verdict = 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';

/* ---------- derived view models (computed client-side, never fetched) ---------- */

export interface LexicalFeature {
  name: string;
  value: number;
  /** Upper bound used to normalise the magnitude bar. */
  max: number;
}

export interface GlyphAnalysis {
  index: number;
  char: string;
  codePoint: number;
  /** e.g. "U+0430". */
  hex: string;
  name: string;
  /** ASCII skeleton character, or null for unmapped non-ASCII. */
  ascii: string | null;
  confusable: boolean;
}

export interface DerivedAnalysis {
  raw: AnalysisResult;
  url: string;
  parsed: URL | null;
  host: string;
  domain: string;
  subdomain: string;
  path: string;
  query: string;
  features: LexicalFeature[];
  glyphs: GlyphAnalysis[];
  /** Punycode form of the suspect host (RFC 3492). */
  punycode: string;
  /** Index of the first confusable glyph, or -1. */
  firstConfusable: number;
  /** Reconstructed ASCII skeleton. */
  skeleton: string;
  risk: number;
  verdict: Verdict;
}
