/**
 * Scenario Comparison — presentation ViewModel.
 */

import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ScenarioKind } from '@/core/scenario/types';

export type ScenarioTechnicalDetail = {
  readonly endVerdict: string;
  readonly endReadiness: string | null;
  readonly endAdaptation: string | null;
  readonly environmentalImpact: string;
  readonly endConfidenceLabel: string | null;
  readonly limitingFactor: string | null;
  readonly preferabilityExplanation: string | null;
  readonly tradeOffs: readonly string[];
};

export type ScenarioComparisonRow = {
  readonly scenarioId: string;
  readonly kind: ScenarioKind;
  readonly label: string;
  /** Phrase unique en langage naturel — pas de dump métriques. */
  readonly summaryLine: string;
  readonly isRecommended: boolean;
  readonly isBaseline: boolean;
  readonly targetSessionId: string | null;
  /** True when applying this row mutates planning (not KEEP_PLAN). */
  readonly canApply: boolean;
  readonly technicalDetail: ScenarioTechnicalDetail;
};

export type ScenarioComparisonViewModel = {
  /** True when a non-baseline scenario is strictly recommended. */
  readonly visible: boolean;
  readonly horizonDays: ProjectionHorizonDays;
  readonly recommendedScenarioId: string | null;
  readonly recommendedScenarioLabel: string | null;
  readonly focusSessionLabel: string | null;
  readonly anchorDecisionDomain: string | null;
  readonly recommendation: string;
  readonly recommendationRationale: string;
  /** Affiché une seule fois quand toutes les alternatives sont équivalentes au plan. */
  readonly sharedEquivalentNote: string | null;
  readonly scenarios: readonly ScenarioComparisonRow[];
  readonly emptyStateMessage: string | null;
};
