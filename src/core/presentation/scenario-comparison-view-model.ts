/**
 * Scenario Comparison — presentation ViewModel.
 */

import type { ScenarioKind } from '@/core/scenario/types';

export type ScenarioComparisonRow = {
  readonly scenarioId: string;
  readonly kind: ScenarioKind;
  readonly label: string;
  readonly rationale: string;
  readonly endVerdict: string;
  readonly endConfidenceLabel: string | null;
  readonly limitingFactor: string | null;
  readonly endReadiness: string | null;
  readonly endAdaptation: string | null;
  readonly environmentalImpact: string;
  readonly preferabilityExplanation: string;
  readonly tradeOffs: readonly string[];
  readonly isRecommended: boolean;
  readonly isBaseline: boolean;
};

export type ScenarioComparisonViewModel = {
  readonly visible: boolean;
  readonly focusSessionLabel: string | null;
  readonly anchorDecisionDomain: string | null;
  readonly recommendation: string;
  readonly recommendationRationale: string;
  readonly comparisonMethod: string;
  readonly scenarios: readonly ScenarioComparisonRow[];
  readonly emptyStateMessage: string | null;
};
