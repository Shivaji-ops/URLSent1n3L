import type { DerivedAnalysis } from '@/types/analysis';
import type { Camera, Painter } from '../painter';
import type { SceneData } from '../sceneData';

/** What every scene receives. Scenes are pure draw functions over this. */
export interface SceneContext {
  painter: Painter;
  camera: Camera;
  /** Smoothed stage position, 0..4. */
  af: number;
  /** Seconds since engine start. */
  time: number;
  /** 0..1 visibility weight of this scene. */
  weight: number;
  data: SceneData;
  analysis: DerivedAnalysis;
  /** Index of the glyph the user selected (homograph). */
  charIndex: number;
  /** Id of the intel node the user selected (enrichment). */
  nodeId: string;
}

/** [screenX, screenY, radius, payload] — hit targets published per frame. */
export type PickTarget<T> = [number, number, number, T];
