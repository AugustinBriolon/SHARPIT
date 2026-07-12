/**
 * Projected Athlete State — presentation ViewModel contract.
 */

import type { ProjectionHorizonDays } from '@/core/projection/types';

export type ProjectedAthleteCardViewModel = {
  readonly visible: boolean;
  readonly horizonDays: ProjectionHorizonDays;
  /** Phrase de synthèse en langage naturel (verdict unique). */
  readonly synthesisSentence: string;
  /** Jour à risque (yyyy-MM-dd) pour bordure sur le planning. */
  readonly highestRiskTrainingDayId: string | null;
  readonly emptyStateMessage: string | null;
};
