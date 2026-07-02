/**
 * DEVELOPER PLATFORM — In-Memory FeatureRepository
 *
 * A pure-memory implementation of the FeatureRepository port.
 * Designed for determinism tests and the ReplayEngine dry-run mode.
 *
 * Design constraints:
 *   - All reads reflect prior writes in the same instance.
 *   - Query semantics match the Prisma implementation exactly.
 *   - nextVersion() returns 1 on first call and increments monotonically.
 */

import type { FeatureRepository } from '@/core/features/repository';
import type {
  FeatureCategory,
  FeatureSetRecord,
  SessionFeatureSetRecord,
  LoadFeatureSetRecord,
  RecoveryFeatureSetRecord,
  BodyFeatureSetRecord,
  ConditionFeatureSetRecord,
  FeatureStatus,
} from '@/core/features/types';

export class InMemoryFeatureRepository implements FeatureRepository {
  private readonly store = new Map<string, FeatureSetRecord>();
  private readonly versions = new Map<string, number>();

  // ─────────────────────────────────────────────────────────────────────────
  // Write
  // ─────────────────────────────────────────────────────────────────────────

  async save(record: FeatureSetRecord): Promise<void> {
    this.store.set(record.id, record);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Session features
  // ─────────────────────────────────────────────────────────────────────────

  async findSessionFeatures(
    athleteId: string,
    sessionObsId: string,
  ): Promise<SessionFeatureSetRecord | null> {
    return (
      this.queryLatestComputed(
        (r): r is SessionFeatureSetRecord =>
          r.athleteId === athleteId && r.category === 'SESSION' && r.sessionObsId === sessionObsId,
      ) ?? null
    );
  }

  async findSessionFeaturesByRange(
    athleteId: string,
    fromTrainingDayId: string,
    toTrainingDayId: string,
  ): Promise<SessionFeatureSetRecord[]> {
    const sessionMap = new Map<string, SessionFeatureSetRecord>();

    for (const record of this.store.values()) {
      if (
        record.athleteId !== athleteId ||
        record.category !== 'SESSION' ||
        record.status !== 'COMPUTED'
      )
        continue;

      const r = record as SessionFeatureSetRecord;
      if (!r.trainingDayId) continue;
      if (r.trainingDayId < fromTrainingDayId || r.trainingDayId > toTrainingDayId) continue;

      const key = r.sessionObsId ?? r.id;
      const existing = sessionMap.get(key);
      if (!existing || r.version > existing.version) {
        sessionMap.set(key, r);
      }
    }

    return [...sessionMap.values()].sort((a, b) =>
      (a.trainingDayId ?? '').localeCompare(b.trainingDayId ?? ''),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Day-scoped features
  // ─────────────────────────────────────────────────────────────────────────

  async findLoadFeatures(
    athleteId: string,
    trainingDayId: string,
  ): Promise<LoadFeatureSetRecord | null> {
    return (
      this.queryLatestComputed(
        (r): r is LoadFeatureSetRecord =>
          r.athleteId === athleteId && r.category === 'LOAD' && r.trainingDayId === trainingDayId,
      ) ?? null
    );
  }

  async findRecoveryFeatures(
    athleteId: string,
    trainingDayId: string,
  ): Promise<RecoveryFeatureSetRecord | null> {
    return (
      this.queryLatestComputed(
        (r): r is RecoveryFeatureSetRecord =>
          r.athleteId === athleteId &&
          r.category === 'RECOVERY' &&
          r.trainingDayId === trainingDayId,
      ) ?? null
    );
  }

  async findBodyFeatures(
    athleteId: string,
    trainingDayId: string,
  ): Promise<BodyFeatureSetRecord | null> {
    return (
      this.queryLatestComputed(
        (r): r is BodyFeatureSetRecord =>
          r.athleteId === athleteId && r.category === 'BODY' && r.trainingDayId === trainingDayId,
      ) ?? null
    );
  }

  async findConditionFeatures(
    athleteId: string,
    trainingDayId: string,
  ): Promise<ConditionFeatureSetRecord | null> {
    return (
      this.queryLatestComputed(
        (r): r is ConditionFeatureSetRecord =>
          r.athleteId === athleteId &&
          r.category === 'CONDITION' &&
          r.trainingDayId === trainingDayId,
      ) ?? null
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Invalidation
  // ─────────────────────────────────────────────────────────────────────────

  async invalidateForTrainingDay(
    athleteId: string,
    trainingDayId: string,
    categories: FeatureCategory[],
  ): Promise<void> {
    const catSet = new Set(categories);
    for (const [id, record] of this.store.entries()) {
      if (
        record.athleteId === athleteId &&
        record.trainingDayId === trainingDayId &&
        catSet.has(record.category) &&
        record.status === 'COMPUTED'
      ) {
        this.store.set(id, { ...record, status: 'INVALIDATED' });
      }
    }
  }

  async invalidateLoadWindow(athleteId: string, fromTrainingDayId: string): Promise<void> {
    const toInvalidate = new Date(fromTrainingDayId);
    toInvalidate.setUTCDate(toInvalidate.getUTCDate() + 42);
    const [toDayId] = toInvalidate.toISOString().split('T');

    for (const [id, record] of this.store.entries()) {
      if (
        record.athleteId === athleteId &&
        record.category === 'LOAD' &&
        record.trainingDayId &&
        record.trainingDayId >= fromTrainingDayId &&
        record.trainingDayId <= toDayId &&
        record.status === 'COMPUTED'
      ) {
        this.store.set(id, { ...record, status: 'INVALIDATED' });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────────────────────────────────────

  async updateStatus(id: string, status: FeatureStatus): Promise<void> {
    const record = this.store.get(id);
    if (record) {
      this.store.set(id, { ...record, status });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Version tracking
  // ─────────────────────────────────────────────────────────────────────────

  async nextVersion(
    athleteId: string,
    category: FeatureCategory,
    trainingDayId?: string,
    sessionObsId?: string,
  ): Promise<number> {
    const key = `${athleteId}:${category}:${trainingDayId ?? ''}:${sessionObsId ?? ''}`;
    const current = this.versions.get(key) ?? 0;
    const next = current + 1;
    this.versions.set(key, next);
    return next;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Dev helpers
  // ─────────────────────────────────────────────────────────────────────────

  getAll(athleteId?: string): FeatureSetRecord[] {
    const all = [...this.store.values()];
    return athleteId ? all.filter((r) => r.athleteId === athleteId) : all;
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    this.versions.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private queryLatestComputed<T extends FeatureSetRecord>(
    predicate: (r: FeatureSetRecord) => r is T,
  ): T | undefined {
    let latest: T | undefined;

    for (const record of this.store.values()) {
      if (!predicate(record) || record.status !== 'COMPUTED') continue;
      if (!latest || record.version > latest.version) {
        latest = record;
      }
    }

    return latest;
  }
}
