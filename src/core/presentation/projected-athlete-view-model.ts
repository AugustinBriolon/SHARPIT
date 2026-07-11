/**
 * Projected Athlete State — presentation ViewModel contract.
 */

import type { ProjectionHorizonDays } from '@/core/projection/types';

export type ProjectedMetricRow = {
  readonly label: string;
  readonly value: string;
  readonly detail: string | null;
};

export type ProjectedHorizonDay = {
  readonly trainingDayId: string;
  readonly dateLabel: string;
  readonly readiness: string | null;
  readonly fatigue: string | null;
  readonly adaptation: string | null;
  readonly verdictLabel: string;
  readonly limitingFactor: string | null;
  readonly projectionConfidenceLabel: string | null;
  readonly isPeakReadiness: boolean;
  readonly isHighestRisk: boolean;
};

export type ProjectedAthleteCardViewModel = {
  readonly visible: boolean;
  readonly horizonDays: ProjectionHorizonDays;
  readonly headline: string;
  readonly planningConfidenceLabel: string | null;
  readonly metrics: readonly ProjectedMetricRow[];
  readonly riskLines: readonly string[];
  readonly horizonDaysPreview: readonly ProjectedHorizonDay[];
  readonly peakReadinessLabel: string | null;
  readonly highestRiskLabel: string | null;
  readonly mainLimitingFactorLabel: string | null;
  readonly assumptions: readonly string[];
  readonly emptyStateMessage: string | null;
};
