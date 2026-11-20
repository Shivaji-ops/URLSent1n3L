import { useCallback, useEffect, useState } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'framer-motion';
import { SCENE } from './theme';

export type GatewayPhase = 'armed' | 'unlocking' | 'entered';

/**
 * The unlock state machine.
 *
 * `progress` is a MotionValue read inside useFrame by the 3D layer and mapped
 * to CSS by the UI layer — one clock drives the camera dolly, fog collapse,
 * particle warp, hand recoil, UI blur and the white veil together.
 */
export function useUnlockSequence(onEntered?: () => void) {
  const [phase, setPhase] = useState<GatewayPhase>('armed');
  const progress = useMotionValue(0);
  const prefersReduced = useReducedMotion();

  const unlock = useCallback(() => {
    if (phase !== 'armed') return;
    setPhase('unlocking');

    if (prefersReduced) {
      // No warp: hold the scene still and cut through.
      progress.set(0);
      const id = window.setTimeout(() => setPhase('entered'), 260);
      return () => clearTimeout(id);
    }

    animate(progress, 1, {
      duration: SCENE.unlockDurationMs / 1000,
      ease: [0.32, 0, 0.67, 0],
      onComplete: () => setPhase('entered')
    });
  }, [phase, prefersReduced, progress]);

  const rearm = useCallback(() => {
    animate(progress, 0, { duration: 0.5, ease: 'easeOut' });
    setPhase('armed');
  }, [progress]);

  useEffect(() => {
    if (phase === 'entered') onEntered?.();
  }, [phase, onEntered]);

  return { phase, progress, unlock, rearm, prefersReduced: Boolean(prefersReduced) };
}
