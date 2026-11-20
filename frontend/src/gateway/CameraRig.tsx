import { useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { SCENE } from './theme';

export interface CameraRigProps {
  pointer: MutableRefObject<{ x: number; y: number }>;
  /** Written each frame so the hand can share the same parallax. */
  parallax: MutableRefObject<{ x: number; y: number }>;
  progress: MotionValue<number>;
}

/**
 * Mouse parallax at rest; on unlock the camera dollies in and the fog closes,
 * so the scene collapses toward the viewer instead of just fading out.
 */
export function CameraRig({ pointer, parallax, progress }: CameraRigProps) {
  const { camera, scene, size } = useThree();
  const baseZ = useRef(SCENE.cameraZ);

  useFrame(() => {
    baseZ.current = size.width < SCENE.narrowBreakpoint ? SCENE.cameraZNarrow : SCENE.cameraZ;
    const p = progress.get();
    const ease = p * p;

    const px = pointer.current.x / window.innerWidth - 0.5;
    const py = pointer.current.y / window.innerHeight - 0.5;
    parallax.current.x += (px * 0.42 - parallax.current.x) * 0.045;
    parallax.current.y += (-py * 0.28 - parallax.current.y) * 0.045;

    camera.position.set(
      parallax.current.x,
      parallax.current.y,
      baseZ.current - ease * 2.4
    );
    camera.lookAt(0, 0, 0);

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.far = SCENE.fogFar - ease * 7.5;
    }
  });

  return null;
}
