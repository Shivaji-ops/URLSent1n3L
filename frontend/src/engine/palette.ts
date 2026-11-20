import type { Severity } from '@/types/analysis';

/** Sprite palette. Index order is load-bearing — see SPRITE. */
export const PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [172, 186, 224], // 0 neutral particle
  [122, 156, 255], // 1 blue accent
  [255, 92, 116],  // 2 threat red
  [86, 232, 175],  // 3 safe green
  [178, 130, 255], // 4 correlation violet
  [88, 112, 156],  // 5 ocean (dim)
  [206, 222, 255]  // 6 land (bright)
];

export type SpriteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Severity -> sprite index. */
export const SPRITE: Record<Severity, SpriteIndex> = {
  malicious: 2,
  suspicious: 1,
  neutral: 0,
  new: 4
};

/** Severity -> "r,g,b" string for canvas fills. */
export const SEVERITY_RGB: Record<Severity, string> = {
  malicious: '255,96,120',
  suspicious: '255,190,110',
  neutral: '168,180,208',
  new: '178,130,255'
};

/** Per-stage tint that grades the whole frame. */
export const STAGE_TINT: ReadonlyArray<readonly [number, number, number]> = [
  [126, 158, 255],
  [126, 158, 255],
  [255, 96, 120],
  [178, 130, 255],
  [92, 232, 178]
];

/** oklch hue per stage, used by the DOM rail + HUD. */
export const STAGE_HUE = ['255', '255', '22', '300', '148'];

export const STAGE_NAMES = ['EXPOSURE', 'EXTRACTION', 'HOMOGRAPH', 'ENRICHMENT', 'DECISION'];

export const STAGE_STATUS = ['INGEST', 'EXTRACT', 'HOMOGRAPH', 'ENRICH', 'VERDICT'];

/** Builds the pre-rendered soft-glow sprites once per engine. */
export function buildSprites(): HTMLCanvasElement[] {
  return PALETTE.map((p) => {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const g = c.getContext('2d')!;
    const rgb = p.join(',');
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, `rgba(${rgb},1)`);
    rg.addColorStop(0.3, `rgba(${rgb},0.86)`);
    rg.addColorStop(0.58, `rgba(${rgb},0.22)`);
    rg.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    return c;
  });
}
