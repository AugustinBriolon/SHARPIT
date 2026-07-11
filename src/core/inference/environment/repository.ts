/**
 * Environmental observation persistence port (Phase 2).
 */

import type { EnvironmentalObservationRecord } from '@/core/environment';

export interface EnvironmentalObservationRepository {
  saveMany(records: readonly EnvironmentalObservationRecord[]): Promise<void>;
  findActiveForTrainingDay(
    athleteId: string,
    trainingDayId: string,
  ): Promise<EnvironmentalObservationRecord[]>;
  findByIds(ids: readonly string[]): Promise<EnvironmentalObservationRecord[]>;
  supersedeRecord(recordId: string, supersededById: string): Promise<void>;
}
