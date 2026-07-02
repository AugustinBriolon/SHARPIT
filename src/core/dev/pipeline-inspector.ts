/**
 * DEVELOPER PLATFORM — Pipeline Inspector
 *
 * Given an Observation ID or a training day, reconstructs the full pipeline
 * trace: raw observation → feature sets → confidence → warnings → missing inputs.
 *
 * The inspector is READ-ONLY. It never mutates data.
 *
 * Use cases:
 *   - Debug why a specific session produced a low TSS confidence.
 *   - Understand why recovery features are PENDING for a day.
 *   - Inspect which observations contributed to a FeatureSet.
 *   - Measure extraction latency per category.
 */

import type { ObservationRepository } from '@/core/observation/repository';
import type { FeatureRepository } from '@/core/features/repository';
import type { Observation } from '@/core/observation/types';
import type {
  FeatureSetRecord,
  SessionFeatureSet,
  LoadFeatureSet,
  RecoveryFeatureSet,
  BodyFeatureSet,
  ConditionFeatureSet,
  FeatureStatus,
  FeatureCategory,
} from '@/core/features/types';

// ─────────────────────────────────────────────────────────────────────────────
// Trace types
// ─────────────────────────────────────────────────────────────────────────────

export type Warning = {
  readonly code: string;
  readonly message: string;
  readonly severity: 'INFO' | 'WARN' | 'ERROR';
};

export type MissingInput = {
  readonly field: string;
  readonly impact: string;
  readonly fallback?: string;
};

export type FeatureSetTrace = {
  readonly recordId: string;
  readonly category: FeatureCategory;
  readonly status: FeatureStatus;
  readonly confidence: number;
  readonly algorithmId: string;
  readonly version: number;
  readonly computedAt: Date | null;
  readonly sourceObsIds: readonly string[];
  /** The raw feature values (data payload). */
  readonly values:
    SessionFeatureSet | LoadFeatureSet | RecoveryFeatureSet | BodyFeatureSet | ConditionFeatureSet;
  readonly warnings: readonly Warning[];
  readonly missingInputs: readonly MissingInput[];
};

export type ObservationTrace = {
  /** The raw observation as stored. */
  readonly observation: Observation;
  readonly source: string;
  readonly quality: string;
  /** FeatureSet traces for every category this observation contributed to. */
  readonly featureSets: readonly FeatureSetTrace[];
  readonly warnings: readonly Warning[];
};

export type DayTrace = {
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly observations: readonly ObservationTrace[];
  readonly featureSets: readonly FeatureSetTrace[];
  readonly summary: {
    readonly totalObservations: number;
    readonly totalFeatureSets: number;
    readonly pendingCategories: readonly FeatureCategory[];
    readonly failedCategories: readonly FeatureCategory[];
    readonly avgConfidence: number | null;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Warning / missing-input derivation
// ─────────────────────────────────────────────────────────────────────────────

function warningsFromFeatureSet(record: FeatureSetRecord): Warning[] {
  const warnings: Warning[] = [];

  if (record.status === 'INVALIDATED') {
    warnings.push({
      code: 'FEATURE_INVALIDATED',
      message: 'This feature set has been invalidated by a newer observation.',
      severity: 'WARN',
    });
  }

  const data = record.data as Record<string, unknown>;

  if (record.category === 'SESSION') {
    const session = data as SessionFeatureSet;
    if (session.tssMethod === 'DURATION_FACTOR') {
      warnings.push({
        code: 'TSS_DURATION_FACTOR_FALLBACK',
        message: 'TSS computed via duration × sport constant (last resort). Low confidence.',
        severity: 'WARN',
      });
    }
    if (session.tssMethod === 'RPE_BASED') {
      warnings.push({
        code: 'TSS_RPE_BASED_FALLBACK',
        message: 'TSS computed from subjective RPE. High uncertainty (±50%).',
        severity: 'WARN',
      });
    }
    if (session.confidence < 0.5) {
      warnings.push({
        code: 'LOW_TSS_CONFIDENCE',
        message: `Session TSS confidence is ${(session.confidence * 100).toFixed(0)}% — provide power or HR data for accuracy.`,
        severity: 'WARN',
      });
    }
  }

  if (record.category === 'LOAD') {
    const load = data as LoadFeatureSet;
    if (load.confidence < 0.5) {
      warnings.push({
        code: 'INSUFFICIENT_LOAD_HISTORY',
        message: 'Fewer than 28 days of training data available. Load metrics are unreliable.',
        severity: 'WARN',
      });
    }
    if (load.acwr === null) {
      warnings.push({
        code: 'ACWR_UNAVAILABLE',
        message: 'ACWR cannot be computed (insufficient acute or chronic baseline).',
        severity: 'INFO',
      });
    }
  }

  if (record.category === 'RECOVERY') {
    const recovery = data as RecoveryFeatureSet;
    if (recovery.confidence < 0.5) {
      warnings.push({
        code: 'LOW_RECOVERY_CONFIDENCE',
        message: 'Recovery features rely on limited data. Connect HRV or sleep tracking.',
        severity: 'WARN',
      });
    }
    if (recovery.sleepEfficiencyPercent === null) {
      warnings.push({
        code: 'SLEEP_DATA_MISSING',
        message: 'No sleep observation for this day. Sleep features are unavailable.',
        severity: 'INFO',
      });
    }
    if (recovery.hrvAbsolute === null) {
      warnings.push({
        code: 'HRV_DATA_MISSING',
        message: 'No HRV observation for this day. HRV-based recovery assessment unavailable.',
        severity: 'INFO',
      });
    }
  }

  return warnings;
}

function missingInputsFromFeatureSet(record: FeatureSetRecord): MissingInput[] {
  const inputs: MissingInput[] = [];
  const data = record.data as Record<string, unknown>;

  if (record.category === 'SESSION') {
    const session = data as SessionFeatureSet;
    // mechanicalLoad null ↔ no power data provided
    if (session.mechanicalLoad === null) {
      inputs.push({
        field: 'powerData.normalizedPower',
        impact: 'Power-based TSS unavailable → lower confidence tier used',
        fallback: `tssMethod=${session.tssMethod}`,
      });
    }
    // efficiencyFactor null ↔ no HR data provided
    if (session.efficiencyFactor === null) {
      inputs.push({
        field: 'hrData.avgBpm',
        impact: 'TRIMP TSS unavailable → lower confidence tier used',
        fallback:
          session.tssMethod !== 'POWER_BASED' ? `tssMethod=${session.tssMethod}` : undefined,
      });
    }
    if (session.subjectiveRpe === null) {
      inputs.push({
        field: 'subjectiveRpe',
        impact: 'RPE-based TSS unavailable; rpeVsTargetZone not computable',
        fallback: undefined,
      });
    }
  }

  if (record.category === 'RECOVERY') {
    const recovery = data as RecoveryFeatureSet;
    if (recovery.sleepEfficiencyPercent === null) {
      inputs.push({ field: 'sleep.efficiency', impact: 'Sleep quality unassessable' });
    }
    if (recovery.hrvAbsolute === null) {
      inputs.push({ field: 'hrv.rmssd', impact: 'Autonomic nervous system readiness unknown' });
    }
    if (recovery.rhrAbsolute === null) {
      inputs.push({ field: 'restingHr.bpm', impact: 'RHR trend unavailable' });
    }
  }

  return inputs;
}

function sourceFromObservation(obs: Observation): string {
  if ('source' in obs && typeof (obs as Record<string, unknown>).source === 'string') {
    return (obs as Record<string, unknown>).source as string;
  }
  return obs.type;
}

function qualityFromObservation(obs: Observation): string {
  if ('quality' in obs && typeof (obs as Record<string, unknown>).quality === 'string') {
    return (obs as Record<string, unknown>).quality as string;
  }
  return 'UNKNOWN';
}

function traceFromRecord(record: FeatureSetRecord): FeatureSetTrace {
  const data = record.data as {
    confidence?: number;
    algorithmId?: string;
    sourceObsIds?: readonly string[];
  };
  return {
    recordId: record.id,
    category: record.category,
    status: record.status,
    confidence: data.confidence ?? 0,
    algorithmId: data.algorithmId ?? 'unknown',
    version: record.version,
    computedAt: record.computedAt ?? null,
    sourceObsIds: data.sourceObsIds ?? [],
    values: record.data as FeatureSetTrace['values'],
    warnings: warningsFromFeatureSet(record),
    missingInputs: missingInputsFromFeatureSet(record),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineInspector
// ─────────────────────────────────────────────────────────────────────────────

export class PipelineInspector {
  constructor(
    private readonly obsRepo: ObservationRepository,
    private readonly featureRepo: FeatureRepository,
  ) {}

  /**
   * Inspect a single observation: its normalized form, the feature sets it
   * contributed to, and any warnings about data quality or missing inputs.
   */
  async inspectObservation(observationId: string): Promise<ObservationTrace | null> {
    const obs = await this.obsRepo.findById(observationId);
    if (!obs) return null;

    const dayFeatureSets = await this.loadFeatureSetsForDay(obs.athleteId, obs.trainingDayId);

    // Filter to feature sets that include this observation
    const relevant = dayFeatureSets.filter((r) =>
      ((r.data as { sourceObsIds?: readonly string[] }).sourceObsIds ?? []).includes(observationId),
    );

    const traces = (relevant.length > 0 ? relevant : dayFeatureSets).map(traceFromRecord);

    const warnings: Warning[] = [];
    for (const trace of traces) {
      warnings.push(...trace.warnings);
    }

    return {
      observation: obs,
      source: sourceFromObservation(obs),
      quality: qualityFromObservation(obs),
      featureSets: traces,
      warnings,
    };
  }

  /**
   * Inspect all observations and feature sets for a training day.
   * Provides a complete picture of the pipeline for that day.
   */
  async inspectDay(athleteId: string, trainingDayId: string): Promise<DayTrace> {
    const [observations, featureSetRecords] = await Promise.all([
      this.obsRepo.find(athleteId, { trainingDayId }),
      this.loadFeatureSetsForDay(athleteId, trainingDayId),
    ]);

    const featureSetTraces = featureSetRecords.map(traceFromRecord);

    const obTraces: ObservationTrace[] = observations.map((obs) => {
      const relevant = featureSetRecords.filter((r) =>
        ((r.data as { sourceObsIds?: readonly string[] }).sourceObsIds ?? []).includes(obs.id),
      );
      const traces = (relevant.length > 0 ? relevant : []).map(traceFromRecord);
      const warnings: Warning[] = [];
      for (const t of traces) warnings.push(...t.warnings);

      return {
        observation: obs,
        source: sourceFromObservation(obs),
        quality: qualityFromObservation(obs),
        featureSets: traces,
        warnings,
      };
    });

    const allCategories: FeatureCategory[] = ['SESSION', 'LOAD', 'RECOVERY', 'BODY', 'CONDITION'];
    const computedCategories = new Set(
      featureSetTraces.filter((t) => t.status === 'COMPUTED').map((t) => t.category),
    );
    const pendingCategories = allCategories.filter((c) => !computedCategories.has(c));
    const failedCategories = featureSetTraces
      .filter((t) => t.status === 'INVALIDATED')
      .map((t) => t.category);

    const computedTraces = featureSetTraces.filter((t) => t.status === 'COMPUTED');
    const avgConfidence =
      computedTraces.length > 0
        ? computedTraces.reduce((acc, t) => acc + t.confidence, 0) / computedTraces.length
        : null;

    return {
      athleteId,
      trainingDayId,
      observations: obTraces,
      featureSets: featureSetTraces,
      summary: {
        totalObservations: observations.length,
        totalFeatureSets: featureSetRecords.length,
        pendingCategories,
        failedCategories,
        avgConfidence,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async loadFeatureSetsForDay(
    athleteId: string,
    trainingDayId: string,
  ): Promise<FeatureSetRecord[]> {
    const [sessionRecords, loadRecord, recoveryRecord, bodyRecord, conditionRecord] =
      await Promise.all([
        this.featureRepo.findSessionFeaturesByRange(athleteId, trainingDayId, trainingDayId),
        this.featureRepo.findLoadFeatures(athleteId, trainingDayId),
        this.featureRepo.findRecoveryFeatures(athleteId, trainingDayId),
        this.featureRepo.findBodyFeatures(athleteId, trainingDayId),
        this.featureRepo.findConditionFeatures(athleteId, trainingDayId),
      ]);

    return [
      ...sessionRecords,
      ...(loadRecord ? [loadRecord] : []),
      ...(recoveryRecord ? [recoveryRecord] : []),
      ...(bodyRecord ? [bodyRecord] : []),
      ...(conditionRecord ? [conditionRecord] : []),
    ];
  }
}
