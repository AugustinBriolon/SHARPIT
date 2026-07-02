/**
 * FEATURE ENGINE — Repository Port
 *
 * Hexagonal architecture port. The FeatureEngine depends on this interface.
 * No concrete storage technology is referenced here.
 *
 * The Prisma implementation lives in:
 *   src/infrastructure/features/prisma-feature-repository.ts
 */

import type {
  FeatureCategory,
  FeatureSetRecord,
  SessionFeatureSetRecord,
  LoadFeatureSetRecord,
  RecoveryFeatureSetRecord,
  BodyFeatureSetRecord,
  ConditionFeatureSetRecord,
  FeatureStatus,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Save operations
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatureRepository {
  /**
   * Persist a computed FeatureSetRecord.
   * The record already has a stable `id` assigned by the FeatureEngine.
   * Implementation should upsert on (athleteId, category, scope, version).
   */
  save(record: FeatureSetRecord): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Query — session features
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieve the latest computed SessionFeatureSetRecord for a given session.
   * Returns null when no COMPUTED record exists (e.g., extraction not yet run).
   */
  findSessionFeatures(
    athleteId: string,
    sessionObsId: string,
  ): Promise<SessionFeatureSetRecord | null>;

  /**
   * Retrieve all SessionFeatureSetRecords (COMPUTED only) for a range of training days.
   * Used by the LoadExtractor to build the 42-day window.
   *
   * Returns records in ascending trainingDayId order.
   */
  findSessionFeaturesByRange(
    athleteId: string,
    fromTrainingDayId: string,
    toTrainingDayId: string,
  ): Promise<SessionFeatureSetRecord[]>;

  // ─────────────────────────────────────────────────────────────────────────
  // Query — day-scoped features
  // ─────────────────────────────────────────────────────────────────────────

  /** Retrieve the latest LOAD FeatureSetRecord for a training day. */
  findLoadFeatures(athleteId: string, trainingDayId: string): Promise<LoadFeatureSetRecord | null>;

  /** Retrieve the latest RECOVERY FeatureSetRecord for a training day. */
  findRecoveryFeatures(
    athleteId: string,
    trainingDayId: string,
  ): Promise<RecoveryFeatureSetRecord | null>;

  /** Retrieve the latest BODY FeatureSetRecord for a training day. */
  findBodyFeatures(athleteId: string, trainingDayId: string): Promise<BodyFeatureSetRecord | null>;

  /** Retrieve the latest CONDITION FeatureSetRecord for a training day. */
  findConditionFeatures(
    athleteId: string,
    trainingDayId: string,
  ): Promise<ConditionFeatureSetRecord | null>;

  // ─────────────────────────────────────────────────────────────────────────
  // Invalidation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Mark all FeatureSetRecords affected by a new observation as INVALIDATED.
   * The FeatureEngine calls this immediately when an ObservationIngested event arrives.
   *
   * Scope:
   *   - SESSION category: the record for the specific sessionObsId
   *   - LOAD category: all records for any trainingDayId within the 42-day window
   *   - RECOVERY category: the record for the affected trainingDayId
   *   - BODY category: the record for the affected trainingDayId
   *   - CONDITION category: the record for the affected trainingDayId
   */
  invalidateForTrainingDay(
    athleteId: string,
    trainingDayId: string,
    categories: FeatureCategory[],
  ): Promise<void>;

  /**
   * Mark load features as INVALIDATED for all training days in a 42-day window.
   * Called when a new SESSION observation arrives (since it affects the rolling window).
   */
  invalidateLoadWindow(athleteId: string, fromTrainingDayId: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Update the status of a FeatureSetRecord (e.g., PENDING → COMPUTING → COMPUTED).
   * Used during the computation lifecycle.
   */
  updateStatus(id: string, status: FeatureStatus): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // Version tracking
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Return the next version number for a given (athleteId, category, scope).
   * Versions are monotonically increasing and never reused.
   */
  nextVersion(
    athleteId: string,
    category: FeatureCategory,
    trainingDayId?: string,
    sessionObsId?: string,
  ): Promise<number>;
}
