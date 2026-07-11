/**
 * PHYSICAL HEALTH MODEL v1 — Scoring & Inference
 *
 * Deterministic latent-state inference from observation history.
 * Never averages raw pain scores naively — uses time-decayed weighting.
 */

import type { DataCompleteness } from '@/core/digital-twin/types';
import type { I18nItem } from '@/core/inference/shared/types';
import type {
  ConditionStatus,
  ConditionTrend,
  TrainingCapacityLevel,
} from '@/core/physical-health/types';
import type {
  ConditionInferenceInput,
  ConditionObservationInput,
  InferredConditionView,
  PhysicalHealthDecision,
  PhysicalHealthDecisionVerdict,
  PhysicalHealthRecommendation,
  PhysicalHealthSignals,
} from './types';

const TREND_SLOPE_THRESHOLD = 0.3;
const SEVERITY_DECAY_HALF_LIFE_DAYS = 7;
const MS_PER_DAY = 86_400_000;

// ─────────────────────────────────────────────────────────────────────────────
// Severity — time-decayed weighted inference (not a simple average)
// ─────────────────────────────────────────────────────────────────────────────

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY;
}

function decayWeight(daysAgo: number): number {
  return Math.exp((-daysAgo * Math.LN2) / SEVERITY_DECAY_HALF_LIFE_DAYS);
}

function inferSeverityFromObservations(
  observations: readonly ConditionObservationInput[],
  referenceAt: Date,
): { severity: number; evidenceIds: string[] } {
  const windowDays = 28;
  const symptomatic = observations.filter(
    (o) =>
      o.symptomPresent &&
      o.severityReported != null &&
      daysBetween(o.observedAt, referenceAt) <= windowDays &&
      daysBetween(o.observedAt, referenceAt) >= 0,
  );

  if (symptomatic.length === 0) {
    return { severity: 0, evidenceIds: [] };
  }

  let weightedSum = 0;
  let weightTotal = 0;
  const evidenceIds: string[] = [];

  for (const obs of symptomatic) {
    const daysAgo = Math.max(0, daysBetween(obs.observedAt, referenceAt));
    const w = decayWeight(daysAgo);
    weightedSum += (obs.severityReported as number) * w;
    weightTotal += w;
    evidenceIds.push(obs.id);
  }

  const severity = weightTotal > 0 ? weightedSum / weightTotal : 0;
  return {
    severity: Math.round(severity * 10) / 10,
    evidenceIds: evidenceIds.slice(-5),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Trend — linear regression on symptomatic observations (14d)
// ─────────────────────────────────────────────────────────────────────────────

export function inferTrend(
  observations: readonly ConditionObservationInput[],
  referenceAt: Date,
): ConditionTrend {
  const points = observations
    .filter(
      (o) =>
        o.symptomPresent &&
        o.severityReported != null &&
        daysBetween(o.observedAt, referenceAt) <= 14 &&
        daysBetween(o.observedAt, referenceAt) >= 0,
    )
    .sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());

  if (points.length < 3) return 'UNKNOWN';

  const t0 = points[0].observedAt.getTime();
  const pairs = points.map((p) => ({
    x: (p.observedAt.getTime() - t0) / MS_PER_DAY,
    y: p.severityReported as number,
  }));

  const n = pairs.length;
  const sumX = pairs.reduce((a, p) => a + p.x, 0);
  const sumY = pairs.reduce((a, p) => a + p.y, 0);
  const sumXY = pairs.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = pairs.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;

  if (denom === 0) return 'UNKNOWN';

  const slope = (n * sumXY - sumX * sumY) / denom;
  if (slope < -TREND_SLOPE_THRESHOLD) return 'IMPROVING';
  if (slope > TREND_SLOPE_THRESHOLD) return 'WORSENING';
  return 'STABLE';
}

// ─────────────────────────────────────────────────────────────────────────────
// Functional capacity — prefer explicit assessment, else infer from severity
// ─────────────────────────────────────────────────────────────────────────────

function inferTrainingCapacityFromSeverity(severity: number): TrainingCapacityLevel {
  if (severity === 0) return 'FULL';
  if (severity <= 3) return 'REDUCED';
  if (severity <= 6) return 'LIMITED';
  return 'UNABLE';
}

function resolveFunctionalCapacity(
  condition: ConditionInferenceInput,
  inferredSeverity: number,
  referenceAt: Date,
): TrainingCapacityLevel {
  const [latest] = [...condition.functionalCapacities]
    .filter((fc) => daysBetween(fc.assessedAt, referenceAt) >= 0)
    .sort((a, b) => b.assessedAt.getTime() - a.assessedAt.getTime());

  if (latest) return latest.trainingCapacity;
  if (!condition.affectsTraining) return 'FULL';
  return inferTrainingCapacityFromSeverity(inferredSeverity);
}

// ─────────────────────────────────────────────────────────────────────────────
// Status & recurrence detection
// ─────────────────────────────────────────────────────────────────────────────

function hasRecentSymptom(
  observations: readonly ConditionObservationInput[],
  referenceAt: Date,
  withinDays: number,
): boolean {
  return observations.some(
    (o) =>
      o.symptomPresent &&
      daysBetween(o.observedAt, referenceAt) <= withinDays &&
      daysBetween(o.observedAt, referenceAt) >= 0,
  );
}

function inferStatus(
  condition: ConditionInferenceInput,
  severity: number,
  trend: ConditionTrend,
  referenceAt: Date,
): { status: ConditionStatus; recurrenceCount: number } {
  const wasResolved = condition.resolvedAt != null || condition.episodes.some((e) => e.resolvedAt);
  const recentSymptom = hasRecentSymptom(condition.observations, referenceAt, 14);
  const veryRecentSymptom = hasRecentSymptom(condition.observations, referenceAt, 7);

  if (wasResolved && veryRecentSymptom) {
    return {
      status: 'RECURRENT',
      recurrenceCount: condition.recurrenceCount + 1,
    };
  }

  if (condition.resolvedAt && !recentSymptom && severity < 1) {
    return { status: 'RESOLVED', recurrenceCount: condition.recurrenceCount };
  }

  if (condition.observations.length <= 1) {
    return { status: 'NEW', recurrenceCount: condition.recurrenceCount };
  }

  if (trend === 'IMPROVING')
    return { status: 'IMPROVING', recurrenceCount: condition.recurrenceCount };
  if (trend === 'WORSENING')
    return { status: 'WORSENING', recurrenceCount: condition.recurrenceCount };
  if (severity < 1 && !recentSymptom) {
    return { status: 'STABLE', recurrenceCount: condition.recurrenceCount };
  }

  return { status: severity > 0 ? 'ACTIVE' : 'STABLE', recurrenceCount: condition.recurrenceCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence
// ─────────────────────────────────────────────────────────────────────────────

function inferConfidence(
  observations: readonly ConditionObservationInput[],
  functionalCapacity: TrainingCapacityLevel,
  severity: number,
  referenceAt: Date,
): number {
  const count = observations.length;
  let confidence = Math.min(0.95, 0.35 + count * 0.08);

  const [latest] = observations
    .slice()
    .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());
  if (latest && daysBetween(latest.observedAt, referenceAt) <= 3) {
    confidence += 0.1;
  }

  const onlyAsymptomatic = observations.length > 0 && observations.every((o) => !o.symptomPresent);
  if (onlyAsymptomatic) confidence -= 0.15;

  const severityCapacity = inferTrainingCapacityFromSeverity(severity);
  if (
    severityCapacity !== functionalCapacity &&
    (severityCapacity === 'FULL') !== (functionalCapacity === 'FULL')
  ) {
    confidence -= 0.1;
  }

  return Math.max(0.2, Math.min(0.95, Math.round(confidence * 100) / 100));
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery progression estimate
// ─────────────────────────────────────────────────────────────────────────────

function estimateRecoveryDays(
  severity: number,
  trend: ConditionTrend,
  status: ConditionStatus,
): number | null {
  if (status === 'RESOLVED' || severity < 1) return null;
  if (trend !== 'IMPROVING') return null;

  const baseDays = Math.ceil(severity * 2.5);
  return Math.max(1, baseDays);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-condition inference
// ─────────────────────────────────────────────────────────────────────────────

export function inferConditionState(
  condition: ConditionInferenceInput,
  referenceAt: Date,
  computedAt: Date,
): InferredConditionView & {
  update: {
    severity: number;
    status: ConditionStatus;
    confidence: number;
    estimatedRecoveryDays: number | null;
    recurrenceCount: number;
  };
} {
  const { severity, evidenceIds } = inferSeverityFromObservations(
    condition.observations,
    referenceAt,
  );
  const trend = inferTrend(condition.observations, referenceAt);
  const functionalCapacity = resolveFunctionalCapacity(condition, severity, referenceAt);
  const { status, recurrenceCount } = inferStatus(condition, severity, trend, referenceAt);
  const confidence = inferConfidence(
    condition.observations,
    functionalCapacity,
    severity,
    referenceAt,
  );
  const estimatedRecoveryDays = estimateRecoveryDays(severity, trend, status);

  return {
    conditionId: condition.id,
    label: condition.label,
    bodyRegion: condition.bodyRegion,
    side: condition.side,
    type: condition.type,
    affectsTraining: condition.affectsTraining,
    severity,
    status,
    trend,
    confidence,
    functionalCapacity,
    estimatedRecoveryDays,
    evidenceObservationIds: evidenceIds,
    computedAt,
    update: {
      severity,
      status,
      confidence,
      estimatedRecoveryDays,
      recurrenceCount,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate inference
// ─────────────────────────────────────────────────────────────────────────────

const CAPACITY_ORDER: TrainingCapacityLevel[] = ['FULL', 'REDUCED', 'LIMITED', 'UNABLE'];

function worstCapacity(capacities: TrainingCapacityLevel[]): TrainingCapacityLevel {
  if (capacities.length === 0) return 'FULL';
  return capacities.reduce((worst, c) =>
    CAPACITY_ORDER.indexOf(c) > CAPACITY_ORDER.indexOf(worst) ? c : worst,
  );
}

export function isActiveCondition(status: ConditionStatus): boolean {
  return status !== 'RESOLVED';
}

export function buildPhysicalHealthSignals(
  conditions: readonly InferredConditionView[],
): PhysicalHealthSignals {
  const active = conditions.filter((c) => isActiveCondition(c.status));
  const maxSeverity = active.length > 0 ? Math.max(...active.map((c) => c.severity)) : 0;
  const aggregateTrainingCapacity = worstCapacity(
    active.map((c) => c.functionalCapacity ?? 'FULL'),
  );

  return {
    activeConditionCount: active.length,
    maxSeverity,
    aggregateTrainingCapacity,
    trainingBlockedByCondition: active.some(
      (c) => c.affectsTraining && c.severity >= 5 && c.functionalCapacity !== 'FULL',
    ),
    improvingCount: active.filter((c) => c.trend === 'IMPROVING').length,
    worseningCount: active.filter((c) => c.trend === 'WORSENING').length,
    recurrentCount: conditions.filter((c) => c.status === 'RECURRENT').length,
  };
}

export function classifyDataCompleteness(
  conditions: readonly ConditionInferenceInput[],
): DataCompleteness {
  if (conditions.length === 0) return 'INSUFFICIENT';
  const withObs = conditions.filter((c) => c.observations.length > 0).length;
  if (withObs === 0) return 'INSUFFICIENT';
  if (withObs < conditions.length) return 'PARTIAL';
  const avgObs = withObs / conditions.length;
  if (avgObs >= 3) return 'FULL';
  return 'SPARSE';
}

export function computeAggregateConfidence(conditions: readonly InferredConditionView[]): number {
  const active = conditions.filter((c) => isActiveCondition(c.status));
  if (active.length === 0) return 0.9;
  const avg = active.reduce((s, c) => s + c.confidence, 0) / active.length;
  return Math.round(avg * 100) / 100;
}

export function findPrimaryLimitingCondition(
  conditions: readonly InferredConditionView[],
): string | null {
  const active = conditions
    .filter((c) => isActiveCondition(c.status) && c.affectsTraining)
    .sort((a, b) => b.severity - a.severity);
  return active[0]?.conditionId ?? null;
}

export function buildPhysicalHealthDecision(
  signals: PhysicalHealthSignals,
): PhysicalHealthDecision {
  let verdict: PhysicalHealthDecisionVerdict;
  const rationale: I18nItem[] = [];

  if (signals.activeConditionCount === 0) {
    verdict = 'CLEAR';
    rationale.push({ code: 'physical.decision.clear' });
  } else if (signals.aggregateTrainingCapacity === 'UNABLE') {
    verdict = 'REST_RECOMMENDED';
    rationale.push({ code: 'physical.decision.rest_recommended' });
  } else if (signals.trainingBlockedByCondition) {
    verdict = 'LIMIT_TRAINING';
    rationale.push({ code: 'physical.decision.limit_training' });
  } else if (signals.worseningCount > 0 || signals.maxSeverity >= 6) {
    verdict = 'REDUCE_LOAD';
    rationale.push({ code: 'physical.decision.reduce_load' });
  } else if (signals.activeConditionCount > 0) {
    verdict = 'MONITOR';
    rationale.push({ code: 'physical.decision.monitor' });
  } else {
    verdict = 'INSUFFICIENT_DATA';
    rationale.push({ code: 'physical.decision.insufficient_data' });
  }

  return { verdict, rationale };
}

export function buildPhysicalHealthRecommendation(
  signals: PhysicalHealthSignals,
  confidence: number,
): PhysicalHealthRecommendation {
  return {
    trainingCapacity: signals.aggregateTrainingCapacity,
    confidence,
    evidence: [
      {
        code: 'physical.recommendation.evidence',
        params: {
          activeCount: signals.activeConditionCount,
          maxSeverity: signals.maxSeverity,
        },
      },
    ],
  };
}
