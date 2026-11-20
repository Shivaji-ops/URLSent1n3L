# URLSentinel / Triage Desk — Frontend

Two views. A cinematic **gateway** that unlocks into a scroll-driven,
five-stage **analysis pipeline**.

```
GATEWAY  ──unlock──▶  EXPOSURE → EXTRACTION → HOMOGRAPH → ENRICHMENT → DECISION
wireframe hand         globe      URL scanner   glyph lab    intel network  risk core
```

`App.tsx` holds both behind a two-state view switch — no router, add one if the
gateway needs its own URL.

---

## About this bundle

This is **working source**, not a spec: `npm install && npm run dev` renders the
design. `reference/Threat Field 3D.dc.html` is the approved HTML prototype the
port was made from — treat it as the visual ground truth if anything here looks
off.

Fidelity: **high**. Colours, type, spacing and motion are final and were signed
off in the prototype. Recreate deviations against the reference, not from taste.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # analysis-layer unit tests
npm run build    # tsc --build + vite build
```

---

## Stack, and why

| Choice | Reason |
| --- | --- |
| **Vite + React 18 + TypeScript** | Nothing to server-render (the hero is a canvas); Next's App Router adds hydration and RSC constraints that fight an imperative rAF loop. |
| **Two renderers, on purpose** | The pipeline is 2600 depth-sorted particles morphing between five targets — hand-written Canvas 2D beats a scene graph there. The gateway is a handful of lit meshes in perspective — R3F is the right tool. Neither is worth rewriting to match the other. |
| **R3F + drei (gateway only)** | Declarative meshes, lights and fog; `useFrame` for the per-frame work. |
| **Framer Motion (gateway only)** | MotionValues are the clean bridge between an imperative rAF loop and CSS — one unlock clock drives camera, fog, particles, blur and veil together. |
| **Tailwind (gateway only)** | Absolute positioning and micro-typography, as specced. The pipeline stayed on inline style objects so its values remain auditable 1:1 against the prototype; converge on one when the team picks a convention (the token file is already extracted). |
| **No animation library in the pipeline** | Its timeline is scroll-derived and already frame-accurate. |
| **No state library** | One `useState` for selection covers it. Add Zustand only if distant components need to read it. |
| **TanStack Query (not included)** | Add when the API lands; `App.tsx` has the wiring sketch in a comment. |

---

## Architecture

The load-bearing rule, in both views: **React never renders a frame.**

### Gateway

```
Gateway                     phase machine + layer stack
├── GatewayScene ─────────── <Canvas> fixed behind the UI
│   ├── CameraRig            parallax at rest, dolly + fog collapse on unlock
│   ├── WireframeHand        procedural taper chains, 2 point lights
│   └── ParticleField        sparse dust; 46× warp on unlock
├── GatewayNode              proximity glow (MotionValue, no re-render)
├── CustomCursor             magnetic ring + dot
└── useUnlockSequence        ONE progress MotionValue drives everything
```

`progress` is a single `MotionValue`: the 3D layer reads it in `useFrame`, the
UI layer maps it through `useTransform` to opacity/blur/veil. That is why the
camera dolly, fog collapse, particle warp, hand recoil and white-out stay in
lockstep — they share one clock, not five timers.

Two things deliberately avoided: `proximity` and the node glow are MotionValues,
not state (the node lights up on approach with zero reconciliation); and phase
is the *only* `useState` in the gateway — three discrete values, not a stream.

### Pipeline

```
AnalysisPipeline            sticky stage + scroll spacer; scroll → engine
├── canvas ──────────────── ThreatFieldEngine (imperative, owns rAF)
├── HudBar                  ← progress bus (ref mutation, no setState)
├── NarrativeColumn         ← progress bus
│   └── AttackFeed          setState @ 1.5 s — cheap enough
├── StageReadouts           ← progress bus
│   ├── ExtractionReadout
│   ├── HomographReadout
│   ├── EnrichmentReadout
│   └── DecisionReadout
└── StageRail               ← progress bus; click → goTo()
```

**Data flow**

- **Scroll → engine.** The scroll handler computes a stage position (0–4) and
  calls `engine.setProgress()`. It never becomes React state.
- **Engine → DOM.** The engine publishes `af` to a *progress bus*
  (`useStageProgress`) ~11×/s. Subscribers mutate their own node's style
  directly. Panel fades, rail fill and HUD counters all run this way.
- **Engine ⇄ React (selection only).** Clicking a 3D glyph or intel node fires
  `onPick`, which *is* real state — it changes what the readout shows. The
  reverse path (clicking the readout's glyph buttons) calls
  `engine.setSelection()`.

Why a bus instead of `useState`: driving 5 panels + 5 dots + 3 counters through
React at 60 fps is ~700 reconciliations/second for work that is 13 style writes.

---

## The data contract

`src/types/analysis.ts` defines `AnalysisResult` — the **only** thing the UI and
engine read:

```ts
interface AnalysisResult {
  exposure:   { routes: AttackRoute[]; queueMillions?: number; blockedToday?: number }
  extraction: { url: string }
  homograph:  { legitimate, suspect, brand, confusables, brandSimilarity, names? }
  enrichment: { nodes: IntelNode[]; edges: IntelEdge[]; confidence? }
  decision:   { thresholds, signals: RiskSignal[]; model? }
}
```

Replace `MOCK_ANALYSIS` with a fetch and nothing else changes. If the backend is
FastAPI/Pydantic, generate these types from the OpenAPI schema so they stay in
sync.

**Never send derived values.** Features, entropy, punycode, skeleton and the
risk score are computed client-side in `src/lib/analysis.ts` (pure, unit-tested).
Send raw indicators and signal scores; let the UI derive the rest.

Extending is additive: a new intelligence provider is a new `IntelNode` +
`IntelEdge` — the 3D network lays it out automatically by `ring`. A new lexical
feature is one line in `extractFeatures`; both the scene and the readout pick it
up.

---

## The render engine

`src/engine/ThreatFieldEngine.ts` — framework-agnostic class, no React imports.

- **Projection** (`painter.ts`) — yaw → pitch → roll → perspective divide, ~15
  lines. Every scene uses this one function.
- **Particle field** — one morph target per stage (`build()`); particles
  interpolate between the two nearest at per-particle easing rates. Positions in
  flat `Float32Array`s, no per-frame allocation.
- **Shading** — pre-rendered radial-gradient sprites per palette colour,
  depth-sorted back-to-front, additive blend, quarter-res buffer for bloom.
- **Frame-rate independence** — all easing scales by `dt`, so 60 Hz and 120 Hz
  look identical.
- **3D text** — `fillText` at projected positions, depth-scaled, horizontally
  squashed to fake rotation.
- **Real geography** — Natural Earth 110m (`world-atlas@2.0.2`, version-pinned)
  decoded from TopoJSON, rasterised to a land mask, particles resampled onto
  true coastlines. Fails gracefully to an abstract sphere if the CDN is
  unreachable. **Vendor this file** before production.
- **Lifecycle** — generation-token rAF loop; `destroy()` is idempotent, so
  Strict Mode's double mount cannot leave two loops running. A 700 ms watchdog
  re-arms after background-tab throttling.
- **Reduced motion** — `prefers-reduced-motion` disables orbit, drift, trails,
  bloom and the stage-change glitch.

### Scenes

| Stage | File | What it shows |
| --- | --- | --- |
| 01 | `scenes/exposure.ts` | Graticule + geolocated great-circle attack routes, occluded behind the planet, impact ripple on arrival. |
| 02 | `scenes/extraction.ts` | Scan plane sweeps the floating URL; the string separates into five labelled depth lanes and emits wired feature chips. |
| 03 | `scenes/homograph.ts` | Scanner ring travels the host; the selected glyph lifts into a wireframe cage with its codepoint and the ASCII twin beside it. |
| 04 | `scenes/enrichment.ts` | Indicator core in counter-rotating rings; evidence nodes orbit two shells, edges carry intel packets. |
| 05 | `scenes/decision.ts` | Weighted signal streams (speed/density = score) converge on a pulsing risk core carrying score and verdict. |

Camera adapts: free orbit on the globe and network, locked face-on for the
type-based scenes so text stays readable.

---

## The gateway scene

`src/gateway/`.

- **Procedural hand, no model file** (`handGeometry.ts`). Every part is a chain
  of tapered cylinders: index extended, three fingers curled under, thumb toward
  the viewer, palm **lofted along the hand axis** (a box reads as a crate, a
  cylinder as a slab), forearm dissolving into scene fog.
- **The fingertip is the group origin.** So the group's `position` *is* where the
  tip sits — parked just short of the node, and the gap reads as charged rather
  than empty. Moving the hand never needs the offset recomputed.
- **Knuckle spheres only below r = 0.16.** At wrist scale a sphere reads as a
  robot ball joint and kills the organic silhouette.
- **Colour is an argument, not decoration.** The hand is threat-red — the
  adversary reaching in; the node is cool white — the system holding. Red is
  already the pipeline's threat token. `signal-cyan` and `toxic-green` ship as
  alternates via the `accent` prop.
- **Magnetic cursor** (`useMagneticPointer`). Inside a 190 px field the ring's
  *target* bends toward the node, so the cursor appears pulled in rather than
  merely following. Two springs at different stiffnesses give ring and dot their
  lag relationship.
- **Keyboard parity.** Focus pins the node's glow to full, so it is never inert
  for non-mouse users. Both the node and the CTA fire the same unlock.
- **Touch devices** (`(hover: none)`) keep the native cursor and skip the custom
  one entirely — an invisible cursor with no hover is a dead end.
- **Reduced motion** skips the warp: the scene holds still and cuts through in
  260 ms.

## Design tokens

`src/styles/tokens.ts`. Palette is authored in **oklch** — keep it; the hue
ramps between stages depend on it.

**Surfaces** `bg oklch(12% 0.015 260)` · `bgDeep oklch(9% 0.015 265)` ·
`surface oklch(15% 0.015 262)` · glass `oklch(14% 0.015 262 / 0.66)` +
`backdrop-filter: blur(7px)`
**Hairlines** `oklch(100% 0 0 / 0.09)`, soft `/ 0.07`
**Text** `94% 0.008 260` → muted `72% 0.015` → dim `62% 0.02` → faint `56% 0.02`
**Accents** blue `72% 0.13 255` · violet `74% 0.14 300` · red `70% 0.19 22` ·
amber `76% 0.15 70` · green `82% 0.15 148`
**Severity** malicious `68% 0.19 22` · suspicious `76% 0.15 70` ·
neutral `70% 0.02 260` · new `72% 0.15 300`

**Type** — Space Grotesk 600 (display), Manrope 400/600 (body), IBM Plex Mono
500 (all data). Scale: 8–8.5px mono micro-labels (`0.08–0.16em` tracking),
9.5–11px mono values, 13–15px body, `clamp(23px, 2.4vh + 0.8vw, 42px)`
headlines, 22–26px display numerals.

**Radii** 10px cards, 100px pills, 2–3px meters. **Gaps** 8px between cards, 5px
inside, 1px hairline-separated rows.

### Two constraints that are not decoration

1. **Every grid child needs `min-width: 0`.** Grid items default to
   `min-width: auto`, so long mono strings blow out the container. This caused a
   real overflow bug; the cards keep it.
2. **The legibility scrim holds 0.88 out to 32%** and only reaches zero at 78%,
   past the copy column's right edge (51%). The field origin also shifts right
   (0.70w wide → 0.60w below 760px). Weakening either puts the globe behind the
   text.

---

## Interaction

**Gateway**

| Input | Effect |
| --- | --- |
| Move near centre | Node glows and expands; cursor is magnetically pulled in |
| Click node / CTA | Unlock: hand recoils and dissolves, particles warp, camera dollies in, fog closes, white-out |
| Tab → Enter | Same unlock; focus drives the same glow |
| RE-ARM GATEWAY | Replays the sequence from armed |

**Pipeline**

| Input | Effect |
| --- | --- |
| Scroll | Advances the pipeline; continuously scrubbable both ways |
| Drag on canvas | Orbits (damped on face-on scenes) |
| Click a glyph (03) / node (04) | Inspects it; readout follows |
| Click empty space | World-space shockwave through the field |
| Rail item | Smooth-scrolls to that stage |
| ↑↓ ←→ PgUp/PgDn | Previous / next stage |
| 1–5 | Jump to stage |

Motion communicates state — scan sweeps = processing, packets = correlation,
convergence = risk accumulation. Nothing animates decoratively.

---

## Still to do

- **Loading / error / empty states.** `AnalysisPipeline` assumes a resolved
  `AnalysisResult`. Add a skeleton (stage 01 globe with an empty feed reads well
  as a loading state) and an error path.
- **Vendor the land mask** to `public/countries-110m.json`; drop the CDN fetch.
- **Mobile.** Below ~760px the layout needs a rethink — the copy column and 3D
  stage currently share a row. Suggest stacking: scene on top at 45vh, copy
  below, rail collapsing to a horizontal dot row.
- **Accessibility.** The canvas is decorative-by-proxy: every value in it also
  appears in a readout, and the glyph picker is mirrored as real buttons. Add an
  `aria-live` region announcing stage changes, and a text-only fallback view.
- **Real analyst actions.** Allow / Block / Escalate in stage 05 is currently
  copy only; wire to a mutation and feed the active-learning set.
- **Gateway: wire `request access`.** It currently fires the unlock as a
  stand-in. Point it at a waitlist form or auth flow.
- **Gateway on mobile.** The hand is composed for a landscape frame; below
  ~900 px the camera pulls back but the composition wants a recentre.
- **One styling system.** Gateway is Tailwind, pipeline is inline styles.
  Deliberate for fidelity, but worth converging.

---

## File map

```
src/
  types/analysis.ts          THE contract — read this first
  lib/
    analysis.ts              entropy, features, risk, derivation (pure)
    punycode.ts              RFC 3492 encoder (pure)
    geo.ts                   TopoJSON → land mask
    mockAnalysis.ts          dev fixture; replace with the API
  engine/
    ThreatFieldEngine.ts     particle field, camera, frame loop
    painter.ts               projection + 3D primitives
    palette.ts               sprites, severity/stage colour
    sceneData.ts             per-analysis geometry (camera-independent)
    scenes/*.ts              one file per stage
  hooks/
    useThreatField.ts        engine lifecycle
    useStageProgress.ts      the progress bus
    useDerivedAnalysis.ts    memoised derivation
  gateway/
    Gateway.tsx              the entry page — start here for the gateway
    GatewayScene.tsx         <Canvas>: rig + hand + dust
    WireframeHand.tsx        procedural hand meshes
    ParticleField.tsx        dust + warp
    CameraRig.tsx            parallax, dolly, fog collapse
    GatewayNode.tsx          the interaction node
    CustomCursor.tsx         magnetic ring + dot
    handGeometry.ts          taper-chain builder (pure)
    useMagneticPointer.ts    pointer springs + proximity
    useUnlockSequence.ts     phase machine + progress clock
    theme.ts                 accents + scene constants
  components/
    AnalysisPipeline.tsx     pipeline scroll shell — start here for the pipeline
    primitives.tsx           Card / KeyValue / Meter
    readouts/*.tsx           one per stage
  content/stages.ts          narrative copy
  styles/tokens.ts           design tokens
reference/
  Threat Field 3D.dc.html    approved pipeline prototype (visual ground truth)
  Gateway.dc.html            approved gateway prototype
```
