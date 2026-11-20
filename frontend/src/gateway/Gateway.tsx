import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useTransform } from 'framer-motion';
import { CustomCursor } from './CustomCursor';
import { GatewayNode } from './GatewayNode';
import { GatewayScene } from './GatewayScene';
import { useMagneticPointer } from './useMagneticPointer';
import { useUnlockSequence } from './useUnlockSequence';
import { GATEWAY_THEMES, type GatewayAccent } from './theme';

export interface GatewayProps {
  /** Fired once the unlock sequence completes. */
  onEnter: () => void;
  accent?: GatewayAccent;
  particleCount?: number;
}

/**
 * The gateway: a dramatic entry point to the pipeline.
 *
 * Layers, back to front: fixed WebGL canvas -> CSS bloom -> warp flare ->
 * vignette -> scanlines -> UI -> white veil -> custom cursor.
 */
export function Gateway({ onEnter, accent = 'threat-red', particleCount = 1100 }: GatewayProps) {
  const theme = GATEWAY_THEMES[accent];
  const parallax = useRef({ x: 0, y: 0 });
  const { ringX, ringY, dotX, dotY, proximity, pointer, isTouch } = useMagneticPointer();
  const { phase, progress, unlock, rearm, prefersReduced } = useUnlockSequence();
  const [latency, setLatency] = useState(11);

  // Derived CSS from the single unlock clock.
  const uiOpacity = useTransform(progress, [0, 0.52], [1, 0]);
  const uiBlur = useTransform(progress, (p) => `blur(${p * 5}px)`);
  const flareOpacity = useTransform(progress, [0, 0.36, 0.72], [0, 0.9, 0]);
  const veilOpacity = useTransform(progress, [0.62, 1], [0, 1]);

  useEffect(() => {
    const id = window.setInterval(() => setLatency(9 + Math.floor(Math.random() * 5)), 900);
    return () => clearInterval(id);
  }, []);

  const armed = phase === 'armed';

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-void font-mono text-white/85"
      style={{ cursor: isTouch || !armed ? 'auto' : 'none' }}
    >
      <GatewayScene
        theme={theme}
        progress={progress}
        proximity={proximity}
        pointer={pointer}
        parallax={parallax}
        particleCount={particleCount}
        reducedMotion={prefersReduced}
      />

      {/* Accent bloom behind the node */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-1/2 h-[780px] w-[780px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: `radial-gradient(circle, rgba(${theme.glow},0.10) 0%, rgba(${theme.glow},0.035) 34%, rgba(5,5,5,0) 66%)`
        }}
      />

      {/* Warp flare — peaks mid-sequence */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          opacity: flareOpacity,
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 12%, rgba(150,190,255,0.10) 42%, rgba(255,255,255,0) 72%)'
        }}
      />

      {/* Vignette + scanlines */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 50%, rgba(5,5,5,0) 42%, rgba(5,5,5,0.55) 78%, rgba(5,5,5,0.92) 100%)'
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          background:
            'repeating-linear-gradient(0deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 3px)'
        }}
      />

      {/* ---------------- UI layer ---------------- */}
      <motion.div
        className="pointer-events-none fixed inset-0"
        style={{ opacity: uiOpacity, filter: uiBlur }}
      >
        <div className="animate-gw-drift absolute left-[clamp(24px,4vw,52px)] top-[30px] flex items-center gap-[11px]">
          <div
            aria-hidden
            className="h-5 w-5"
            style={{
              background: 'linear-gradient(150deg, #ff8a9b, #ff5c74)',
              clipPath: 'polygon(50% 0%, 100% 20%, 100% 65%, 50% 100%, 0% 65%, 0% 20%)'
            }}
          />
          <span className="font-display text-[13px] font-medium tracking-[0.02em] text-white/80">
            Triage Desk
          </span>
        </div>

        <div className="animate-gw-drift pointer-events-auto absolute right-[clamp(24px,4vw,52px)] top-[26px] [animation-delay:320ms]">
          <button
            type="button"
            onClick={unlock}
            style={{ cursor: isTouch ? 'pointer' : 'none' }}
            className="group flex items-center gap-3 whitespace-nowrap rounded-[3px] border border-white/[0.14] bg-white/[0.015] px-[15px] py-[9px] text-[11px] tracking-[0.09em] text-white/60 transition-all duration-[260ms] hover:border-white/40 hover:bg-white/5 hover:text-white/95 hover:shadow-[0_0_22px_rgba(255,255,255,0.07)]"
          >
            request access
            <span className="inline-block transition-transform duration-[320ms] ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-x-1">
              &rarr;
            </span>
          </button>
        </div>

        <GatewayNode proximity={proximity} onActivate={unlock} isTouch={isTouch} />

        <div className="animate-gw-drift absolute left-1/2 top-[calc(50%+84px)] flex -translate-x-1/2 flex-col items-center gap-[7px] [animation-delay:620ms]">
          <div className="whitespace-nowrap text-[10.5px] tracking-[0.16em] text-white/[0.36]">
            Triage Desk OS v1.0.4
          </div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="animate-gw-blink h-[5px] w-[5px] rounded-full"
              style={{ background: '#ff5c74', boxShadow: '0 0 8px rgba(255,92,116,0.8)' }}
            />
            <span className="whitespace-nowrap text-[10.5px] tracking-[0.16em] text-[rgba(255,138,155,0.72)]">
              {phase === 'unlocking' ? 'Initializing\u2026' : 'System Armed'}
            </span>
          </div>
        </div>

        <div className="animate-gw-drift absolute bottom-[34px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 [animation-delay:780ms]">
          <div className="whitespace-nowrap text-[10.5px] tracking-[0.08em] text-white/30">
            hello@triagedesk.com
          </div>
          <div className="whitespace-nowrap text-[10px] tracking-[0.08em] text-white/[0.16]">
            &copy; 2026 Triage Desk Inc.
          </div>
        </div>

        <div className="absolute bottom-[34px] left-[clamp(24px,4vw,52px)] whitespace-nowrap text-[10px] tracking-[0.14em] text-white/[0.16]">
          CLICK TO INITIALIZE
        </div>
        <div className="absolute bottom-[34px] right-[clamp(24px,4vw,52px)] whitespace-nowrap text-[10px] tracking-[0.14em] text-white/[0.16]">
          NODE 00 &middot; {latency} ms
        </div>
      </motion.div>

      {/* White-out */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-white"
        style={{ opacity: veilOpacity }}
      />

      {/* ---------------- entry panel ---------------- */}
      <AnimatePresence>
        {phase === 'entered' ? (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-void"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <motion.div
              className="flex flex-col items-center gap-5 px-6 text-center"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="flex items-center gap-[9px]">
                <span
                  aria-hidden
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: '#5cffa8', boxShadow: '0 0 9px rgba(92,255,168,0.85)' }}
                />
                <span className="text-[10.5px] tracking-[0.18em] text-[rgba(140,255,196,0.8)]">
                  GATEWAY UNLOCKED
                </span>
              </div>
              <h1 className="m-0 font-display text-[clamp(28px,4vw,46px)] font-medium tracking-[-0.02em] text-white/95">
                Welcome to the desk.
              </h1>
              <p className="m-0 max-w-[380px] text-xs leading-[1.7] tracking-[0.04em] text-white/[0.42]">
                Five stages of indicator analysis, from global exposure to an explainable verdict.
              </p>
              <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={onEnter}
                  className="whitespace-nowrap rounded-[3px] bg-white/95 px-5 py-[11px] text-[11px] tracking-[0.1em] text-void transition-colors hover:bg-white"
                >
                  ENTER PIPELINE &rarr;
                </button>
                <button
                  type="button"
                  onClick={rearm}
                  className="whitespace-nowrap rounded-[3px] border border-white/[0.16] bg-transparent px-5 py-[11px] text-[11px] tracking-[0.1em] text-white/60 transition-colors hover:border-white/30 hover:text-white/90"
                >
                  RE-ARM GATEWAY
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CustomCursor
        ringX={ringX}
        ringY={ringY}
        dotX={dotX}
        dotY={dotY}
        proximity={proximity}
        visible={!isTouch && armed}
      />
    </div>
  );
}
