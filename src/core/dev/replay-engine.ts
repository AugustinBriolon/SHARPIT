/**
 * DEVELOPER PLATFORM — Replay Engine
 *
 * Replays an athlete's observation history through the Feature Extraction Layer
 * and produces deterministic FeatureSets.
 *
 * Core guarantees:
 *   1. DETERMINISM: Given the same observation history and ExtractionContext,
 *      two replay runs always produce bit-identical feature values (same checksums).
 *   2. ORDER: Training days are processed in ascending chronological order so that
 *      each day's load window already has its prior days' session features available.
 *   3. ISOLATION: dry-run mode uses an in-memory repository — no production data
 *      is touched. write mode updates the production FeatureRepository.
 *
 * Architecture:
 *   - The ReplayEngine wraps the FeatureEngine with a configurable repository.
 *   - In dry-run mode, an InMemoryFeatureRepository is used per-run.
 *   - The ExtractionContextProvider is the same as in production (current athlete state).
 *
 * Volatile fields (id, computedAt, createdAt) will DIFFER between runs.
 * Determinism is defined over the `data` payload only — verified via checksums.
 */

import { checksumFeatureData } from './checksum';
import { EngineMetricsCollector } from './metrics';
import { FeatureEngine } from '@/core/features/engine';
import type { ExtractionContextProvider } from '@/core/features/engine';
import type { ObservationRepository } from '@/core/observation/repository';
import type { FeatureRepository } from '@/core/features/repository';
import type { DayFeatures, FeatureCategory } from '@/core/features/types';
import { InMemoryFeatureRepository } from '@/infrastructure/dev/in-memory-feature-repository';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ReplayMode = 'dry-run' | 'write';

export type ReplayOptions = {
  /** Athlete to replay. */
  readonly athleteId: string;
  /** Start of replay window (inclusive). Defaults to 90 days ago. */
  readonly since?: Date;
  /** End of replay window (inclusive). Defaults to today. */
  readonly until?: Date;
  /**
   * dry-run: compute but do not persist to production repository.
   * write: persist results to production repository (replaces INVALIDATED records).
   *
   * Default: 'dry-run'
   */
  readonly mode?: ReplayMode;
};

export type ReplayDayResult = {
  readonly trainingDayId: string;
  readonly sessionCount: number;
  readonly categories: readonly FeatureCategory[];
  readonly checksums: Readonly<Record<string, string>>;
  readonly durationMs: number;
  readonly error?: string;
};

export type ReplayResult = {
  readonly athleteId: string;
  readonly fromTrainingDayId: string;
  readonly toTrainingDayId: string;
  readonly mode: ReplayMode;
  readonly days: readonly ReplayDayResult[];
  readonly summary: {
    readonly daysAttempted: number;
    readonly daysSucceeded: number;
    readonly daysFailed: number;
    readonly totalFeatureSets: number;
    readonly totalDurationMs: number;
  };
  /** Flat map of checksums per feature scope across all days. */
  readonly allChecksums: Readonly<Record<string, string>>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function dateToDayId(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(dayId: string, n: number): string {
  const [y, m, day] = dayId.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

function enumerateDays(from: string, to: string): string[] {
  const days: string[] = [];
  let current = from;
  while (current <= to) {
    days.push(current);
    current = addDays(current, 1);
  }
  return days;
}

function checksumDay(dayFeatures: DayFeatures): Record<string, string> {
  const result: Record<string, string> = {};

  for (const session of dayFeatures.sessions) {
    result[`session:${session.sessionObsId}`] = checksumFeatureData(session);
  }

  if (dayFeatures.load !== 'PENDING') {
    result[`load:${dayFeatures.trainingDayId}`] = checksumFeatureData(dayFeatures.load);
  }

  if (dayFeatures.recovery !== 'PENDING') {
    result[`recovery:${dayFeatures.trainingDayId}`] = checksumFeatureData(dayFeatures.recovery);
  }

  if (dayFeatures.body !== 'PENDING') {
    result[`body:${dayFeatures.trainingDayId}`] = checksumFeatureData(dayFeatures.body);
  }

  if (dayFeatures.condition !== 'PENDING') {
    result[`condition:${dayFeatures.trainingDayId}`] = checksumFeatureData(dayFeatures.condition);
  }

  return result;
}

function categoriesFromDayFeatures(dayFeatures: DayFeatures): FeatureCategory[] {
  const cats: FeatureCategory[] = [];
  if (dayFeatures.sessions.length > 0) cats.push('SESSION');
  if (dayFeatures.load !== 'PENDING') cats.push('LOAD');
  if (dayFeatures.recovery !== 'PENDING') cats.push('RECOVERY');
  if (dayFeatures.body !== 'PENDING') cats.push('BODY');
  if (dayFeatures.condition !== 'PENDING') cats.push('CONDITION');
  return cats;
}

// ─────────────────────────────────────────────────────────────────────────────
// ReplayEngine
// ─────────────────────────────────────────────────────────────────────────────

export class ReplayEngine {
  constructor(
    private readonly obsRepo: ObservationRepository,
    private readonly productionFeatureRepo: FeatureRepository,
    private readonly contextProvider: ExtractionContextProvider,
  ) {}

  /**
   * Replay observations through the Feature Extraction Layer.
   *
   * Processing order: ascending training day (required for correct load windows).
   */
  async replay(options: ReplayOptions): Promise<ReplayResult> {
    const { athleteId } = options;
    const mode = options.mode ?? 'dry-run';

    const today = new Date();
    const since = options.since ?? new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const until = options.until ?? today;

    const fromDayId = dateToDayId(since);
    const toDayId = dateToDayId(until);

    const days = enumerateDays(fromDayId, toDayId);

    // In dry-run mode, use an isolated in-memory repository.
    // In write mode, use the production repository directly.
    const featureRepo: FeatureRepository =
      mode === 'dry-run' ? new InMemoryFeatureRepository() : this.productionFeatureRepo;

    const metrics = new EngineMetricsCollector();
    const engine = new FeatureEngine({
      featureRepository: featureRepo,
      observationRepository: this.obsRepo,
      contextProvider: this.contextProvider,
      metrics,
    });

    const dayResults: ReplayDayResult[] = [];
    const replayStart = Date.now();

    for (const trainingDayId of days) {
      const t0 = Date.now();
      try {
        // Step 1: Fire onObservationIngested for every observation on this day.
        // For SESSION observations this computes and persists session features.
        // For other types this invalidates the relevant day-level feature sets.
        // This mirrors the production event flow.
        const dayObservations = await this.obsRepo.find(athleteId, { trainingDayId });
        for (const obs of dayObservations) {
          await engine.onObservationIngested(obs);
        }

        // Step 2: Compute window features (LOAD, RECOVERY, BODY, CONDITION).
        // Session features are already in the repository from Step 1.
        const dayFeatures = await engine.computeDayFeatures(athleteId, trainingDayId);
        const durationMs = Date.now() - t0;
        const checksums = checksumDay(dayFeatures);
        const categories = categoriesFromDayFeatures(dayFeatures);

        dayResults.push({
          trainingDayId,
          sessionCount: dayFeatures.sessions.length,
          categories,
          checksums,
          durationMs,
        });
      } catch (err) {
        dayResults.push({
          trainingDayId,
          sessionCount: 0,
          categories: [],
          checksums: {},
          durationMs: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const totalDurationMs = Date.now() - replayStart;
    const succeeded = dayResults.filter((d) => !d.error);
    const failed = dayResults.filter((d) => d.error);

    const allChecksums: Record<string, string> = {};
    for (const day of dayResults) {
      for (const [key, checksum] of Object.entries(day.checksums)) {
        allChecksums[`${day.trainingDayId}/${key}`] = checksum;
      }
    }

    return {
      athleteId,
      fromTrainingDayId: fromDayId,
      toTrainingDayId: toDayId,
      mode,
      days: dayResults,
      summary: {
        daysAttempted: days.length,
        daysSucceeded: succeeded.length,
        daysFailed: failed.length,
        totalFeatureSets: succeeded.reduce((acc, d) => acc + d.categories.length, 0),
        totalDurationMs,
      },
      allChecksums,
    };
  }

  /**
   * Compare two replay results to verify determinism.
   * Returns true if all checksums are identical.
   */
  static compareChecksums(
    run1: ReplayResult,
    run2: ReplayResult,
  ): { deterministic: boolean; divergences: Array<{ key: string; run1: string; run2: string }> } {
    const divergences: Array<{ key: string; run1: string; run2: string }> = [];

    const allKeys = new Set([...Object.keys(run1.allChecksums), ...Object.keys(run2.allChecksums)]);

    for (const key of allKeys) {
      const c1 = run1.allChecksums[key];
      const c2 = run2.allChecksums[key];
      if (c1 !== c2) {
        divergences.push({ key, run1: c1 ?? '(missing)', run2: c2 ?? '(missing)' });
      }
    }

    return { deterministic: divergences.length === 0, divergences };
  }
}
