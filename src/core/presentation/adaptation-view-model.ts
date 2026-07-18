import type { ProductInsightBundle } from '@/core/product-insight/types';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import type {
  PresentationEmptyState,
  PresentationHierarchy,
  PresentationSection,
} from '@/core/presentation/types';
import type { DimensionResult } from '@/hooks/use-today';

export type AdaptationDimensionVm = {
  key: string;
  label: string;
  description: string;
  dim: DimensionResult;
};

export type AdaptationViewModel = {
  adaptationIndex: number | null;
  statusLabel: string;
  statusClassName: string;
  trendLabel: string;
  verdictLabel: string;
  verdictClassName: string;
  /** Decision engine verdict key — used for explained synthesis, not display. */
  verdictKey: string;
  loadMultiplier: number;
  rationale: string[];
  keyEvidence: string[];
  limitingFactor: string | null;
  plateauRisk: boolean;
  overreachingWithoutAdaptation: boolean;
  dimensions: AdaptationDimensionVm[];
  availableDimCount: number;
  historyLength: number;

  confidencePct: number;
  confidenceTone: 'good' | 'warn' | 'neutral' | 'bad';

  insights: ProductInsightBundle;

  globalDecision: GlobalDecisionContext;

  emptyState: PresentationEmptyState | null;
  hierarchy: PresentationHierarchy;
  sections: PresentationSection[];
};
