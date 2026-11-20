import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion';
import { SCENE } from './theme';

export interface MagneticPointer {
  /** Spring-followed ring position. */
  ringX: MotionValue<number>;
  ringY: MotionValue<number>;
  /** Snappier inner dot. */
  dotX: MotionValue<number>;
  dotY: MotionValue<number>;
  /** 0..1 nearness to the node — drives node glow AND cursor scale. */
  proximity: MotionValue<number>;
  /** Raw pointer, for the camera parallax (read in useFrame, not rendered). */
  pointer: MutableRefObject<{ x: number; y: number }>;
  /** True when the device has no hover — suppress the custom cursor entirely. */
  isTouch: boolean;
}

/**
 * The magnetic cursor.
 *
 * Inside a 190px field the ring's TARGET bends toward the node, so the cursor
 * appears pulled in rather than merely following. Proximity is a MotionValue,
 * not state: the node lights up on approach without a single re-render.
 */
export function useMagneticPointer(centre?: { x: number; y: number }): MagneticPointer {
  const isTouch = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches === true,
    []
  );

  // Start centred — at 0,0 the cursor sits in the corner until first move.
  const start = () => ({
    x: typeof window === 'undefined' ? 0 : window.innerWidth / 2,
    y: typeof window === 'undefined' ? 0 : window.innerHeight / 2
  });

  const initial = useRef(start());
  const pointer = useRef(initial.current);

  const rawX = useMotionValue(initial.current.x);
  const rawY = useMotionValue(initial.current.y);
  const dotX = useSpring(rawX, { stiffness: 900, damping: 42, mass: 0.35 });
  const dotY = useSpring(rawY, { stiffness: 900, damping: 42, mass: 0.35 });

  const pulledX = useMotionValue(initial.current.x);
  const pulledY = useMotionValue(initial.current.y);
  const ringX = useSpring(pulledX, { stiffness: 260, damping: 30, mass: 0.6 });
  const ringY = useSpring(pulledY, { stiffness: 260, damping: 30, mass: 0.6 });

  const proximity = useSpring(0, { stiffness: 180, damping: 26, mass: 0.5 });

  useEffect(() => {
    if (isTouch) return;
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
      rawX.set(e.clientX);
      rawY.set(e.clientY);

      const cx = centre?.x ?? window.innerWidth / 2;
      const cy = centre?.y ?? window.innerHeight / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const mag = dist < SCENE.magneticField ? (1 - dist / SCENE.magneticField) ** 1.6 : 0;

      proximity.set(mag);
      pulledX.set(e.clientX - dx * mag * 0.62);
      pulledY.set(e.clientY - dy * mag * 0.62);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [centre?.x, centre?.y, isTouch, proximity, pulledX, pulledY, rawX, rawY]);

  return { ringX, ringY, dotX, dotY, proximity, pointer, isTouch };
}
