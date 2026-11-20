import { useCallback, useEffect, useRef } from 'react';
import type { AnalysisResult } from '@/types/analysis';
import { STAGE_COUNT } from '@/engine/ThreatFieldEngine';
import { useDerivedAnalysis } from '@/hooks/useDerivedAnalysis';
import { useProgressBus } from '@/hooks/useStageProgress';
import { useThreatField } from '@/hooks/useThreatField';
import { color, font } from '@/styles/tokens';
import { AttackFeed } from './AttackFeed';
import { HudBar } from './HudBar';
import { NarrativeColumn } from './NarrativeColumn';
import { StageRail } from './StageRail';
import { StageReadouts } from './StageReadouts';
import { ExtractionReadout } from './readouts/ExtractionReadout';
import { HomographReadout } from './readouts/HomographReadout';
import { EnrichmentReadout } from './readouts/EnrichmentReadout';
import { DecisionReadout } from './readouts/DecisionReadout';

export interface AnalysisPipelineProps {
  analysis: AnalysisResult;
  particleCount?: number;
  trailLength?: number;
  bloom?: boolean;
  /** Scroll distance per stage, in viewport heights. */
  stageHeight?: number;
  /** Opens the live URL checker; shown as a button in the HUD bar. */
  onLiveAnalysis?: () => void;
}

/**
 * The whole experience: a sticky 3D stage over a tall scroll spacer.
 *
 * Scroll position is read on the scroll event and pushed straight into the
 * engine — it never becomes React state, so nothing re-renders while scrolling.
 */
export function AnalysisPipeline({
  analysis,
  particleCount = 2600,
  trailLength = 0.5,
  bloom = true,
  stageHeight = 1.4,
  onLiveAnalysis
}: AnalysisPipelineProps) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const spacer = useRef<HTMLDivElement | null>(null);
  const cue = useRef<HTMLDivElement | null>(null);
  const lastTop = useRef(0);

  const bus = useProgressBus();
  const derived = useDerivedAnalysis(analysis);
  const field = useThreatField({ analysis, bus, particleCount, trailLength, bloom });

  const storyLength = useCallback(() => {
    const el = scroller.current;
    const inner = spacer.current;
    if (!el || !inner) return 1;
    return Math.max(1, inner.offsetHeight - el.clientHeight);
  }, []);

  /* ---- scroll -> engine ---- */
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const top = el.scrollTop;
      const delta = top - lastTop.current;
      lastTop.current = top;
      const p = Math.max(0, Math.min(1, top / storyLength()));
      field.engine.current?.setProgress(p * (STAGE_COUNT - 1), delta);
      if (cue.current) {
        cue.current.style.opacity = Math.max(0, 1 - p * (STAGE_COUNT - 1) * 3).toFixed(2);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [field.engine, storyLength]);

  const goTo = useCallback(
    (stage: number) => {
      const el = scroller.current;
      if (!el) return;
      el.scrollTo({
        top: (stage / (STAGE_COUNT - 1)) * storyLength() * 0.999,
        behavior: 'smooth'
      });
    },
    [storyLength]
  );

  /* ---- keyboard navigation ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const current = Math.round(bus.current());
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        goTo(Math.min(STAGE_COUNT - 1, current + 1));
        e.preventDefault();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goTo(Math.max(0, current - 1));
        e.preventDefault();
      } else if (e.key >= '1' && e.key <= '5') {
        goTo(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bus, goTo]);

  const charIndex = field.selection.charIndex ?? Math.max(0, derived.firstConfusable);

  return (
    <div
      ref={scroller}
      style={{
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: color.bg,
        color: color.text,
        fontFamily: font.body
      }}
    >
      <div ref={spacer} style={{ position: 'relative', height: `${STAGE_COUNT * stageHeight * 100}vh` }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          <canvas
            ref={field.canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: 'grab',
              touchAction: 'pan-y'
            }}
          />

          {/* Atmosphere + legibility layers. Order matters. */}
          <Overlay background="radial-gradient(120% 90% at 50% 45%, transparent 35%, oklch(10% 0.015 265 / 0.55) 78%, oklch(9% 0.015 265 / 0.9) 100%)" />
          <Overlay
            backgroundImage="linear-gradient(oklch(100% 0 0 / 0.022) 1px, transparent 1px), linear-gradient(90deg, oklch(100% 0 0 / 0.022) 1px, transparent 1px)"
            backgroundSize="68px 68px"
            maskImage="radial-gradient(80% 70% at 50% 50%, black, transparent 85%)"
          />
          {/* Scrim: holds 0.88 out to 32% so the copy column always reads. */}
          <Overlay background="linear-gradient(90deg, oklch(9% 0.015 265 / 0.93) 0%, oklch(9% 0.015 265 / 0.88) 32%, oklch(9% 0.015 265 / 0.6) 52%, oklch(9% 0.015 265 / 0.22) 66%, oklch(9% 0.015 265 / 0) 78%)" />
          <Overlay
            opacity={0.045}
            background="repeating-linear-gradient(0deg, oklch(100% 0 0) 0px, oklch(100% 0 0) 1px, transparent 1px, transparent 3px)"
          />
          <ViewfinderCorners />

          <HudBar
            bus={bus}
            blockedSeed={analysis.exposure.blockedToday}
            onLiveAnalysis={onLiveAnalysis}
          />

          <NarrativeColumn bus={bus}>
            <AttackFeed routes={analysis.exposure.routes} />
          </NarrativeColumn>

          <StageReadouts
            bus={bus}
            panels={[
              <ExtractionReadout key="x" analysis={derived} />,
              <HomographReadout
                key="h"
                analysis={derived}
                charIndex={charIndex}
                onSelectChar={field.selectChar}
              />,
              <EnrichmentReadout key="e" analysis={derived} nodeId={field.selection.nodeId} />,
              <DecisionReadout key="d" analysis={derived} />
            ]}
          />

          <StageRail bus={bus} onGoTo={goTo} />

          {/* Controls */}
          <div
            style={{
              position: 'absolute',
              bottom: 26,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
              padding: '0 clamp(20px, 4vw, 56px)'
            }}
          >
            <button
              type="button"
              onClick={field.emitPulse}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                fontFamily: font.body,
                fontSize: 13,
                fontWeight: 600,
                color: color.text,
                background: 'oklch(100% 0 0 / 0.06)',
                border: '1px solid oklch(100% 0 0 / 0.14)',
                borderRadius: 100,
                padding: '9px 18px',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                whiteSpace: 'nowrap'
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, oklch(72% 0.17 250), oklch(64% 0.17 300))'
                }}
              />
              Re-scan field
            </button>
            <button
              type="button"
              onClick={field.toggleAutoOrbit}
              style={{
                fontFamily: font.body,
                fontSize: 13,
                fontWeight: 600,
                color: 'oklch(78% 0.015 260)',
                background: 'transparent',
                border: '1px solid oklch(100% 0 0 / 0.12)',
                borderRadius: 100,
                padding: '9px 18px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Auto-orbit: {field.autoOrbit ? 'on' : 'off'}
            </button>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 10.5,
                letterSpacing: '0.1em',
                color: 'oklch(54% 0.02 260)',
                whiteSpace: 'nowrap'
              }}
            >
              DRAG TO ORBIT · SCROLL TO ADVANCE
            </span>
          </div>

          <div
            ref={cue}
            style={{
              position: 'absolute',
              bottom: 76,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: font.mono,
              fontSize: 10.5,
              color: 'oklch(58% 0.02 260)',
              pointerEvents: 'none'
            }}
          >
            <span style={{ animation: 'tf-cue 2.2s ease-in-out infinite', display: 'block' }}>
              ↓
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Overlay(props: {
  background?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  maskImage?: string;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: props.background,
        backgroundImage: props.backgroundImage,
        backgroundSize: props.backgroundSize,
        maskImage: props.maskImage,
        WebkitMaskImage: props.maskImage,
        opacity: props.opacity
      }}
    />
  );
}

function ViewfinderCorners() {
  const line = '1px solid oklch(100% 0 0 / 0.16)';
  const base = { position: 'absolute' as const, width: 24, height: 24 };
  return (
    <div style={{ position: 'absolute', inset: 14, pointerEvents: 'none' }}>
      <div style={{ ...base, left: 0, top: 0, borderLeft: line, borderTop: line }} />
      <div style={{ ...base, right: 0, top: 0, borderRight: line, borderTop: line }} />
      <div style={{ ...base, left: 0, bottom: 0, borderLeft: line, borderBottom: line }} />
      <div style={{ ...base, right: 0, bottom: 0, borderRight: line, borderBottom: line }} />
    </div>
  );
}
