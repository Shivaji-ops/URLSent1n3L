import { useCallback, useEffect, useRef } from 'react';

/**
 * Per-frame stage progress WITHOUT React re-renders.
 *
 * The engine pushes `af` here ~11×/s; subscribers mutate their own DOM node
 * styles directly. Only genuinely discrete state (selection, active stage
 * index) goes through useState elsewhere.
 */
export type ProgressListener = (af: number) => void;

export interface ProgressBus {
  publish: (af: number) => void;
  subscribe: (fn: ProgressListener) => () => void;
  /** Last published value, for listeners mounting late. */
  current: () => number;
}

export function useProgressBus(): ProgressBus {
  const listeners = useRef(new Set<ProgressListener>());
  const value = useRef(0);

  const publish = useCallback((af: number) => {
    value.current = af;
    listeners.current.forEach((fn) => fn(af));
  }, []);

  const subscribe = useCallback((fn: ProgressListener) => {
    listeners.current.add(fn);
    fn(value.current);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const current = useCallback(() => value.current, []);

  return { publish, subscribe, current };
}

/** Runs `apply` on every progress tick. Never triggers a render. */
export function useProgressEffect(bus: ProgressBus, apply: ProgressListener): void {
  const ref = useRef(apply);
  ref.current = apply;
  useEffect(() => bus.subscribe((af) => ref.current(af)), [bus]);
}
