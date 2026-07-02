/**
 * ADAPTATION MODEL v1 — Scoring Functions
 *
 * Pure functions that score each adaptation dimension.
 * No side effects, no I/O.
 *
 * References: docs/models/ADAPTATION_MODEL.md §4.1–4.4
 */

import type { LoadFeatureSet, RecoveryFeatureSet, SessionFeatureSet } from '@/core/features/types';
import type { RecoveryState, FatigueState } from '@/core/digital-twin/types';
import type { DimensionScore, ScoredAdaptationDimensions } from './types';
import type {
  AdaptationStatus,
  AdaptationTrend,
  DataCompleteness,
} from '@/core/digital-twin/types';

// Dimension weights (must sum to 1.0)
const WEIGHTS = {
  loadProgression: 0.3,
  neuromuscularEfficiency: 0.25,
  autonomicAdaptation: 0.25,
  recoveryQuality: 0.2,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Individual dimension scorers
// ─────────────────────────────────────────────────────────────────────────────

export function scoreLoadProgression(load: LoadFeatureSet | 'PENDING'): DimensionScore {
  if (load === 'PENDING') return { score: null, available: false, reason: 'load features pending' };

  const { acwr, acuteChronicLoadTrend, chronicLoad } = load;

  if (chronicLoad < 20) {
    const score = lerp(0, 20, 0, chronicLoad / 20);
    return {
      score: Math.round(score),
      available: true,
      reason: 'detraining territory (chronicLoad < 20)',
    };
  }

  if (acwr !== null && acwr > 1.5) {
    const score = lerp(0, 30, 1.5, Math.min(acwr, 2.5));
    return {
      score: Math.round(30 - score),
      available: true,
      reason: 'excessive ACWR — no adaptive benefit',
    };
  }

  if (
    acuteChronicLoadTrend !== null &&
    acuteChronicLoadTrend > 0.02 &&
    acwr !== null &&
    acwr >= 0.8 &&
    acwr <= 1.3
  ) {
    const trendBonus = Math.min((acuteChronicLoadTrend - 0.02) / 0.08, 1.0) * 25;
    const acwrBonus = acwr >= 0.95 && acwr <= 1.15 ? 5 : 0;
    const score = Math.min(75 + trendBonus + acwrBonus, 100);
    return {
      score: Math.round(score),
      available: true,
      reason: 'progressive overload in optimal zone',
    };
  }

  if (acwr !== null && acwr >= 0.7 && acwr <= 1.3) {
    const trend = acuteChronicLoadTrend ?? 0;
    const score = trend >= 0 ? 60 : 50 + (trend / -0.02) * -10;
    return {
      score: Math.round(Math.max(45, Math.min(70, score))),
      available: true,
      reason: 'maintaining load',
    };
  }

  if (
    acuteChronicLoadTrend !== null &&
    acuteChronicLoadTrend < -0.02 &&
    (acwr === null || acwr < 0.8)
  ) {
    const declineScore = Math.max(5, 30 + (acuteChronicLoadTrend / -0.02) * 5);
    return {
      score: Math.round(Math.min(30, declineScore)),
      available: true,
      reason: 'load declining',
    };
  }

  return { score: 40, available: true, reason: 'default — insufficient trend signal' };
}

export function scoreNeuromuscularEfficiency(
  sessions: readonly SessionFeatureSet[],
): DimensionScore {
  const eligible = sessions.filter((s) => s.hrDriftPercent !== null);
  if (eligible.length === 0) {
    return { score: null, available: false, reason: 'no sessions with hrDriftPercent' };
  }

  const meanDrift =
    eligible.reduce((sum, s) => sum + (s.hrDriftPercent as number), 0) / eligible.length;
  const meanIF =
    sessions.filter((s) => s.intensityFactor !== null).length > 0
      ? sessions
          .filter((s) => s.intensityFactor !== null)
          .reduce((sum, s) => sum + (s.intensityFactor as number), 0) /
        sessions.filter((s) => s.intensityFactor !== null).length
      : null;

  let base: number;
  if (meanDrift < 3) {
    base = lerp(80, 100, 0, 3 - meanDrift);
  } else if (meanDrift <= 8) {
    base = lerp(50, 80, 3, 8 - (meanDrift - 3));
  } else if (meanDrift <= 10) {
    base = lerp(40, 50, 8, 10 - (meanDrift - 8));
  } else {
    base = Math.max(0, 40 - (meanDrift - 10) * 3);
  }

  const ifBonus = meanIF !== null && meanIF > 0.85 ? 10 : 0;

  return {
    score: Math.round(Math.min(100, base + ifBonus)),
    available: true,
    reason: `meanDrift=${meanDrift.toFixed(1)}%`,
  };
}

export function scoreAutonomicAdaptation(recovery: RecoveryFeatureSet | 'PENDING'): DimensionScore {
  if (recovery === 'PENDING') {
    return { score: null, available: false, reason: 'recovery features pending' };
  }

  const { hrvDeltaFromBaseline, rhrDeltaFromBaseline } = recovery;

  if (hrvDeltaFromBaseline === null && rhrDeltaFromBaseline === null) {
    return { score: null, available: false, reason: 'HRV and RHR delta both unavailable' };
  }

  let score: number;
  let partial = false;

  if (hrvDeltaFromBaseline !== null && rhrDeltaFromBaseline !== null) {
    if (hrvDeltaFromBaseline > 5 && rhrDeltaFromBaseline < -2) {
      const hrvBonus = Math.min((hrvDeltaFromBaseline - 5) / 10, 1.0) * 20;
      score = Math.min(80 + hrvBonus, 100);
    } else if (hrvDeltaFromBaseline >= -5 && hrvDeltaFromBaseline <= 5) {
      score = lerp(50, 70, -5, hrvDeltaFromBaseline + 5);
    } else if (hrvDeltaFromBaseline < -10) {
      score = Math.max(0, 30 + (hrvDeltaFromBaseline + 10) * 2);
    } else {
      score = 40;
    }
  } else if (hrvDeltaFromBaseline !== null) {
    partial = true;
    if (hrvDeltaFromBaseline > 5) score = 70;
    else if (hrvDeltaFromBaseline >= -5) score = 50;
    else score = Math.max(10, 30 + (hrvDeltaFromBaseline + 10) * 2);
  } else {
    partial = true;
    score = rhrDeltaFromBaseline! < -2 ? 65 : rhrDeltaFromBaseline! > 2 ? 35 : 50;
  }

  if (partial) score = Math.max(0, score - 20);

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    available: true,
    reason: partial ? 'partial ANS data' : 'full ANS data',
  };
}

export function scoreRecoveryQuality(
  recoveryState: RecoveryState | null,
  fatigueState: FatigueState | null,
): DimensionScore {
  if (recoveryState === null && fatigueState === null) {
    return {
      score: null,
      available: false,
      reason: 'no recovery or fatigue state in Digital Twin',
    };
  }

  const readiness = recoveryState?.readinessScore ?? null;
  const capacity = fatigueState?.trainingCapacity ?? null;
  const accumulationDays = fatigueState?.consecutiveAccumulationDays ?? 0;

  let score: number;

  if (capacity === 'REST_ONLY') {
    score = readiness !== null ? Math.min(30, readiness * 0.3) : 10;
  } else if (readiness !== null && readiness >= 75 && capacity === 'FULL') {
    score = lerp(80, 100, 75, readiness - 75);
  } else if (readiness !== null && readiness >= 50 && capacity !== 'REST_ONLY') {
    score = lerp(50, 75, 50, readiness - 50);
  } else if (readiness !== null) {
    score = lerp(20, 50, 0, readiness);
  } else {
    score = capacity === 'FULL' ? 65 : capacity === 'REDUCED' ? 50 : 30;
  }

  if (accumulationDays > 7) {
    score = Math.max(0, score - 20);
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    available: true,
    reason: `readiness=${readiness}, capacity=${capacity}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Index synthesis
// ─────────────────────────────────────────────────────────────────────────────

export function synthesizeAdaptationIndex(dims: ScoredAdaptationDimensions): {
  score: number | null;
  confidence: number;
  dataCompleteness: DataCompleteness;
  availableDimensionCount: number;
  totalAvailableWeight: number;
} {
  const entries = [
    { key: 'loadProgression' as const, weight: WEIGHTS.loadProgression },
    { key: 'neuromuscularEfficiency' as const, weight: WEIGHTS.neuromuscularEfficiency },
    { key: 'autonomicAdaptation' as const, weight: WEIGHTS.autonomicAdaptation },
    { key: 'recoveryQuality' as const, weight: WEIGHTS.recoveryQuality },
  ];

  const available = entries.filter((e) => dims[e.key].available && dims[e.key].score !== null);
  const totalAvailableWeight = available.reduce((s, e) => s + e.weight, 0);
  const availableDimensionCount = available.length;

  const dataCompleteness: DataCompleteness =
    availableDimensionCount === 4
      ? 'FULL'
      : availableDimensionCount >= 2
        ? 'PARTIAL'
        : availableDimensionCount === 1
          ? 'SPARSE'
          : 'INSUFFICIENT';

  if (totalAvailableWeight < 0.5) {
    return {
      score: null,
      confidence: 0.1,
      dataCompleteness: 'INSUFFICIENT',
      availableDimensionCount,
      totalAvailableWeight,
    };
  }

  const weightedSum = available.reduce((sum, e) => {
    const adjustedWeight = e.weight / totalAvailableWeight;
    return sum + (dims[e.key].score as number) * adjustedWeight;
  }, 0);

  const baseConfidence = availableDimensionCount / 4;

  return {
    score: Math.round(Math.max(0, Math.min(100, weightedSum))),
    confidence: baseConfidence,
    dataCompleteness,
    availableDimensionCount,
    totalAvailableWeight,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification
// ─────────────────────────────────────────────────────────────────────────────

export function classifyAdaptationStatus(index: number): AdaptationStatus {
  if (index >= 70) return 'POSITIVELY_ADAPTING';
  if (index >= 50) return 'MAINTAINING';
  if (index >= 30) return 'PLATEAUING';
  if (index >= 15) return 'MALADAPTING';
  return 'DETRAINING';
}

export function computeAdaptationTrend(recentHistory: readonly number[]): AdaptationTrend {
  if (recentHistory.length < 7) return 'STABLE';

  const n = recentHistory.length;
  const mean = recentHistory.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const x = n - 1 - i;
    const xMean = (n - 1) / 2;
    numerator += (x - xMean) * (recentHistory[i] - mean);
    denominator += (x - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;

  if (slope > 1.0) return 'IMPROVING';
  if (slope < -1.0) return 'DECLINING';
  return 'STABLE';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function lerp(min: number, max: number, rangeMin: number, value: number): number {
  const clamped = Math.max(0, Math.min(max - min, value - rangeMin));
  return min + clamped;
}
