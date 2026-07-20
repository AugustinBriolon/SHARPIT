/**
 * Projected Athlete State — presentation ViewModel contract.
 */

import type { ProjectionHorizonDays } from '@/core/projection/types';

export type ProjectedAthleteCaution = {
  /** Short label, e.g. "Vigilance — sommeil". */
  readonly label: string;
  /** Actionable body: named doubt + impact + attitude. */
  readonly body: string;
};

export type ProjectedAthleteCardViewModel = {
  readonly visible: boolean;
  readonly horizonDays: ProjectionHorizonDays;
  /** Trajectory verdict only (no confidence %). */
  readonly synthesisSentence: string;
  /** Named doubt when an anchor limiter is identifiable. */
  readonly caution: ProjectedAthleteCaution | null;
  /** Jour à risque (yyyy-MM-dd) pour bordure sur le planning. */
  readonly highestRiskTrainingDayId: string | null;
  readonly emptyStateMessage: string | null;
};
