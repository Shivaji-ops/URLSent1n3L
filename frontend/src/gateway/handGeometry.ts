import * as THREE from 'three';

/**
 * Procedural wireframe hand — no model file.
 *
 * Every part is a chain of tapered cylinders ("limbs") plus small knuckle
 * spheres. The fingertip of the extended index finger is the GROUP ORIGIN, so
 * the group's position is literally where the tip sits: park it just short of
 * the node and the gap reads as charged rather than empty.
 */

export type Point = readonly [number, number, number];

export interface Segment {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  /** args for CylinderGeometry: radiusTop, radiusBottom, height */
  args: [number, number, number, number, number, boolean];
}

export interface Joint {
  position: [number, number, number];
  radius: number;
}

export interface Limb {
  segments: Segment[];
  joints: Joint[];
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Builds one tapered chain. `radii` must be points.length long.
 * Knuckle spheres are only emitted below 0.16 — at wrist scale a sphere reads
 * as a robot ball joint, which kills the organic silhouette.
 */
export function buildLimb(points: Point[], radii: number[]): Limb {
  const segments: Segment[] = [];
  const joints: Joint[] = [];
  const q = new THREE.Quaternion();

  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 1e-4) continue;

    q.setFromUnitVectors(UP, dir.clone().normalize());
    const mid = a.clone().addScaledVector(dir, 0.5);

    segments.push({
      position: [mid.x, mid.y, mid.z],
      quaternion: [q.x, q.y, q.z, q.w],
      args: [radii[i + 1], radii[i], len, 8, 2, true]
    });

    if (i > 0 && radii[i] < 0.16) {
      joints.push({ position: [a.x, a.y, a.z], radius: radii[i] * 1.04 });
    }
  }

  return { segments, joints };
}

/** Curled finger: forward, down, then back under the palm. */
function curl(x: number, z: number, s: number): Point[] {
  return [
    [x, -0.3 * s, z],
    [x + 0.42 * s, -0.42 * s, z + 0.04],
    [x + 0.48 * s, -0.72 * s, z + 0.06],
    [x + 0.22 * s, -0.88 * s, z + 0.04]
  ];
}

export interface HandParts {
  /** The extended index finger — rendered in the lifted material. */
  index: Limb;
  /** Curled fingers, thumb and palm mass. */
  body: Limb[];
  /** Wrist and forearm, receding into fog. Scaled flat in Z. */
  arm: Limb;
}

export function buildHand(): HandParts {
  const index = buildLimb(
    [
      [0, 0, 0],
      [-0.4, -0.015, 0.01],
      [-0.82, -0.05, 0.02],
      [-1.26, -0.11, 0.04]
    ],
    [0.062, 0.084, 0.098, 0.112]
  );

  const body: Limb[] = [
    buildLimb(curl(-1.3, 0.21, 1), [0.098, 0.086, 0.076, 0.066]),
    buildLimb(curl(-1.35, 0.45, 0.94), [0.092, 0.081, 0.071, 0.062]),
    buildLimb(curl(-1.43, 0.65, 0.82), [0.079, 0.07, 0.061, 0.054]),
    // Thumb, angled toward the viewer.
    buildLimb(
      [
        [-1.74, -0.32, -0.2],
        [-1.32, -0.5, -0.33],
        [-1.0, -0.72, -0.4],
        [-0.84, -0.88, -0.43]
      ],
      [0.135, 0.112, 0.093, 0.078]
    )
  ];

  // Palm is lofted along the hand axis, not a primitive: a box reads as a
  // crate and a cylinder as a slab. The wrapper squashes it in Z.
  const palm = buildLimb(
    [
      [-1.32, -0.14, 0.24],
      [-1.62, -0.17, 0.24],
      [-1.98, -0.21, 0.23],
      [-2.3, -0.26, 0.2]
    ],
    [0.4, 0.455, 0.44, 0.335]
  );

  const arm = buildLimb(
    [
      [-2.32, -0.28, 0.18],
      [-3.1, -0.36, 0.12],
      [-4.6, -0.5, 0.0],
      [-6.6, -0.66, -0.16]
    ],
    [0.3, 0.33, 0.36, 0.36]
  );

  return { index, body: [...body, palm], arm };
}
