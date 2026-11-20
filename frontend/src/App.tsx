import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AnalysisPipeline } from '@/components/AnalysisPipeline';
import { LiveAnalysis } from '@/components/LiveAnalysis';
import { Gateway } from '@/gateway/Gateway';
import { MOCK_ANALYSIS } from '@/lib/mockAnalysis';

type View = 'gateway' | 'pipeline' | 'live';

/**
 * Two views, no router: the gateway hands off to the pipeline.
 *
 * Swap MOCK_ANALYSIS for a fetched AnalysisResult when the API lands, e.g.
 *
 *   const { data, isLoading, error } = useQuery({
 *     queryKey: ['analysis', url],
 *     queryFn: () => fetchAnalysis(url)
 *   });
 *   if (isLoading) return <PipelineSkeleton />;
 *   if (error || !data) return <PipelineError onRetry={refetch} />;
 *   return <AnalysisPipeline analysis={data} />;
 *
 * Add react-router here if the gateway needs its own URL.
 */
export default function App() {
  const [view, setView] = useState<View>('gateway');
  const enter = useCallback(() => setView('pipeline'), []);
  const openLive = useCallback(() => setView('live'), []);

  return (
    <AnimatePresence mode="wait">
      {view === 'gateway' ? (
        <motion.div key="gateway" exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <Gateway onEnter={enter} accent="threat-red" />
        </motion.div>
      ) : view === 'pipeline' ? (
        <motion.div
          key="pipeline"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <AnalysisPipeline analysis={MOCK_ANALYSIS} onLiveAnalysis={openLive} />
        </motion.div>
      ) : (
        <motion.div
          key="live"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <LiveAnalysis onBack={enter} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
