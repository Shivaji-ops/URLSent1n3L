import { useMemo } from 'react';
import type { AnalysisResult, DerivedAnalysis } from '@/types/analysis';
import { deriveAnalysis } from '@/lib/analysis';

/** Memoised pure derivation — safe to call from any component. */
export function useDerivedAnalysis(raw: AnalysisResult): DerivedAnalysis {
  return useMemo(() => deriveAnalysis(raw), [raw]);
}
