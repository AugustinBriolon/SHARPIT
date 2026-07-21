import { EMPTY_GLOBAL_DECISION } from '@/core/presentation/global-decision-context';
import type { PhysicalHealthViewModel } from '@/core/presentation/physical-health-view-model';

/** Stable suivi physique chrome for cold-start / placeholder micro-skeletons. */
export function physicalHealthLoadingShell(): PhysicalHealthViewModel {
  return {
    aggregate: {
      activeCount: 0,
      resolvedCount: 0,
      maxSeverity: 0,
      aggregateTrainingCapacity: 'FULL',
      aggregateTrainingCapacityLabel: '',
      trainingBlocked: false,
      confidencePct: 0,
      confidenceTone: 'neutral',
      decisionVerdict: '',
      decisionLabel: '',
      primaryConditionLabel: null,
    },
    activeConditions: [],
    resolvedConditions: [],
    globalDecision: EMPTY_GLOBAL_DECISION,
    medicalDisclaimer:
      "SHARPIT estime ton état physique à partir de tes observations. Ce n'est pas un diagnostic médical ni un avis de traitement.",
    emptyState: null,
    hierarchy: { rootId: 'physical-health', order: [] },
    sections: [],
  };
}
