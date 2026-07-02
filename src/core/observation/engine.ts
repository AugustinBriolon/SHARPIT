/**
 * OBSERVATION ENGINE — Public Surface
 *
 * The single entry point for all observations entering SHARPIT.
 * No data may reach the domain (Signal Engine, Models, Digital Twin)
 * without passing through this engine.
 *
 * Invariants:
 *   - An accepted observation is immutable. Its id, quality, and trainingDayId
 *     never change after assignment.
 *   - The engine never interprets observations — it validates, normalizes,
 *     and routes. Interpretation is the Signal Engine's responsibility.
 *   - GARMIN_READINESS and GARMIN_BATTERY are always PROPRIETARY_MODEL quality
 *     regardless of how they are later consumed.
 *   - For conflicts between Garmin and Strava for the same session: Garmin wins.
 *     There are no conflicts to resolve — Strava data for a Garmin-tracked session
 *     is silently deduplicated against the Garmin record.
 */

import { randomUUID } from 'node:crypto';

import type {
  RawObservation,
  Observation,
  IngestionResult,
  BatchIngestionResult,
  ObservationFilter,
  AthleteObservationConfig,
  ObservationType,
  QualityFlag,
} from './types';
import { validate } from './validation';
import { normalize } from './normalization';
import { nullEventBus, type DomainEventBus } from './events';
import type { ObservationRepository } from './repository';

// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────

export type ObservationEngineDeps = {
  repository: ObservationRepository;
  eventBus?: DomainEventBus;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the external platform ID from an observation, if available.
 * Only SESSION (garminId/stravaId) and BODY_COMPOSITION (renphoId) carry one.
 * For all other types, deduplication is handled at the repository layer.
 */
function getExternalId(raw: RawObservation): string | undefined {
  if (raw.type === 'SESSION' || raw.type === 'BODY_COMPOSITION') {
    return raw.externalId;
  }
  return undefined;
}

/**
 * For SESSION observations, Garmin always wins over Strava.
 * If a Garmin record exists and we receive a Strava record for the same session,
 * we skip the Strava record silently (no conflict, no error — Garmin is authoritative).
 *
 * Concretely: we check for an existing SESSION with the same externalId,
 * ignoring the source of the existing record.
 */
type DeduplicationResult = { isDuplicate: false } | { isDuplicate: true; existingId: string };

async function checkDeduplication(
  repository: ObservationRepository,
  athleteId: string,
  type: ObservationType,
  externalId: string | undefined,
): Promise<DeduplicationResult> {
  if (!externalId) return { isDuplicate: false };

  const existing = await repository.findByExternalId(athleteId, type, externalId);
  if (existing) return { isDuplicate: true, existingId: existing.id };

  return { isDuplicate: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export class ObservationEngine {
  private readonly repository: ObservationRepository;
  private readonly eventBus: DomainEventBus;

  constructor(deps: ObservationEngineDeps) {
    this.repository = deps.repository;
    this.eventBus = deps.eventBus ?? nullEventBus;
  }

  /**
   * Ingest a single raw observation.
   *
   * Processing pipeline:
   *   1. Deduplication check (by externalId for SESSION and BODY_COMPOSITION)
   *   2. Validation (range checks, required fields, temporal consistency)
   *   3. Normalization (training-day assignment, quality classification)
   *   4. Persistence (via the repository port)
   *   5. Event emission (ObservationIngested or ObservationRejected)
   */
  async ingest(
    athleteId: string,
    raw: RawObservation,
    config?: AthleteObservationConfig,
  ): Promise<IngestionResult> {
    // Step 1: Deduplication
    const externalId = getExternalId(raw);
    const dedup = await checkDeduplication(this.repository, athleteId, raw.type, externalId);

    if (dedup.isDuplicate) {
      return { status: 'DUPLICATE', existingId: dedup.existingId };
    }

    // Step 2: Validation
    const validation = validate(raw);

    if (!validation.valid) {
      await this.eventBus.publish({
        kind: 'ObservationRejected',
        athleteId,
        type: raw.type,
        source: raw.source,
        reason: validation.reason,
        emittedAt: new Date(),
      });
      return { status: 'REJECTED', reason: validation.reason };
    }

    // Step 3: Normalization
    const id = randomUUID();
    const observation = normalize(id, athleteId, raw, validation.flags, config);

    // Step 4: Persistence
    await this.repository.save(observation);

    // Step 5: Event emission
    await this.eventBus.publish({
      kind: 'ObservationIngested',
      observationId: id,
      athleteId,
      type: raw.type,
      trainingDayId: observation.trainingDayId,
      quality: observation.quality,
      flags: observation.qualityFlags,
      timestamp: raw.timestamp,
      emittedAt: new Date(),
    });

    // Additional event: high-severity physical condition
    if (raw.type === 'PHYSICAL_CONDITION' && raw.severity >= 8) {
      await this.eventBus.publish({
        kind: 'HighSeverityConditionDetected',
        observationId: id,
        athleteId,
        severity: raw.severity,
        category: raw.category,
        bodyRegion: raw.bodyRegion,
        bodySide: raw.bodySide,
        emittedAt: new Date(),
      });
    }

    if (validation.flags.length > 0) {
      return { status: 'ACCEPTED_FLAGGED', observation, flags: validation.flags };
    }

    return { status: 'ACCEPTED', observation };
  }

  /**
   * Ingest multiple raw observations in sequence.
   * Each observation is processed independently — one failure does not halt the batch.
   * Useful for bulk syncs from Garmin or Strava.
   */
  async ingestBatch(
    athleteId: string,
    raws: RawObservation[],
    config?: AthleteObservationConfig,
  ): Promise<BatchIngestionResult> {
    const accepted: Observation[] = [];
    const flagged: Array<{ observation: Observation; flags: ReadonlyArray<QualityFlag> }> = [];
    const rejected: Array<{
      raw: RawObservation;
      reason: BatchIngestionResult['rejected'][number]['reason'];
    }> = [];
    const duplicates: Array<{ raw: RawObservation; existingId: string }> = [];

    for (const raw of raws) {
      const outcome = await this.ingest(athleteId, raw, config);

      switch (outcome.status) {
        case 'ACCEPTED':
          accepted.push(outcome.observation);
          break;
        case 'ACCEPTED_FLAGGED':
          flagged.push({ observation: outcome.observation, flags: outcome.flags });
          break;
        case 'REJECTED':
          rejected.push({ raw, reason: outcome.reason });
          break;
        case 'DUPLICATE':
          duplicates.push({ raw, existingId: outcome.existingId });
          break;
      }
    }

    return {
      accepted,
      flagged,
      rejected,
      duplicates,
      stats: {
        total: raws.length,
        accepted: accepted.length,
        flagged: flagged.length,
        rejected: rejected.length,
        duplicates: duplicates.length,
      },
    };
  }

  /**
   * Query observations for an athlete.
   */
  async find(athleteId: string, filter: ObservationFilter): Promise<Observation[]> {
    return this.repository.find(athleteId, filter);
  }

  /**
   * Find a single observation by its engine-assigned ID.
   */
  async findById(id: string): Promise<Observation | null> {
    return this.repository.findById(id);
  }
}
