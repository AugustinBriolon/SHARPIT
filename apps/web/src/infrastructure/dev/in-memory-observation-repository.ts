/**
 * DEVELOPER PLATFORM — In-Memory ObservationRepository
 *
 * A pure-memory implementation of the ObservationRepository port.
 * Designed for determinism tests and dev tooling — no database required.
 *
 * Guarantees:
 *   - Reads reflect all prior writes within the same instance.
 *   - No external side effects.
 *   - Fully synchronous internally (async interface is preserved for compatibility).
 */

import type { ObservationRepository } from '@/core/observation/repository';
import type { Observation, ObservationFilter, ObservationType } from '@/core/observation/types';

export class InMemoryObservationRepository implements ObservationRepository {
  private readonly store = new Map<string, Observation>();

  // ─────────────────────────────────────────────────────────────────────────
  // Write
  // ─────────────────────────────────────────────────────────────────────────

  async save(observation: Observation): Promise<void> {
    this.store.set(observation.id, observation);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Reads
  // ─────────────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<Observation | null> {
    return this.store.get(id) ?? null;
  }

  async find(athleteId: string, filter: ObservationFilter): Promise<Observation[]> {
    let results = [...this.store.values()].filter((o) => o.athleteId === athleteId);

    if (filter.types && filter.types.length > 0) {
      const typeSet = new Set(filter.types);
      results = results.filter((o) => typeSet.has(o.type));
    }

    if (filter.trainingDayId) {
      results = results.filter((o) => o.trainingDayId === filter.trainingDayId);
    }

    if (filter.trainingDayIds && filter.trainingDayIds.length > 0) {
      const daySet = new Set(filter.trainingDayIds);
      results = results.filter((o) => daySet.has(o.trainingDayId));
    }

    if (filter.since) {
      results = results.filter((o) => o.timestamp >= filter.since!);
    }

    if (filter.until) {
      results = results.filter((o) => o.timestamp <= filter.until!);
    }

    return results;
  }

  async findByExternalId(
    athleteId: string,
    type: ObservationType,
    externalId: string,
  ): Promise<Observation | null> {
    return (
      [...this.store.values()].find(
        (o) =>
          o.athleteId === athleteId &&
          o.type === type &&
          'externalId' in o &&
          (o as { externalId?: string }).externalId === externalId,
      ) ?? null
    );
  }

  async findByTimeRange(params: {
    athleteId: string;
    type: ObservationType;
    from: Date;
    to: Date;
  }): Promise<Observation[]> {
    return [...this.store.values()].filter(
      (o) =>
        o.athleteId === params.athleteId &&
        o.type === params.type &&
        o.timestamp >= params.from &&
        o.timestamp <= params.to,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dev helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Return all stored observations for an athlete, sorted by timestamp ascending. */
  getAll(athleteId?: string): Observation[] {
    const all = [...this.store.values()];
    const filtered = athleteId ? all.filter((o) => o.athleteId === athleteId) : all;
    return filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}
