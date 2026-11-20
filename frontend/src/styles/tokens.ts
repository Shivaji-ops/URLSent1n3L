/**
 * Design tokens lifted from the approved prototype.
 * Colours are oklch — the palette was authored in it, so keep it.
 */
export const color = {
  bg: 'oklch(12% 0.015 260)',
  bgDeep: 'oklch(9% 0.015 265)',
  surface: 'oklch(15% 0.015 262)',
  surfaceGlass: 'oklch(14% 0.015 262 / 0.66)',
  hairline: 'oklch(100% 0 0 / 0.09)',
  hairlineSoft: 'oklch(100% 0 0 / 0.07)',
  text: 'oklch(94% 0.008 260)',
  textMuted: 'oklch(72% 0.015 260)',
  textDim: 'oklch(62% 0.02 260)',
  textFaint: 'oklch(56% 0.02 260)',
  blue: 'oklch(72% 0.13 255)',
  violet: 'oklch(74% 0.14 300)',
  red: 'oklch(70% 0.19 22)',
  amber: 'oklch(76% 0.15 70)',
  green: 'oklch(82% 0.15 148)'
} as const;

export const font = {
  display: "'Space Grotesk', sans-serif",
  body: "'Manrope', sans-serif",
  mono: "'IBM Plex Mono', monospace"
} as const;

/** Severity -> oklch, matching the engine's canvas palette. */
export const severityColor = {
  malicious: 'oklch(68% 0.19 22)',
  suspicious: 'oklch(76% 0.15 70)',
  neutral: 'oklch(70% 0.02 260)',
  new: 'oklch(72% 0.15 300)'
} as const;

export function riskColor(score: number): string {
  if (score >= 80) return 'oklch(68% 0.19 22)';
  if (score >= 60) return 'oklch(76% 0.15 55)';
  return 'oklch(74% 0.14 255)';
}

export function verdictColor(v: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS'): string {
  if (v === 'MALICIOUS') return 'oklch(70% 0.19 22)';
  if (v === 'SUSPICIOUS') return 'oklch(78% 0.15 65)';
  return 'oklch(82% 0.15 148)';
}
