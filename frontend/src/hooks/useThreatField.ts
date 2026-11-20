import { useEffect, useRef, useState } from 'react';
import type { AnalysisResult } from '@/types/analysis';
import { ThreatFieldEngine, type EngineOptions } from '@/engine/ThreatFieldEngine';
import type { ProgressBus } from './useStageProgress';

export interface Selection {
  charIndex: number | null;
  nodeId: string | null;
}

export interface UseThreatFieldOptions {
  analysis: AnalysisResult;
  bus: ProgressBus;
  particleCount?: number;
  trailLength?: number;
  bloom?: boolean;
}

/**
 * Owns the engine's lifecycle. The canvas element is rendered by the caller and
 * must NOT be inside a component that re-renders on scroll.
 */
export function useThreatField({
  analysis,
  bus,
  particleCount,
  trailLength,
  bloom
}: UseThreatFieldOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ThreatFieldEngine | null>(null);
  const [selection, setSelection] = useState<Selection>({ charIndex: null, nodeId: null });
  const [autoOrbit, setAutoOrbitState] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const options: EngineOptions = {
      analysis,
      particleCount,
      trailLength,
      bloom,
      onProgress: bus.publish,
      onPick: (pick) =>
        setSelection((prev) => ({
          charIndex: pick.charIndex ?? prev.charIndex,
          nodeId: pick.nodeId ?? prev.nodeId
        }))
    };

    const engine = new ThreatFieldEngine(canvas, options);
    engineRef.current = engine;
    engine.start();

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas);

    const down = (e: PointerEvent) => engine.pointerDown(e);
    const move = (e: PointerEvent) => engine.pointerMove(e);
    const up = (e: PointerEvent) => engine.pointerUp(e);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', up);

    // destroy() is idempotent — Strict Mode's double mount is harmless.
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerleave', up);
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, bus]);

  // Live option updates without a rebuild of the whole engine.
  useEffect(() => {
    if (particleCount != null) engineRef.current?.setOption('particleCount', particleCount);
  }, [particleCount]);
  useEffect(() => {
    if (trailLength != null) engineRef.current?.setOption('trailLength', trailLength);
  }, [trailLength]);
  useEffect(() => {
    if (bloom != null) engineRef.current?.setOption('bloom', bloom);
  }, [bloom]);
  useEffect(() => {
    engineRef.current?.setAutoOrbit(autoOrbit);
  }, [autoOrbit]);

  // React -> engine: readout clicks drive the 3D selection.
  useEffect(() => {
    engineRef.current?.setSelection({
      charIndex: selection.charIndex ?? undefined,
      nodeId: selection.nodeId ?? undefined
    });
  }, [selection]);

  return {
    canvasRef,
    engine: engineRef,
    selection,
    selectChar: (charIndex: number) => setSelection((p) => ({ ...p, charIndex })),
    selectNode: (nodeId: string) => setSelection((p) => ({ ...p, nodeId })),
    autoOrbit,
    toggleAutoOrbit: () => setAutoOrbitState((v) => !v),
    emitPulse: () => engineRef.current?.emitPulse()
  };
}
