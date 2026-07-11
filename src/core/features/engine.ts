/**
 * FEATURE ENGINE
 *
 * Orchestrates the complete Feature Extraction lifecycle:
 *   ObservationIngested event
 *     → Identify affected feature categories
 *     → Invalidate stale features
 *     → Compute session features synchronously
 *     → Mark window features for lazy recomputation
 *
 * This engine sits between the Observation Engine and the Inference Orchestrator.
 * It does NOT run inference — it only produces Features.
 *
 * Dependency graph:
 *   FeatureEngine ──reads── ObservationRepository (to build history contexts)
 *   FeatureEngine ──reads── FeatureRepository (to build LoadHistory from prior features)
 *   FeatureEngine ──writes─ FeatureRepository (to persist computed features)
 *   FeatureEngine ──reads── ExtractionContextProvider (to get athlete capabilities)
 */

import { randomUUID } from 'node:crypto';

import type { ObservationRepository } from '@/core/observation/repository';
import type {
  BodyCompositionObservation,
  HrvObservation,
  Observation,
  PhysicalConditionObservation,
  RestingHrObservation,
  SessionObservation,
  SleepObservation,
  SubjectiveObservation,
} from '@/core/observation/types';

import type { MetricsCollector } from '@/core/dev/metrics';

import type { ExtractionContext } from './context';
import type { FeatureRepository } from './repository';
import type {
  BodyHistory,
  ConditionHistory,
  DayFeatures,
  FeatureSetRecord,
  LoadFeatureSet,
  LoadHistory,
  RecoveryHistory,
} from './types';

import { extractBodyFeatures } from './extractors/body-extractor';
import { extractConditionFeatures } from './extractors/condition-extractor';
import { extractLoadFeatures } from './extractors/load-extractor';
import { computeRpeVsTargetZone, extractRecoveryFeatures } from './extractors/recovery-extractor';
import { extractSessionFeatures } from './extractors/session-extractor';
import type { ConditionRepository } from '@/core/physical-health/repository';

// ─────────────────────────────────────────────────────────────────────────────
// Ports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Port for resolving athlete capabilities into an ExtractionContext.
 * The concrete implementation reads from AthleteProfile and the most recent
 * physiological observations.
 *
 * This decouples the FeatureEngine from the AthleteProfile schema.
 */
export interface ExtractionContextProvider {
  getContext(athleteId: string, trainingDayId: string): Promise<ExtractionContext>;
}

export interface SessionStreamProvider {
  getSessionStream(
    session: SessionObservation,
    ctx: ExtractionContext,
  ): Promise<{
    aerobicLoadFactor: number | null;
    anaerobicLoadFactor: number | null;
    timeInZones: readonly [number, number, number, number, number] | null;
    hrDriftPercent: number | null;
    paceVariabilityIndex: number | null;
  } | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────────────────

export type FeatureEngineDeps = {
  featureRepository: FeatureRepository;
  observationRepository: ObservationRepository;
  contextProvider: ExtractionContextProvider;
  sessionStreamProvider?: SessionStreamProvider;
  /** When set, condition features are built from Condition tables (Phase 2). */
  conditionRepository?: ConditionRepository;
  /** Optional metrics collector — no-op when absent. */
  metrics?: MetricsCollector;
};

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

export type BackfillResult = {
  athleteId: string;
  daysProcessed: number;
  sessionFeaturesComputed: number;
  errors: Array<{ trainingDayId: string; error: string }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

function subtractDays(trainingDayId: string, days: number): string {
  const [year, month, day] = trainingDayId.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().split('T')[0];
}

function addDays(trainingDayId: string, days: number): string {
  const [year, month, day] = trainingDayId.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/** Enumerate all YYYY-MM-DD strings from `from` to `to` (inclusive). */
function enumerateDays(from: string, to: string): string[] {
  const result: string[] = [];
  let current = from;
  while (current <= to) {
    result.push(current);
    current = addDays(current, 1);
  }
  return result;
}

function hasValidSessionFeatureShape(data: Record<string, unknown> | null | undefined): data is {
  trainingDayId: string;
  sportType: string;
  durationSec: number;
  tssScore: number;
} {
  return (
    data != null &&
    typeof data.trainingDayId === 'string' &&
    typeof data.sportType === 'string' &&
    typeof data.durationSec === 'number' &&
    Number.isFinite(data.durationSec) &&
    typeof data.tssScore === 'number' &&
    Number.isFinite(data.tssScore)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FeatureEngine
// ─────────────────────────────────────────────────────────────────────────────

export class FeatureEngine {
  private readonly featureRepo: FeatureRepository;
  private readonly obsRepo: ObservationRepository;
  private readonly ctxProvider: ExtractionContextProvider;
  private readonly sessionStreamProvider: SessionStreamProvider | undefined;
  private readonly conditionRepo: ConditionRepository | undefined;
  private readonly metrics: MetricsCollector | undefined;

  constructor(deps: FeatureEngineDeps) {
    this.featureRepo = deps.featureRepository;
    this.obsRepo = deps.observationRepository;
    this.ctxProvider = deps.contextProvider;
    this.sessionStreamProvider = deps.sessionStreamProvider;
    this.conditionRepo = deps.conditionRepository;
    this.metrics = deps.metrics;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event entry point
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Called when the ObservationEngine emits an ObservationIngested event.
   *
   * Processing:
   *   1. Invalidate stale feature sets for the affected training day.
   *   2. Compute SESSION features immediately (synchronous — deterministic, fast).
   *   3. Mark LOAD features as INVALIDATED (window recomputed lazily or by batch).
   *   4. Mark RECOVERY/BODY/CONDITION as INVALIDATED for the affected day.
   *
   * Failures are non-fatal: the Observation is already persisted and the legacy
   * pipeline continues operating. The FeatureEngine logs errors but does not throw.
   */
  async onObservationIngested(observation: Observation): Promise<void> {
    const { athleteId, type, trainingDayId } = observation;
    this.metrics?.recordObservationIngested();

    try {
      switch (type) {
        case 'SESSION':
          await this.featureRepo.invalidateForTrainingDay(athleteId, trainingDayId, ['LOAD']);
          await this.featureRepo.invalidateLoadWindow(athleteId, trainingDayId);
          await this.computeSessionFeatures(athleteId, observation as SessionObservation);
          break;

        case 'SLEEP':
        case 'HRV':
        case 'RESTING_HR':
        case 'SUBJECTIVE':
          await this.featureRepo.invalidateForTrainingDay(athleteId, trainingDayId, ['RECOVERY']);
          break;

        case 'BODY_COMPOSITION':
          await this.featureRepo.invalidateForTrainingDay(athleteId, trainingDayId, ['BODY']);
          break;

        case 'PHYSICAL_CONDITION':
          await this.featureRepo.invalidateForTrainingDay(athleteId, trainingDayId, ['CONDITION']);
          break;

        case 'GARMIN_READINESS':
        case 'GARMIN_BATTERY':
          // Proprietary model outputs — not used by feature extractors
          break;
      }
    } catch (err) {
      // Non-fatal: log but do not throw (legacy pipeline continues)
      console.error(`[FeatureEngine] onObservationIngested failed for ${type}:`, err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Session feature computation (synchronous path)
  // ─────────────────────────────────────────────────────────────────────────

  private async computeSessionFeatures(
    athleteId: string,
    session: SessionObservation,
  ): Promise<void> {
    const [ctx, linkedSubjective] = await Promise.all([
      this.ctxProvider.getContext(athleteId, session.trainingDayId),
      this.findLinkedSubjective(athleteId, session),
    ]);

    // Find linked subjective observation (if any)
    const stream = this.sessionStreamProvider
      ? await this.sessionStreamProvider.getSessionStream(session, ctx)
      : null;

    const t0 = Date.now();
    const features = extractSessionFeatures({ session, linkedSubjective, stream }, ctx);
    const durationMs = Date.now() - t0;

    this.metrics?.recordExtraction({
      category: 'SESSION',
      athleteId,
      trainingDayId: session.trainingDayId,
      sessionObsId: session.id,
      durationMs,
      success: true,
      confidence: features.confidence,
    });

    const version = await this.featureRepo.nextVersion(
      athleteId,
      'SESSION',
      session.trainingDayId,
      session.id,
    );

    const record: FeatureSetRecord = {
      id: randomUUID(),
      athleteId,
      category: 'SESSION',
      sessionObsId: session.id,
      trainingDayId: session.trainingDayId,
      version,
      status: 'COMPUTED',
      computedAt: new Date(),
      createdAt: new Date(),
      data: features,
    };

    await this.featureRepo.save(record);
  }

  private async ensureSessionFeaturesInRange(
    athleteId: string,
    fromTrainingDayId: string,
    toTrainingDayId: string,
  ) {
    const trainingDayIds = enumerateDays(fromTrainingDayId, toTrainingDayId);
    const [sessionObs, sessionRecords] = await Promise.all([
      this.obsRepo.find(athleteId, { types: ['SESSION'], trainingDayIds }),
      this.featureRepo.findSessionFeaturesByRange(athleteId, fromTrainingDayId, toTrainingDayId),
    ]);

    const latestBySessionObsId = new Map(
      sessionRecords.map((record) => [record.sessionObsId, record]),
    );
    let repaired = false;

    for (const observation of sessionObs) {
      if (observation.type !== 'SESSION') continue;
      const existing = latestBySessionObsId.get(observation.id);
      if (existing && hasValidSessionFeatureShape(existing.data as Record<string, unknown>))
        continue;
      await this.computeSessionFeatures(athleteId, observation);
      repaired = true;
    }

    if (!repaired) return sessionRecords;

    return this.featureRepo.findSessionFeaturesByRange(
      athleteId,
      fromTrainingDayId,
      toTrainingDayId,
    );
  }

  private async findLinkedSubjective(
    athleteId: string,
    session: SessionObservation,
  ): Promise<SubjectiveObservation | null> {
    if (!session.externalId) return null;

    // Find subjective observations for the same training day with a matching sessionExternalId
    const candidates = await this.obsRepo.find(athleteId, {
      types: ['SUBJECTIVE'],
      trainingDayId: session.trainingDayId,
    });

    const linked = candidates.find(
      (obs): obs is SubjectiveObservation =>
        obs.type === 'SUBJECTIVE' &&
        (obs as SubjectiveObservation).sessionExternalId === session.externalId,
    );

    return linked ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Full day extraction (called on first query for INVALIDATED features)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute all feature categories for a given training day.
   * This is a lazy computation — called when a model requests DayFeatures
   * and finds INVALIDATED records.
   *
   * Returns the freshly computed DayFeatures.
   */
  async computeDayFeatures(athleteId: string, trainingDayId: string): Promise<DayFeatures> {
    const [ctx, sessionRecords] = await Promise.all([
      this.ctxProvider.getContext(athleteId, trainingDayId),
      this.ensureSessionFeaturesInRange(athleteId, trainingDayId, trainingDayId),
    ]);

    // ── Session features (may already be COMPUTED from event handler) ─────
    const sessionFeatures = sessionRecords.map((r) => r.data);

    // ── Load features ─────────────────────────────────────────────────────
    const loadHistory = await this.buildLoadHistory(athleteId, trainingDayId);
    const t0Load = Date.now();
    const loadFeatureSet = extractLoadFeatures(loadHistory, trainingDayId);
    this.metrics?.recordExtraction({
      category: 'LOAD',
      athleteId,
      trainingDayId,
      durationMs: Date.now() - t0Load,
      success: true,
      confidence: loadFeatureSet.confidence,
    });
    await this.saveFeatureSet(athleteId, 'LOAD', trainingDayId, null, loadFeatureSet);

    // ── Recovery features ─────────────────────────────────────────────────
    const [recoveryObs, recoveryHistory] = await Promise.all([
      this.loadRecoveryObservations(athleteId, trainingDayId),
      this.buildRecoveryHistory(athleteId, trainingDayId),
    ]);
    const t0Recovery = Date.now();
    let recoveryFeatureSet = extractRecoveryFeatures(
      recoveryObs.hrv,
      recoveryObs.rhr,
      recoveryObs.sleep,
      recoveryObs.subjective,
      recoveryHistory,
      ctx,
    );

    // Second pass: enrich rpeVsTargetZone if sessions had RPE
    const [primarySession] = sessionFeatures;
    if (primarySession?.subjectiveRpe != null) {
      recoveryFeatureSet = {
        ...recoveryFeatureSet,
        rpeVsTargetZone: computeRpeVsTargetZone(
          primarySession.subjectiveRpe,
          primarySession.sportType,
        ),
      };
    }

    this.metrics?.recordExtraction({
      category: 'RECOVERY',
      athleteId,
      trainingDayId,
      durationMs: Date.now() - t0Recovery,
      success: true,
      confidence: recoveryFeatureSet.confidence,
    });

    await this.saveFeatureSet(athleteId, 'RECOVERY', trainingDayId, null, recoveryFeatureSet);

    // ── Body features ─────────────────────────────────────────────────────
    const bodyObs = await this.loadBodyObservation(athleteId, trainingDayId);
    let bodyFeatureSet = null;
    if (bodyObs) {
      const bodyHistory = await this.buildBodyHistory(athleteId, trainingDayId);
      const t0Body = Date.now();
      bodyFeatureSet = extractBodyFeatures(bodyObs, bodyHistory);
      this.metrics?.recordExtraction({
        category: 'BODY',
        athleteId,
        trainingDayId,
        durationMs: Date.now() - t0Body,
        success: true,
        confidence: bodyFeatureSet.confidence,
      });
      await this.saveFeatureSet(athleteId, 'BODY', trainingDayId, bodyObs.id, bodyFeatureSet);
    }

    // ── Condition features ────────────────────────────────────────────────
    const conditionHistory = await this.buildConditionHistory(athleteId, trainingDayId);
    const t0Condition = Date.now();
    const conditionFeatureSet = extractConditionFeatures(trainingDayId, conditionHistory);
    this.metrics?.recordExtraction({
      category: 'CONDITION',
      athleteId,
      trainingDayId,
      durationMs: Date.now() - t0Condition,
      success: true,
      confidence: conditionFeatureSet.confidence,
    });
    await this.saveFeatureSet(athleteId, 'CONDITION', trainingDayId, null, conditionFeatureSet);

    return {
      athleteId,
      trainingDayId,
      retrievedAt: new Date(),
      sessions: sessionFeatures,
      load: loadFeatureSet,
      recovery: recoveryFeatureSet,
      body: bodyFeatureSet ?? 'PENDING',
      condition: conditionFeatureSet,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Query API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieve all features for a training day.
   * Returns COMPUTED records from cache, or triggers lazy computation when stale.
   * Models should call this — not computeDayFeatures — to benefit from caching.
   */
  async getDayFeatures(athleteId: string, trainingDayId: string): Promise<DayFeatures> {
    // Check if we have fresh COMPUTED records for all categories
    const [sessionObs, sessionRecords, loadRecord, recoveryRecord, bodyRecord, conditionRecord] =
      await Promise.all([
        this.obsRepo.find(athleteId, { types: ['SESSION'], trainingDayId }),
        this.featureRepo.findSessionFeaturesByRange(athleteId, trainingDayId, trainingDayId),
        this.featureRepo.findLoadFeatures(athleteId, trainingDayId),
        this.featureRepo.findRecoveryFeatures(athleteId, trainingDayId),
        this.featureRepo.findBodyFeatures(athleteId, trainingDayId),
        this.featureRepo.findConditionFeatures(athleteId, trainingDayId),
      ]);

    const hasSessionMismatch =
      sessionObs.length !== sessionRecords.length ||
      sessionRecords.some(
        (record) => !hasValidSessionFeatureShape(record.data as Record<string, unknown>),
      );

    // If any window feature is missing or cached session features are malformed, trigger lazy computation
    if (!loadRecord || !recoveryRecord || !conditionRecord || hasSessionMismatch) {
      return this.computeDayFeatures(athleteId, trainingDayId);
    }

    return {
      athleteId,
      trainingDayId,
      retrievedAt: new Date(),
      sessions: sessionRecords.map((r) => r.data),
      load: loadRecord.data,
      recovery: recoveryRecord.data,
      body: bodyRecord?.data ?? 'PENDING',
      condition: conditionRecord.data,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Backfill
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute all features for all training days from `since` to today.
   * Used when an athlete first connects a source (90-day Garmin import).
   *
   * Processes days in ascending order so that load windows are always
   * available when later days are computed.
   */
  async backfill(athleteId: string, since: Date): Promise<BackfillResult> {
    const [today] = new Date().toISOString().split('T');
    const [fromDayId] = since.toISOString().split('T');

    const days = enumerateDays(fromDayId, today);
    const errors: BackfillResult['errors'] = [];
    let sessionFeaturesComputed = 0;

    for (const trainingDayId of days) {
      try {
        const result = await this.computeDayFeatures(athleteId, trainingDayId);
        sessionFeaturesComputed += result.sessions.length;
      } catch (err) {
        errors.push({
          trainingDayId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      athleteId,
      daysProcessed: days.length - errors.length,
      sessionFeaturesComputed,
      errors,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // History builders (assemble extractor inputs from observations)
  // ─────────────────────────────────────────────────────────────────────────

  private async buildLoadHistory(athleteId: string, trainingDayId: string): Promise<LoadHistory> {
    const fromDayId = subtractDays(trainingDayId, 42);

    // Get all session features in the 42-day window
    const sessionRecords = await this.ensureSessionFeaturesInRange(
      athleteId,
      fromDayId,
      trainingDayId,
    );

    // Build per-day TSS aggregation (including zero-TSS days)
    const tssMap = new Map<
      string,
      { tssScore: number; run: number; bike: number; other: number }
    >();

    // Initialize all 42 days with zero
    const days = enumerateDays(fromDayId, trainingDayId);
    for (const day of days) {
      tssMap.set(day, { tssScore: 0, run: 0, bike: 0, other: 0 });
    }

    // Aggregate session TSS per day
    for (const record of sessionRecords) {
      if (!hasValidSessionFeatureShape(record.data as Record<string, unknown>)) continue;
      const day = record.data.trainingDayId;
      const entry = tssMap.get(day) ?? { tssScore: 0, run: 0, bike: 0, other: 0 };
      const tss = record.data.tssScore;
      const sport = record.data.sportType;

      const isRun = ['RUN', 'TRAIL_RUN'].includes(sport);
      const isBike = ['BIKE', 'MTB'].includes(sport);

      tssMap.set(day, {
        tssScore: entry.tssScore + tss,
        run: entry.run + (isRun ? tss : 0),
        bike: entry.bike + (isBike ? tss : 0),
        other: entry.other + (!isRun && !isBike ? tss : 0),
      });
    }

    return {
      dailyLoad42d: Array.from(tssMap.entries()).map(([dayId, v]) => ({
        trainingDayId: dayId,
        tssScore: v.tssScore,
        sportBreakdown: { run: v.run, bike: v.bike, other: v.other },
      })),
    };
  }

  private async buildRecoveryHistory(
    athleteId: string,
    trainingDayId: string,
  ): Promise<RecoveryHistory> {
    const from14d = subtractDays(trainingDayId, 14);
    const fromTimestamp = new Date(`${from14d}T00:00:00Z`);
    const toTimestamp = new Date(`${trainingDayId}T23:59:59Z`);

    const [hrvObs, rhrObs, sleepObs] = await Promise.all([
      this.obsRepo.findByTimeRange({
        athleteId,
        type: 'HRV',
        from: fromTimestamp,
        to: toTimestamp,
      }),
      this.obsRepo.findByTimeRange({
        athleteId,
        type: 'RESTING_HR',
        from: fromTimestamp,
        to: toTimestamp,
      }),
      this.obsRepo.findByTimeRange({
        athleteId,
        type: 'SLEEP',
        from: fromTimestamp,
        to: toTimestamp,
      }),
    ]);

    return {
      hrv14d: (hrvObs as HrvObservation[])
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .map((h) => ({ valueMsRmssd: h.valueMsRmssd, timestamp: h.timestamp })),

      rhr14d: (rhrObs as RestingHrObservation[])
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .map((h) => ({ valueBpm: h.valueBpm, timestamp: h.timestamp })),

      sleep14d: (sleepObs as SleepObservation[])
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .map((s) => ({
          totalMinutes: s.totalMinutes,
          bedtimeMinFromMidnight: s.bedtimeMinFromMidnight,
          timestamp: s.timestamp,
        })),
    };
  }

  private pickDailySubjectiveObservation(
    observations: SubjectiveObservation[],
  ): SubjectiveObservation | null {
    if (observations.length === 0) return null;

    const sorted = [...observations].sort((a, b) => {
      const aMorning = a.sessionExternalId ? 0 : 1;
      const bMorning = b.sessionExternalId ? 0 : 1;
      if (aMorning !== bMorning) return bMorning - aMorning;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return sorted[0] ?? null;
  }

  private async loadRecoveryObservations(
    athleteId: string,
    trainingDayId: string,
  ): Promise<{
    hrv: HrvObservation | null;
    rhr: RestingHrObservation | null;
    sleep: SleepObservation | null;
    subjective: SubjectiveObservation | null;
  }> {
    const obs = await this.obsRepo.find(athleteId, {
      types: ['HRV', 'RESTING_HR', 'SLEEP', 'SUBJECTIVE'],
      trainingDayId,
    });

    const hrv = (obs.find((o) => o.type === 'HRV') as HrvObservation | undefined) ?? null;
    const rhr =
      (obs.find((o) => o.type === 'RESTING_HR') as RestingHrObservation | undefined) ?? null;
    const sleep = (obs.find((o) => o.type === 'SLEEP') as SleepObservation | undefined) ?? null;
    const subjective = this.pickDailySubjectiveObservation(
      obs.filter((o) => o.type === 'SUBJECTIVE') as SubjectiveObservation[],
    );

    return { hrv, rhr, sleep, subjective };
  }

  private async loadBodyObservation(
    athleteId: string,
    trainingDayId: string,
  ): Promise<BodyCompositionObservation | null> {
    const obs = await this.obsRepo.find(athleteId, {
      types: ['BODY_COMPOSITION'],
      trainingDayId,
    });
    return (obs[0] as BodyCompositionObservation | undefined) ?? null;
  }

  private async buildBodyHistory(athleteId: string, trainingDayId: string): Promise<BodyHistory> {
    const from7d = subtractDays(trainingDayId, 7);
    const fromTimestamp = new Date(`${from7d}T00:00:00Z`);
    const toTimestamp = new Date(`${trainingDayId}T23:59:59Z`);

    const obs = await this.obsRepo.findByTimeRange({
      athleteId,
      type: 'BODY_COMPOSITION',
      from: fromTimestamp,
      to: toTimestamp,
    });

    return {
      measurements7d: (obs as BodyCompositionObservation[]).map((o) => ({
        weightKg: o.weightKg,
        fatPercent: o.fatPercent ?? null,
        timestamp: o.timestamp,
      })),
    };
  }

  private async buildConditionHistory(
    athleteId: string,
    trainingDayId: string,
  ): Promise<ConditionHistory> {
    if (this.conditionRepo) {
      const history = await this.conditionRepo.getConditionHistoryForFeatures(trainingDayId);
      return {
        activeConditions: history.activeConditions.map(
          (c) =>
            ({
              id: c.id,
              athleteId,
              type: 'PHYSICAL_CONDITION',
              timestamp: new Date(`${trainingDayId}T12:00:00Z`),
              category: 'PAIN',
              bodyRegion: '',
              bodySide: 'NA',
              severity: c.severity,
              affectsTraining: c.affectsTraining,
            }) as PhysicalConditionObservation,
        ),
        severityHistory14d: history.severityHistory14d,
      };
    }

    const from14d = subtractDays(trainingDayId, 14);
    const fromTimestamp = new Date(`${from14d}T00:00:00Z`);
    const toTimestamp = new Date(`${trainingDayId}T23:59:59Z`);

    const all = (await this.obsRepo.findByTimeRange({
      athleteId,
      type: 'PHYSICAL_CONDITION',
      from: fromTimestamp,
      to: toTimestamp,
    })) as PhysicalConditionObservation[];

    // "Active" = most recent observation per conditionId shows affectsTraining=true
    // For v1 simplification: all conditions in the last 14 days are considered active
    // unless they have a zero severity in the latest check-in
    const activeConditions = all.filter((c) => c.severity > 0);

    const severityHistory14d = all.map((c) => ({
      severity: c.severity,
      timestamp: c.timestamp,
    }));

    return { activeConditions, severityHistory14d };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async saveFeatureSet(
    athleteId: string,
    category: 'LOAD' | 'RECOVERY' | 'BODY' | 'CONDITION',
    trainingDayId: string,
    sessionObsId: string | null,
    data:
      | LoadFeatureSet
      | ReturnType<typeof extractRecoveryFeatures>
      | ReturnType<typeof extractBodyFeatures>
      | ReturnType<typeof extractConditionFeatures>,
  ): Promise<FeatureSetRecord> {
    const version = await this.featureRepo.nextVersion(
      athleteId,
      category,
      trainingDayId,
      sessionObsId ?? undefined,
    );

    const record: FeatureSetRecord = {
      id: randomUUID(),
      athleteId,
      category: category as FeatureSetRecord['category'],
      trainingDayId,
      ...(sessionObsId ? { sessionObsId } : {}),
      version,
      status: 'COMPUTED',
      computedAt: new Date(),
      createdAt: new Date(),
      data: data as FeatureSetRecord['data'],
    } as FeatureSetRecord;

    await this.featureRepo.save(record);
    return record;
  }
}
