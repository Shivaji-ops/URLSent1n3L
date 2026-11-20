import type { DerivedAnalysis, IntelNode, RiskSignal } from '@/types/analysis';
import { latLonToVec3 } from '@/lib/geo';

/**
 * Pre-computed, camera-independent geometry for the four non-globe scenes.
 * Built once per analysis; the render loop only interpolates.
 */

export interface UrlChar {
  ch: string;
  /** X in the assembled string. */
  x0: number;
  /** X once separated into its component lane. */
  x1: number;
  y1: number;
  z1: number;
}

export interface UrlGroup {
  label: string;
  text: string;
  rgb: string;
  lane: [number, number, number];
  chars: UrlChar[];
}

export interface FeatureChip {
  name: string;
  value: number;
  hot: boolean;
  p: [number, number, number];
  lane: number;
}

export interface WordGlyph {
  index: number;
  char: string;
  hex: string;
  ascii: string | null;
  confusable: boolean;
  x: number;
  y: number;
  z: number;
}

export interface NetNode {
  node: IntelNode;
  /** Orbit radius; 0 for the centre node. */
  orbit: number;
  /** Starting angle. */
  base: number;
  y: number;
  /** Node radius in world units. */
  size: number;
  spin: number;
}

export interface SignalStream {
  signal: RiskSignal;
  from: [number, number, number];
  ctrl: [number, number, number];
}

export interface ExposureRoute {
  a: [number, number, number];
  b: [number, number, number];
  fromCode: string;
  toCode: string;
  label: string;
  spriteIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  rgb: string;
  offset: number;
  speed: number;
}

export interface SceneData {
  groups: UrlGroup[];
  chips: FeatureChip[];
  word: WordGlyph[];
  net: NetNode[];
  streams: SignalStream[];
  routes: ExposureRoute[];
}

/** Short codes for the floating feature chips. */
const CHIP_CODE: Record<string, string> = {
  url_length: 'len',
  entropy: 'H',
  hyphen_count: '\u2013',
  digit_count: '0-9',
  suspicious_kw: 'kw',
  subdomain_count: 'sub',
  path_depth: 'path',
  query_params: '?'
};

const ROUTE_SPRITE = { malicious: 2, suspicious: 1, neutral: 0, new: 4 } as const;
const ROUTE_RGB = {
  malicious: '255,92,116',
  suspicious: '122,156,255',
  neutral: '172,186,224',
  new: '178,130,255'
} as const;

export function buildSceneData(A: DerivedAnalysis): SceneData {
  const u = A.parsed;

  /* --- 02 EXTRACTION: the URL as 3D type, and where each part flies to --- */
  const groups: UrlGroup[] = (
    [
      { label: 'PROTOCOL', text: u ? u.protocol + '//' : '', rgb: '146,166,214' },
      { label: 'SUBDOMAIN', text: A.subdomain ? A.subdomain + '.' : '', rgb: '122,156,255' },
      { label: 'DOMAIN', text: A.domain, rgb: '236,242,255' },
      { label: 'PATH', text: A.path || '', rgb: '178,130,255' },
      { label: 'QUERY', text: A.query || '', rgb: '255,196,110' }
    ] as Array<Omit<UrlGroup, 'lane' | 'chars'>>
  )
    .filter((g) => g.text)
    .map((g) => ({ ...g, lane: [0, 0, 0] as [number, number, number], chars: [] }));

  const joined = groups.map((g) => g.text).join('');
  const total = joined.length;
  const spacing = Math.min(0.078, 2.2 / Math.max(1, total));
  let idx = 0;
  groups.forEach((g, gi) => {
    const m = g.text.length;
    const laneSpacing = Math.min(0.1, 1.4 / Math.max(1, m));
    const ly = 0.66 - gi * 0.32;
    const lz = 0.16 - gi * 0.09;
    g.lane = [0, ly, lz];
    g.chars = Array.from(g.text).map((ch, j) => {
      const i = idx++;
      return {
        ch,
        x0: (i - (total - 1) / 2) * spacing,
        x1: (j - (m - 1) / 2) * laneSpacing,
        y1: ly,
        z1: lz
      };
    });
  });

  const chipFeatures = A.features.filter((f) => CHIP_CODE[f.name]).slice(0, 8);
  const chips: FeatureChip[] = chipFeatures.map((f, k) => {
    const a = -0.95 + (k / Math.max(1, chipFeatures.length - 1)) * 1.9;
    return {
      name: CHIP_CODE[f.name],
      value: f.value,
      hot: f.value / f.max > 0.5,
      p: [1.32, -Math.sin(a) * 0.86, Math.cos(a) * 0.2 - 0.05],
      lane: k % Math.max(1, groups.length)
    };
  });

  /* --- 03 HOMOGRAPH: the suspect host as a shallow arc of 3D glyphs --- */
  const n = A.glyphs.length;
  const word: WordGlyph[] = A.glyphs.map((g, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    return {
      index: g.index,
      char: g.char,
      hex: g.hex,
      ascii: g.ascii,
      confusable: g.confusable,
      x: (t - 0.5) * 2.15,
      y: 0,
      z: Math.sin(t * Math.PI) * 0.26 - 0.08
    };
  });

  /* --- 04 ENRICHMENT: two orbital shells around the indicator --- */
  const rings: IntelNode[][] = [[], [], []];
  A.raw.enrichment.nodes.forEach((nd) => rings[nd.ring].push(nd));
  const net: NetNode[] = A.raw.enrichment.nodes.map((nd) => {
    if (nd.ring === 0) {
      return { node: nd, orbit: 0, base: 0, y: 0, size: 0.24, spin: 0 };
    }
    const list = rings[nd.ring];
    const i = list.indexOf(nd);
    const base = (i / list.length) * Math.PI * 2 + (nd.ring === 2 ? 0.4 : 0);
    return {
      node: nd,
      orbit: nd.ring === 1 ? 1.06 : 1.5,
      base,
      y: nd.ring === 1 ? Math.sin(base * 1.3) * 0.3 : Math.sin(base * 0.9 + 1.2) * 0.62,
      size: nd.ring === 1 ? 0.15 : 0.105,
      spin: nd.ring === 1 ? 0.1 : -0.062
    };
  });

  /* --- 05 DECISION: signal streams arcing into the core --- */
  const signals = A.raw.decision.signals;
  const streams: SignalStream[] = signals.map((s, k) => {
    const a = (k / signals.length) * Math.PI * 2;
    const from: [number, number, number] = [
      Math.cos(a) * 1.34,
      Math.sin(a) * 0.9,
      Math.sin(a * 1.6) * 0.38
    ];
    return {
      signal: s,
      from,
      ctrl: [from[0] * 0.45, from[1] * 0.45 + 0.28, from[2] * 0.45 - 0.35]
    };
  });

  /* --- 01 EXPOSURE: geolocated great-circle routes --- */
  const routes: ExposureRoute[] = A.raw.exposure.routes.map((r, k) => ({
    a: latLonToVec3(r.from[0], r.from[1]),
    b: latLonToVec3(r.to[0], r.to[1]),
    fromCode: r.fromCode,
    toCode: r.toCode,
    label: r.label,
    spriteIndex: ROUTE_SPRITE[r.severity],
    rgb: ROUTE_RGB[r.severity],
    offset: (k * 0.137) % 1,
    speed: 0.15 + (k % 4) * 0.022
  }));

  return { groups, chips, word, net, streams, routes };
}
