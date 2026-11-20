import { Canvas } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import type { MotionValue } from 'framer-motion';
import { CameraRig } from './CameraRig';
import { ParticleField } from './ParticleField';
import { WireframeHand } from './WireframeHand';
import { SCENE, type GatewayTheme } from './theme';

export interface GatewaySceneProps {
  theme: GatewayTheme;
  progress: MotionValue<number>;
  proximity: MotionValue<number>;
  pointer: MutableRefObject<{ x: number; y: number }>;
  parallax: MutableRefObject<{ x: number; y: number }>;
  particleCount?: number;
  reducedMotion: boolean;
}

/**
 * Fixed full-viewport WebGL layer. Sits behind the UI and never re-renders on
 * interaction — everything animated reads MotionValues inside useFrame.
 */
export function GatewayScene({
  theme,
  progress,
  proximity,
  pointer,
  parallax,
  particleCount,
  reducedMotion
}: GatewaySceneProps) {
  return (
    <Canvas
      className="fixed inset-0 h-screen w-screen"
      dpr={[1, 1.75]}
      camera={{ fov: 42, position: [0, 0, SCENE.cameraZ], near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor(SCENE.background, 1)}
    >
      <fog attach="fog" args={[SCENE.background, SCENE.fogNear, SCENE.fogFar]} />
      <CameraRig pointer={pointer} parallax={parallax} progress={progress} />
      <WireframeHand
        theme={theme}
        progress={progress}
        proximity={proximity}
        parallax={parallax}
        reducedMotion={reducedMotion}
      />
      <ParticleField count={particleCount} color={theme.dust} progress={progress} />
    </Canvas>
  );
}
