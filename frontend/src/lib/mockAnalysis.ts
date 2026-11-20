import type { AnalysisResult } from '@/types/analysis';

/**
 * Development fixture. Replace with a real API response — the shape is the
 * contract, so no visualization changes when you do.
 */
export const MOCK_ANALYSIS: AnalysisResult = {
  exposure: {
    queueMillions: 1.18,
    blockedToday: 2874120,
    routes: [
      { from: [55.75, 37.62], to: [39.04, -77.49], fromCode: 'RU', toCode: 'US', label: 'Credential phishing', severity: 'malicious' },
      { from: [39.9, 116.4], to: [50.11, 8.68], fromCode: 'CN', toCode: 'DE', label: 'Typosquat batch', severity: 'new' },
      { from: [6.52, 3.38], to: [51.51, -0.13], fromCode: 'NG', toCode: 'GB', label: 'Brand impersonation', severity: 'malicious' },
      { from: [-23.55, -46.63], to: [32.78, -96.8], fromCode: 'BR', toCode: 'US', label: 'Malware dropper', severity: 'malicious' },
      { from: [35.69, 51.39], to: [52.37, 4.9], fromCode: 'IR', toCode: 'NL', label: 'C2 beacon', severity: 'new' },
      { from: [1.35, 103.82], to: [-33.87, 151.21], fromCode: 'SG', toCode: 'AU', label: 'Port scan', severity: 'suspicious' },
      { from: [37.57, 126.98], to: [35.68, 139.69], fromCode: 'KR', toCode: 'JP', label: 'Botnet enrol', severity: 'new' },
      { from: [19.08, 72.88], to: [43.65, -79.38], fromCode: 'IN', toCode: 'CA', label: 'Homograph domain', severity: 'malicious' },
      { from: [41.01, 28.98], to: [50.11, 8.68], fromCode: 'TR', toCode: 'DE', label: 'Fast-flux DNS', severity: 'suspicious' },
      { from: [50.45, 30.52], to: [39.04, -77.49], fromCode: 'UA', toCode: 'US', label: 'Credential stuffing', severity: 'malicious' }
    ]
  },

  extraction: { url: 'https://secure-login.example.com/account/verify?id=9281' },

  homograph: {
    legitimate: 'apple-id-verify.com',
    suspect: '\u0430pple-id-verify.com',
    brand: 'apple.com',
    names: {
      '\u0430': 'CYRILLIC SMALL LETTER A',
      a: 'LATIN SMALL LETTER A'
    },
    confusables: {
      '\u0430': 'a',
      '\u0435': 'e',
      '\u043e': 'o',
      '\u0440': 'p',
      '\u0441': 'c',
      '\u0445': 'x'
    },
    brandSimilarity: 0.97
  },

  enrichment: {
    confidence: 0.94,
    nodes: [
      { id: 'domain', label: 'apple-id-verify.com', type: 'DOMAIN', severity: 'malicious', ring: 0,
        rows: [['REGISTERED', '6 hours ago'], ['REGISTRAR', 'NiceNIC'], ['TLD', '.com']] },
      { id: 'ip', label: '45.133.1.87', type: 'IP ADDRESS', severity: 'malicious', ring: 1,
        rows: [['ASN', 'AS204601'], ['GEO', 'Amsterdam, NL'], ['TYPE', 'Hosting / proxy']] },
      { id: 'dns', label: 'DNS', type: 'DNS RECORDS', severity: 'suspicious', ring: 1,
        rows: [['A', '45.133.1.87'], ['NS', 'ns1.fastflux.su'], ['TTL', '60 s']] },
      { id: 'whois', label: 'WHOIS', type: 'REGISTRATION', severity: 'suspicious', ring: 1,
        rows: [['AGE', '6 hours'], ['PRIVACY', 'Redacted'], ['EMAIL', 'proton.me']] },
      { id: 'ssl', label: 'TLS CERT', type: 'CERTIFICATE', severity: 'suspicious', ring: 1,
        rows: [['ISSUER', "Let's Encrypt"], ['AGE', '5 hours'], ['SAN COUNT', '14']] },
      { id: 'related', label: 'related \u00d7 14', type: 'RELATED DOMAINS', severity: 'malicious', ring: 2,
        rows: [['SHARED CERT', '14 hosts'], ['PATTERN', 'brand-id-*'], ['FIRST SEEN', '9 h ago']] },
      { id: 'campaign', label: 'ClearFake', type: 'CAMPAIGN', severity: 'malicious', ring: 2,
        rows: [['TRACKED SINCE', '2025-11'], ['CONFIDENCE', '0.94'], ['TARGET', 'Consumer ID']] },
      { id: 'malware', label: 'credential kit', type: 'MALWARE INDICATOR', severity: 'malicious', ring: 2,
        rows: [['FAMILY', 'EvilProxy'], ['KIT HASH', 'a91f\u2026e4'], ['CAPTURES', 'OTP + pass']] },
      { id: 'rep', label: 'reputation', type: 'REPUTATION SOURCES', severity: 'malicious', ring: 2,
        rows: [['FEEDS HIT', '6 / 9'], ['FIRST FLAG', '2 h ago'], ['CONSENSUS', 'Phishing']] },
      { id: 'pdns', label: 'passive DNS', type: 'PASSIVE DNS', severity: 'new', ring: 2,
        rows: [['RESOLUTIONS', '312'], ['UNIQUE IPS', '3'], ['WINDOW', '6 h']] },
      { id: 'registrar', label: 'registrar', type: 'REGISTRAR HISTORY', severity: 'neutral', ring: 2,
        rows: [['ABUSE RATE', '18 %'], ['DOMAINS', '2.1 M'], ['RESPONSE', 'Slow']] }
    ],
    edges: [
      { source: 'domain', target: 'ip', relationship: 'malicious' },
      { source: 'domain', target: 'dns', relationship: 'suspicious' },
      { source: 'domain', target: 'whois', relationship: 'suspicious' },
      { source: 'domain', target: 'ssl', relationship: 'suspicious' },
      { source: 'ssl', target: 'related', relationship: 'malicious' },
      { source: 'ip', target: 'campaign', relationship: 'malicious' },
      { source: 'ip', target: 'malware', relationship: 'malicious' },
      { source: 'dns', target: 'pdns', relationship: 'new' },
      { source: 'whois', target: 'registrar', relationship: 'neutral' },
      { source: 'domain', target: 'rep', relationship: 'malicious' },
      { source: 'related', target: 'campaign', relationship: 'malicious' },
      { source: 'rep', target: 'campaign', relationship: 'malicious' }
    ]
  },

  decision: {
    thresholds: { suspicious: 40, malicious: 70 },
    model: 'Random Forest + rules',
    signals: [
      { key: 'lexical', label: 'Lexical Risk', score: 72, weight: 0.2, stage: 'EXTRACTION' },
      { key: 'homograph', label: 'Homograph Risk', score: 91, weight: 0.3, stage: 'HOMOGRAPH' },
      { key: 'reputation', label: 'Reputation Risk', score: 84, weight: 0.22, stage: 'ENRICHMENT' },
      { key: 'infra', label: 'Infrastructure Risk', score: 65, weight: 0.16, stage: 'ENRICHMENT' },
      { key: 'behavioral', label: 'Behavioral Risk', score: 78, weight: 0.12, stage: 'EXPOSURE' }
    ]
  }
};
