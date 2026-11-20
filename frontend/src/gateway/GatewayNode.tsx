import { motion, useTransform, type MotionValue } from 'framer-motion';
import { useState } from 'react';

export interface GatewayNodeProps {
  proximity: MotionValue<number>;
  onActivate: () => void;
  /** Native cursor on touch devices; hidden on pointer devices. */
  isTouch: boolean;
}

/**
 * The interaction node. Reacts to PROXIMITY, not just true hover, so it feels
 * magnetic — and keyboard focus drives the identical glow so the node is never
 * inert for non-mouse users.
 */
export function GatewayNode({ proximity, onActivate, isTouch }: GatewayNodeProps) {
  const [focused, setFocused] = useState(false);

  // Focus pins the glow to full; otherwise it tracks the pointer field.
  const glow = useTransform(proximity, (p) => (focused ? 1 : p));
  const ringScale = useTransform(glow, [0, 1], [1, 1.16]);
  const ringBg = useTransform(glow, (g) => `rgba(228,238,255,${0.055 + g * 0.09})`);
  const ringBorder = useTransform(glow, (g) => `rgba(255,255,255,${0.3 + g * 0.55})`);
  const ringShadow = useTransform(glow, (g) => `0 0 ${18 + g * 46}px rgba(210,228,255,${g * 0.34})`);
  const haloOpacity = useTransform(glow, [0, 1], [0, 1]);
  const triScale = useTransform(glow, [0, 1], [1, 1.14]);

  return (
    <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <button
        type="button"
        aria-label="Initialize Triage Desk"
        onClick={onActivate}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="relative flex h-24 w-24 items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none"
        style={{ cursor: isTouch ? 'pointer' : 'none' }}
      >
        {/* Outer bloom on approach */}
        <motion.span
          aria-hidden
          className="absolute -inset-[30px] rounded-full"
          style={{
            opacity: haloOpacity,
            background:
              'radial-gradient(circle, rgba(220,235,255,0.16) 0%, rgba(220,235,255,0) 62%)'
          }}
        />
        {/* Slow breathing outline */}
        <motion.span
          aria-hidden
          className="absolute -inset-px rounded-full border border-white/10"
          animate={{ scale: [1, 1.012, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3.9, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* The disc */}
        <motion.span
          aria-hidden
          className="absolute inset-3 rounded-full border backdrop-blur-[3px]"
          style={{
            scale: ringScale,
            background: ringBg,
            borderColor: ringBorder,
            boxShadow: ringShadow
          }}
        />
        {/* Play glyph */}
        <motion.span
          aria-hidden
          className="relative ml-1 h-0 w-0 border-y-8 border-l-[13px] border-y-transparent border-l-white/90"
          style={{ scale: triScale }}
        />
      </button>
    </div>
  );
}
