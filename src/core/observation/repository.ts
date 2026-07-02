/**
 * OBSERVATION ENGINE — Repository Port
 *
 * This interface is a port in the hexagonal architecture sense.
 * The engine depends on this contract; no concrete storage technology
 * is referenced here.
 *
 * The Prisma implementation lives in:
 *   src/infrastructure/observation/prisma-observation-repository.ts
 *   (to be created in Phase 2)
 */

import type { Observation, ObservationFilter, ObservationType } from './types';

export interface ObservationRepository {
  /**
   * Persist a validated + normalized observation.
   * The observation already has an immutable `id` assigned by the engine.
   * The implementation may perform an upsert for idempotency.
   */
  save(observation: Observation): Promise<void>;

  /**
   * Find a single observation by its engine-assigned ID.
   */
  findById(id: string): Promise<Observation | null>;

  /**
   * Find observations for an athlete matching the given filter.
   * Returns an empty array when no results are found (never throws for "not found").
   */
  find(athleteId: string, filter: ObservationFilter): Promise<Observation[]>;

  /**
   * Find an observation by its source-platform identifier.
   * Used for deduplication before persisting a new observation.
   *
   * Only SESSION and BODY_COMPOSITION observations carry an externalId.
   * Returns null when no match is found.
   */
  findByExternalId(
    athleteId: string,
    type: ObservationType,
    externalId: string,
  ): Promise<Observation | null>;

  /**
   * Find observations of a given type within a timestamp range.
   * Used to detect temporal overlaps (e.g., duplicate sleep observations for the same night).
   */
  findByTimeRange(params: {
    athleteId: string;
    type: ObservationType;
    from: Date;
    to: Date;
  }): Promise<Observation[]>;
}
