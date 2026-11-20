import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';

export interface ParticleFieldProps {
  count?: number;
  color: number;
  /** 0 at rest, 1 at full unlock — drives the warp-speed streak. */
  progress: MotionValue<number>;
}

/**
 * Sparse, slow-moving 3D dust for depth. On unlock the drift accelerates ~46x
 * toward the camera, which is what sells the warp.
 */
export function ParticleField({ count = 1100, color, progress }: ParticleFieldProps) {
  const points = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const n = Math.max(200, Math.min(3000, count));
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n);
    // Deterministic LCG so the field is identical on every load.
    let seed = 7717;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rnd() - 0.5) * 34;
      pos[i * 3 + 1] = (rnd() - 0.5) * 20;
      pos[i * 3 + 2] = (rnd() - 0.5) * 26 - 4;
      vel[i] = 0.1 + rnd() * 0.5;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    const p = points.current;
    if (!p) return;
    const warp = progress.get();
    const boost = 1 + warp * 46;
    const arr = p.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < velocities.length; i++) {
      arr[i * 3 + 2] += velocities[i] * 0.006 * boost;
      if (arr[i * 3 + 2] > 9) arr[i * 3 + 2] -= 34;
    }
    p.geometry.attributes.position.needsUpdate = true;

    const mat = p.material as THREE.PointsMaterial;
    mat.size = 0.026 + warp * 0.05;
    mat.opacity = 0.55 + warp * 0.4;
    p.rotation.y = (performance.now() / 1000) * 0.006;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.026}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        fog
      />
    </points>
  );
}
