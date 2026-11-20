/**
 * Accent themes for the gateway.
 *
 * The design call: the hand is the ADVERSARY reaching in, the node is the
 * system holding. Red is already the threat token in the pipeline, so the
 * duality is on-brand rather than decorative. Cyan and green are alternates.
 */
export interface GatewayTheme {
  /** Body of the wireframe hand. */
  hand: number;
  /** The extended index finger — same family, lifted. */
  tip: number;
  /** Background particle dust. */
  dust: number;
  /** "r,g,b" for the CSS bloom behind the node. */
  glow: string;
}

export const GATEWAY_THEMES = {
  'threat-red': { hand: 0xff5c74, tip: 0xff8fa2, dust: 0x9fb4e8, glow: '255,92,116' },
  'signal-cyan': { hand: 0x4fd8ff, tip: 0x9be9ff, dust: 0x8fa8dc, glow: '79,216,255' },
  'toxic-green': { hand: 0x5cff9e, tip: 0xa6ffcb, dust: 0x94c9b4, glow: '92,255,158' }
} satisfies Record<string, GatewayTheme>;

export type GatewayAccent = keyof typeof GATEWAY_THEMES;

/** Scene constants shared by the camera rig, fog and unlock sequence. */
export const SCENE = {
  background: 0x050505,
  fogNear: 3.4,
  fogFar: 13.5,
  /** Camera z at rest; wider on narrow viewports to clear the node. */
  cameraZ: 7,
  cameraZNarrow: 8.6,
  narrowBreakpoint: 900,
  /** Radius in px within which the cursor is pulled toward the node. */
  magneticField: 190,
  unlockDurationMs: 1300
} as const;
