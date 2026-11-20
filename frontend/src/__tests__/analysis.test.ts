import { describe, expect, it } from 'vitest';
import {
  classify,
  computeRisk,
  decisiveSignal,
  deriveAnalysis,
  entropy,
  extractFeatures,
  signalShares
} from '@/lib/analysis';
import { encodeLabel } from '@/lib/punycode';
import { MOCK_ANALYSIS } from '@/lib/mockAnalysis';

describe('entropy', () => {
  it('is zero for a single repeated character', () => {
    expect(entropy('aaaa')).toBe(0);
  });

  it('is 1 bit for two equally likely characters', () => {
    expect(entropy('abab')).toBeCloseTo(1, 10);
  });

  it('is 2 bits for four equally likely characters', () => {
    expect(entropy('abcd')).toBeCloseTo(2, 10);
  });
});

describe('punycode', () => {
  it('passes ASCII labels through untouched', () => {
    expect(encodeLabel('example')).toBe('example');
  });

  it('encodes a Cyrillic homograph label', () => {
    // "аpple-id-verify" with U+0430 in the first position.
    const out = encodeLabel('\u0430pple-id-verify');
    expect(out.startsWith('xn--')).toBe(true);
    expect(out).toContain('pple-id-verify');
  });

  it('matches the reference vector for bücher', () => {
    expect(encodeLabel('b\u00fccher')).toBe('xn--bcher-kva');
  });
});

describe('feature extraction', () => {
  const features = extractFeatures('https://secure-login.example.com/account/verify?id=9281');
  const get = (name: string) => features.find((f) => f.name === name)!;

  it('counts structural properties', () => {
    expect(get('subdomain_count').value).toBe(1);
    expect(get('path_depth').value).toBe(2);
    expect(get('query_params').value).toBe(1);
    expect(get('hyphen_count').value).toBe(1);
    expect(get('https').value).toBe(1);
  });

  it('finds suspicious keywords', () => {
    // secure, login, account, verify
    expect(get('suspicious_kw').value).toBe(4);
  });

  it('never emits a feature above its declared max', () => {
    features.forEach((f) => expect(f.value).toBeLessThanOrEqual(f.max));
  });
});

describe('risk engine', () => {
  const signals = MOCK_ANALYSIS.decision.signals;

  it('computes a weighted score', () => {
    expect(computeRisk(signals)).toBe(80);
  });

  it('normalises weights that do not sum to 1', () => {
    const doubled = signals.map((s) => ({ ...s, weight: s.weight * 2 }));
    expect(computeRisk(doubled)).toBe(computeRisk(signals));
  });

  it('classifies against thresholds', () => {
    const t = { suspicious: 40, malicious: 70 };
    expect(classify(80, t)).toBe('MALICIOUS');
    expect(classify(55, t)).toBe('SUSPICIOUS');
    expect(classify(12, t)).toBe('SAFE');
  });

  it('identifies the decisive signal', () => {
    expect(decisiveSignal(signals).key).toBe('homograph');
  });

  it('produces shares that sum to 1', () => {
    const sum = signalShares(signals).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('deriveAnalysis', () => {
  const A = deriveAnalysis(MOCK_ANALYSIS);

  it('parses the indicator', () => {
    expect(A.domain).toBe('example.com');
    expect(A.subdomain).toBe('secure-login');
    expect(A.path).toBe('/account/verify');
  });

  it('flags the homograph at index 0 and rebuilds the ASCII skeleton', () => {
    expect(A.firstConfusable).toBe(0);
    expect(A.glyphs[0].hex).toBe('U+0430');
    expect(A.skeleton).toBe('apple-id-verify.com');
  });

  it('reaches a MALICIOUS verdict', () => {
    expect(A.verdict).toBe('MALICIOUS');
    expect(A.risk).toBe(80);
  });
});
