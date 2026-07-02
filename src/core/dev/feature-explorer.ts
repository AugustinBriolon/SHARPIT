/**
 * DEVELOPER PLATFORM — Feature Explorer
 *
 * Read-only query layer for browsing FeatureSets stored in the repository.
 *
 * The Feature Explorer provides structured, developer-friendly views of:
 *   - All FeatureSets for a given training day
 *   - Historical trend of a specific feature category (e.g. daily load over N days)
 *   - A single session's features and their originating observations
 *   - Summary statistics across a date range
 *
 * The Explorer is a thin query adapter — it does NOT trigger computation.
 * If a feature is PENDING, it shows it as PENDING rather than triggering extraction.
 * Use the FeatureEngine.getDayFeatures() for lazy computation.
 */

import type { FeatureRepository } from '@/core/features/repository';
import type {
  FeatureSetRecord,
  FeatureCategory,
  FeatureStatus,
  SessionFeatureSet,
  LoadFeatureSet,
  RecoveryFeatureSet,
  BodyFeatureSet,
  ConditionFeatureSet,
} from '@/core/features/types';
import { checksumFeatureData } from './checksum';

// ─────────────────────────────────────────────────────────────────────────────
// View types
// ─────────────────────────────────────────────────────────────────────────────

export type FeatureSetView = {
  readonly id: string;
  readonly category: FeatureCategory;
  readonly trainingDayId: string | undefined;
  readonly sessionObsId: string | undefined;
  readonly status: FeatureStatus;
  readonly version: number;
  readonly confidence: number;
  readonly algorithmId: string;
  readonly computedAt: Date | null;
  readonly createdAt: Date;
  readonly sourceObsIds: readonly string[];
  readonly checksum: string;
  readonly values:
    SessionFeatureSet | LoadFeatureSet | RecoveryFeatureSet | BodyFeatureSet | ConditionFeatureSet;
};

export type DayExplorerView = {
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly sessions: readonly FeatureSetView[];
  readonly load: FeatureSetView | null;
  readonly recovery: FeatureSetView | null;
  readonly body: FeatureSetView | null;
  readonly condition: FeatureSetView | null;
  readonly summary: {
    readonly totalFeatureSets: number;
    readonly computed: number;
    readonly pending: number;
    readonly invalidated: number;
    readonly avgConfidence: number | null;
  };
};

export type HistoryPoint = {
  readonly trainingDayId: string;
  readonly status: FeatureStatus;
  readonly confidence: number | null;
  readonly checksum: string | null;
  readonly values: unknown;
};

export type HistoryView = {
  readonly athleteId: string;
  readonly category: FeatureCategory;
  readonly fromTrainingDayId: string;
  readonly toTrainingDayId: string;
  readonly points: readonly HistoryPoint[];
};

export type RangeSummary = {
  readonly athleteId: string;
  readonly fromTrainingDayId: string;
  readonly toTrainingDayId: string;
  readonly byCategory: Partial<
    Record<
      FeatureCategory,
      {
        readonly total: number;
        readonly computed: number;
        readonly pending: number;
        readonly invalidated: number;
        readonly avgConfidence: number | null;
      }
    >
  >;
};

// ─────────────────────────────────────────────────────────────────────────────
// View builder
// ─────────────────────────────────────────────────────────────────────────────

function toView(record: FeatureSetRecord): FeatureSetView {
  const data = record.data as {
    confidence?: number;
    algorithmId?: string;
    sourceObsIds?: readonly string[];
  };
  // sessionObsId exists only on SESSION and BODY records
  const sessionObsId =
    record.category === 'SESSION' || record.category === 'BODY'
      ? (record as { sessionObsId?: string }).sessionObsId
      : undefined;

  // trainingDayId exists on all non-SESSION-scoped records
  const trainingDayId =
    'trainingDayId' in record ? (record as { trainingDayId?: string }).trainingDayId : undefined;

  return {
    id: record.id,
    category: record.category,
    trainingDayId,
    sessionObsId,
    status: record.status,
    version: record.version,
    confidence: data.confidence ?? 0,
    algorithmId: data.algorithmId ?? 'unknown',
    computedAt: record.computedAt ?? null,
    createdAt: record.createdAt,
    sourceObsIds: data.sourceObsIds ?? [],
    checksum: checksumFeatureData(record.data),
    values: record.data as FeatureSetView['values'],
  };
}

function summaryFromViews(views: FeatureSetView[]) {
  const computed = views.filter((v) => v.status === 'COMPUTED');
  const pending = views.filter((v) => v.status === 'PENDING');
  const invalidated = views.filter((v) => v.status === 'INVALIDATED');

  const avgConfidence =
    computed.length > 0
      ? Math.round((computed.reduce((acc, v) => acc + v.confidence, 0) / computed.length) * 100) /
        100
      : null;

  return {
    totalFeatureSets: views.length,
    computed: computed.length,
    pending: pending.length,
    invalidated: invalidated.length,
    avgConfidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

function addDays(dayId: string, n: number): string {
  const [y, m, d] = dayId.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().split('T')[0];
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

// ─────────────────────────────────────────────────────────────────────────────
// FeatureExplorer
// ─────────────────────────────────────────────────────────────────────────────

export class FeatureExplorer {
  constructor(private readonly featureRepo: FeatureRepository) {}

  /**
   * Get all feature sets for a given training day.
   * Shows the latest version of each category.
   */
  async getDayView(athleteId: string, trainingDayId: string): Promise<DayExplorerView> {
    const [sessionRecords, loadRecord, recoveryRecord, bodyRecord, conditionRecord] =
      await Promise.all([
        this.featureRepo.findSessionFeaturesByRange(athleteId, trainingDayId, trainingDayId),
        this.featureRepo.findLoadFeatures(athleteId, trainingDayId),
        this.featureRepo.findRecoveryFeatures(athleteId, trainingDayId),
        this.featureRepo.findBodyFeatures(athleteId, trainingDayId),
        this.featureRepo.findConditionFeatures(athleteId, trainingDayId),
      ]);

    const sessions = sessionRecords.map(toView);
    const load = loadRecord ? toView(loadRecord) : null;
    const recovery = recoveryRecord ? toView(recoveryRecord) : null;
    const body = bodyRecord ? toView(bodyRecord) : null;
    const condition = conditionRecord ? toView(conditionRecord) : null;

    const all = [
      ...sessions,
      ...(load ? [load] : []),
      ...(recovery ? [recovery] : []),
      ...(body ? [body] : []),
      ...(condition ? [condition] : []),
    ];

    return {
      athleteId,
      trainingDayId,
      sessions,
      load,
      recovery,
      body,
      condition,
      summary: summaryFromViews(all),
    };
  }

  /**
   * Get the historical trend for a specific feature category.
   * Useful for spotting when a category starts/stops being computed.
   *
   * @param days - Number of calendar days to look back (default: 30).
   */
  async getHistory(
    athleteId: string,
    category: FeatureCategory,
    options: { days?: number; toTrainingDayId?: string } = {},
  ): Promise<HistoryView> {
    const { days = 30, toTrainingDayId } = options;
    const toDay = toTrainingDayId ?? new Date().toISOString().split('T')[0];
    const fromDay = addDays(toDay, -days + 1);

    const dayIds = enumerateDays(fromDay, toDay);

    const points: HistoryPoint[] = await Promise.all(
      dayIds.map(async (dayId): Promise<HistoryPoint> => {
        const record = await this.fetchByCategory(athleteId, category, dayId);
        if (!record) {
          return {
            trainingDayId: dayId,
            status: 'PENDING',
            confidence: null,
            checksum: null,
            values: null,
          };
        }
        return {
          trainingDayId: dayId,
          status: record.status,
          confidence: (record.data as { confidence?: number }).confidence ?? null,
          checksum: checksumFeatureData(record.data),
          values: record.data,
        };
      }),
    );

    return { athleteId, category, fromTrainingDayId: fromDay, toTrainingDayId: toDay, points };
  }

  /**
   * Get summary counts for all feature categories over a date range.
   */
  async getRangeSummary(
    athleteId: string,
    fromTrainingDayId: string,
    toTrainingDayId: string,
  ): Promise<RangeSummary> {
    const dayIds = enumerateDays(fromTrainingDayId, toTrainingDayId);

    const allCategories: FeatureCategory[] = ['SESSION', 'LOAD', 'RECOVERY', 'BODY', 'CONDITION'];
    const byCategory: RangeSummary['byCategory'] = {};

    for (const category of allCategories) {
      const records = await Promise.all(
        dayIds.map((dayId) => this.fetchByCategory(athleteId, category, dayId)),
      );

      const found = records.filter((r): r is FeatureSetRecord => r !== null);
      if (found.length === 0) continue;

      const computed = found.filter((r) => r.status === 'COMPUTED');
      const pending = found.filter((r) => r.status === 'PENDING');
      const invalidated = found.filter((r) => r.status === 'INVALIDATED');

      const avgConfidence =
        computed.length > 0
          ? Math.round(
              (computed.reduce(
                (acc, r) => acc + ((r.data as { confidence?: number }).confidence ?? 0),
                0,
              ) /
                computed.length) *
                100,
            ) / 100
          : null;

      byCategory[category] = {
        total: found.length,
        computed: computed.length,
        pending: pending.length,
        invalidated: invalidated.length,
        avgConfidence,
      };
    }

    return { athleteId, fromTrainingDayId, toTrainingDayId, byCategory };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async fetchByCategory(
    athleteId: string,
    category: FeatureCategory,
    trainingDayId: string,
  ): Promise<FeatureSetRecord | null> {
    switch (category) {
      case 'SESSION': {
        // SESSION features are per-session, not per-day — return the first one found
        const sessions = await this.featureRepo.findSessionFeaturesByRange(
          athleteId,
          trainingDayId,
          trainingDayId,
        );
        return sessions[0] ?? null;
      }
      case 'LOAD':
        return this.featureRepo.findLoadFeatures(athleteId, trainingDayId);
      case 'RECOVERY':
        return this.featureRepo.findRecoveryFeatures(athleteId, trainingDayId);
      case 'BODY':
        return this.featureRepo.findBodyFeatures(athleteId, trainingDayId);
      case 'CONDITION':
        return this.featureRepo.findConditionFeatures(athleteId, trainingDayId);
    }
  }
}
