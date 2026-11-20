import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import { buildHand, type Limb } from './handGeometry';
import type { GatewayTheme } from './theme';

/** Renders one tapered chain with a shared material. */
function LimbMesh({ limb, material }: { limb: Limb; material: THREE.Material }) {
  return (
    <>
      {limb.segments.map((s, i) => (
        <mesh
          key={`s${i}`}
          material={material}
          position={s.position}
          quaternion={s.quaternion}
        >
          <cylinderGeometry args={s.args} />
        </mesh>
      ))}
      {limb.joints.map((j, i) => (
        <mesh key={`j${i}`} material={material} position={j.position}>
          <sphereGeometry args={[j.radius, 8, 6]} />
        </mesh>
      ))}
    </>
  );
}

export interface WireframeHandProps {
  theme: GatewayTheme;
  /** 0 at rest, 1 at full unlock. Read per-frame; never triggers a render. */
  progress: MotionValue<number>;
  /** Node proximity, 0..1 — brightens the key light. */
  proximity: MotionValue<number>;
  parallax: MutableRefObject<{ x: number; y: number }>;
  reducedMotion: boolean;
}

const HOME = { x: -0.66, y: 0.02 } as const;

export function WireframeHand({
  theme,
  progress,
  proximity,
  parallax,
  reducedMotion
}: WireframeHandProps) {
  const group = useRef<THREE.Group>(null);
  const keyLight = useRef<THREE.PointLight>(null);
  const parts = useMemo(() => buildHand(), []);

  // Wireframe materials read as light themselves; the point lights only add
  // falloff on the knuckle spheres so the structure has volume near the tip.
  const bodyMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: theme.hand,
        wireframe: true,
        transparent: true,
        opacity: 0.62,
        fog: true
      }),
    [theme.hand]
  );
  const tipMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: theme.tip,
        wireframe: true,
        transparent: true,
        opacity: 0.8,
        fog: true
      }),
    [theme.tip]
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = performance.now() / 1000;
    const p = progress.get();
    const hover = proximity.get();

    // Idle breathing, then recoil away from the node on unlock.
    const breathe = reducedMotion ? 0 : Math.sin(t * 0.5) * 0.022;
    g.position.x = HOME.x - p * p * 2.6;
    g.position.y = HOME.y + breathe + Math.sin(t * 0.37) * 0.014;
    g.rotation.y = -0.22 + Math.sin(t * 0.28) * 0.03 + parallax.current.x * 0.1;

    const fade = Math.max(0, 1 - p * 1.5);
    bodyMat.opacity = 0.62 * fade;
    tipMat.opacity = (0.8 - hover * 0.06) * fade;

    if (keyLight.current) {
      keyLight.current.intensity = (2.6 + hover * 1.6) * Math.max(0, 1 - p * 1.4);
    }
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight
        ref={keyLight}
        color={theme.hand}
        intensity={2.6}
        distance={9}
        decay={2}
        position={[-0.6, 0.5, 1.8]}
      />
      <pointLight
        color={0xc8dcff}
        intensity={1.4}
        distance={12}
        decay={2}
        position={[2.4, -1.2, 2.4]}
      />

      <group ref={group} position={[HOME.x, HOME.y, 0]} rotation={[0, -0.22, 0.05]} scale={1.28}>
        <LimbMesh limb={parts.index} material={tipMat} />
        {parts.body.map((limb, i) => (
          // The palm (last entry) is squashed in Z by its own wrapper.
          <group key={i} scale={i === parts.body.length - 1 ? [1, 1, 0.6] : 1} rotation={[0, i === parts.body.length - 1 ? -0.05 : 0, 0]}>
            <LimbMesh limb={limb} material={bodyMat} />
          </group>
        ))}
        <group scale={[1, 1, 0.84]}>
          <LimbMesh limb={parts.arm} material={bodyMat} />
        </group>
      </group>
    </>
  );
}
