import { motion, useTransform, type MotionValue } from 'framer-motion';

export interface CustomCursorProps {
  ringX: MotionValue<number>;
  ringY: MotionValue<number>;
  dotX: MotionValue<number>;
  dotY: MotionValue<number>;
  proximity: MotionValue<number>;
  visible: boolean;
}

/** Ring + dot cursor. Scale and border brightness track proximity. */
export function CustomCursor({
  ringX,
  ringY,
  dotX,
  dotY,
  proximity,
  visible
}: CustomCursorProps) {
  const ringScale = useTransform(proximity, [0, 1], [1, 1.85]);
  const ringAlpha = useTransform(proximity, [0, 1], [0.32, 0.74]);
  const ringBorder = useTransform(ringAlpha, (a) => `1px solid rgba(255,255,255,${a})`);
  const dotScale = useTransform(proximity, [0, 1], [1, 0.5]);

  if (!visible) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 -ml-[17px] -mt-[17px] h-[34px] w-[34px] rounded-full will-change-transform"
        style={{ x: ringX, y: ringY, scale: ringScale, border: ringBorder }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 -ml-[2px] -mt-[2px] h-1 w-1 rounded-full bg-white will-change-transform"
        style={{ x: dotX, y: dotY, scale: dotScale }}
      />
    </>
  );
}
