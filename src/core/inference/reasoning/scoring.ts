/**
 * REASONING ENGINE v1 — Scoring Functions
 *
 * Pure functions for cross-model synthesis:
 *   - mapToDirection: maps each model's state to TRAIN/EASY/REST
 *   - computeConsistency: measures inter-model agreement
 *   - synthesizeVerdict: safety-first verdict from all directions
 *   - detectConflicts: cross-model contradictions
 *   - detectOpportunities: physiological windows
 *   - buildKeyFindings: top observations ordered by severity
 *   - selectLimitingFactor: highest-severity constraint across models
 *   - buildEvidenceGraph: contribution weights per model
 *
 * All functions are PURE — no side effects, no DB calls.
 */

import type {
  RecoveryState,
  FatigueState,
  AdaptationState,
  OverallVerdict,
  PhysiologicalConsistency,
  SystemAttentionPriority,
  ReasoningFinding,
  ReasoningOpportunity,
  ReasoningConflict,
  DataCompleteness,
} from '@/core/digital-twin/types';
import type { PhysiologicalDirection, ModelDirections } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Direction mapping
// ─────────────────────────────────────────────────────────────────────────────

export function mapRecoveryDirection(r: RecoveryState | null): PhysiologicalDirection {
  if (!r) return 'UNKNOWN';
  switch (r.readinessCategory) {
    case 'OPTIMAL':
    case 'ADEQUATE':
      return 'TRAIN';
    case 'REDUCED':
      return 'EASY';
    case 'LOW':
    case 'VERY_LOW':
      return 'REST';
    default:
      return 'UNKNOWN';
  }
}

export function mapFatigueDirection(f: FatigueState | null): PhysiologicalDirection {
  if (!f) return 'UNKNOWN';
  switch (f.fatigueLevel) {
    case 'FRESH':
    case 'FUNCTIONAL_LOW':
      return 'TRAIN';
    case 'FUNCTIONAL_HIGH':
    case 'ACCUMULATED':
      return 'EASY';
    case 'NON_FUNCTIONAL_RISK':
    case 'OVERREACHING_RISK':
      return 'REST';
    default:
      return 'UNKNOWN';
  }
}

export function mapAdaptationDirection(a: AdaptationState | null): PhysiologicalDirection {
  if (!a) return 'UNKNOWN';
  switch (a.adaptationStatus) {
    case 'POSITIVELY_ADAPTING':
    case 'MAINTAINING':
      return 'TRAIN';
    case 'PLATEAUING':
      return 'EASY';
    case 'MALADAPTING':
    case 'DETRAINING':
      return 'REST';
    default:
      return 'UNKNOWN';
  }
}

export function buildModelDirections(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
): ModelDirections {
  return {
    recovery: mapRecoveryDirection(r),
    fatigue: mapFatigueDirection(f),
    adaptation: mapAdaptationDirection(a),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Consistency computation
// ─────────────────────────────────────────────────────────────────────────────

export function computeConsistency(dirs: ModelDirections): {
  consistency: PhysiologicalConsistency;
  score: number;
} {
  const known = [dirs.recovery, dirs.fatigue, dirs.adaptation].filter(
    (d) => d !== 'UNKNOWN',
  ) as PhysiologicalDirection[];

  if (known.length < 2) {
    return { consistency: 'INSUFFICIENT_DATA', score: 0 };
  }

  const trainCount = known.filter((d) => d === 'TRAIN').length;
  const easyCount = known.filter((d) => d === 'EASY').length;
  const restCount = known.filter((d) => d === 'REST').length;
  const total = known.length;

  const maxGroup = Math.max(trainCount, easyCount, restCount);
  const agreementRatio = maxGroup / total;
  const score = Math.round(agreementRatio * 100);

  // Conflicting: REST and TRAIN coexist with known count
  const hasConflict = restCount > 0 && trainCount > 0;

  let consistency: PhysiologicalConsistency;
  if (agreementRatio === 1) {
    consistency = 'ALIGNED';
  } else if (hasConflict) {
    consistency = 'CONFLICTING';
  } else {
    consistency = 'PARTIALLY_ALIGNED';
  }

  return { consistency, score };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verdict synthesis (safety-first)
// ─────────────────────────────────────────────────────────────────────────────

export function synthesizeVerdict(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
  availableCount: number,
): OverallVerdict {
  if (availableCount < 2) return 'INSUFFICIENT_DATA';

  // Safety rules — evaluated top-down, first match wins
  if (f?.fatigueLevel === 'OVERREACHING_RISK') return 'RECOVER';
  if (f?.trainingCapacity === 'REST_ONLY') return 'RECOVER';
  if (r?.readinessCategory === 'LOW' || r?.readinessCategory === 'VERY_LOW') return 'RECOVER';

  if (a?.overreachingWithoutAdaptationDetected) return 'CAUTION';

  // Capacity conflict → CAUTION
  const recoveryDir = mapRecoveryDirection(r);
  const fatigueDir = mapFatigueDirection(f);
  if (recoveryDir === 'TRAIN' && fatigueDir === 'REST') return 'CAUTION';

  // Race ready: recovery optimal, fatigue fresh, adaptation peak imminent
  if (
    r?.readinessCategory === 'OPTIMAL' &&
    (f?.fatigueLevel === 'FRESH' || f?.fatigueLevel === 'FUNCTIONAL_LOW') &&
    a?.estimatedAdaptationPeak != null &&
    a.estimatedAdaptationPeak <= 5
  ) {
    return 'RACE_READY';
  }

  // Train hard: all green
  if (
    (r?.readinessCategory === 'OPTIMAL' || r?.readinessCategory === 'ADEQUATE') &&
    (f?.fatigueLevel === 'FRESH' || f?.fatigueLevel === 'FUNCTIONAL_LOW') &&
    (a?.adaptationStatus === 'POSITIVELY_ADAPTING' || a?.adaptationStatus === 'MAINTAINING')
  ) {
    return 'TRAIN_HARD';
  }

  // Train easy: reduced capacity
  if (
    f?.fatigueLevel === 'ACCUMULATED' ||
    f?.trainingCapacity === 'REDUCED' ||
    r?.readinessCategory === 'REDUCED'
  ) {
    return 'TRAIN_EASY';
  }

  if (f?.fatigueLevel === 'FUNCTIONAL_HIGH') return 'TRAIN_EASY';

  // Train smart: moderate conditions
  return 'TRAIN_SMART';
}

// ─────────────────────────────────────────────────────────────────────────────
// Conflict detection
// ─────────────────────────────────────────────────────────────────────────────

export function detectConflicts(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
): ReasoningConflict[] {
  const conflicts: ReasoningConflict[] = [];

  // CAPACITY_CONFLICT: recovery adequate but fatigue REST_ONLY
  if (
    r &&
    f &&
    (r.readinessCategory === 'OPTIMAL' || r.readinessCategory === 'ADEQUATE') &&
    f.trainingCapacity === 'REST_ONLY'
  ) {
    conflicts.push({
      id: 'CAPACITY_CONFLICT_01',
      type: 'CAPACITY_CONFLICT',
      description:
        'Recovery markers indicate readiness, but fatigue load demands complete rest. Objective markers are contradicting subjective capacity.',
      models: ['Recovery', 'Fatigue'],
      resolution:
        'Trust the fatigue model — physiological load overrides readiness readiness. Rest today, reassess tomorrow.',
    });
  }

  // TIMING_CONFLICT: plateau risk but cannot increase load
  if (a?.plateauRisk && f && f.trainingCapacity === 'REST_ONLY') {
    conflicts.push({
      id: 'TIMING_CONFLICT_01',
      type: 'TIMING_CONFLICT',
      description:
        'Adaptation plateau detected — a load increase stimulus is needed — but fatigue capacity is currently REST_ONLY. The body needs more training and rest simultaneously.',
      models: ['Adaptation', 'Fatigue'],
      resolution:
        'Prioritise recovery for 3–5 days to restore fatigue capacity, then introduce a controlled load increase.',
    });
  }

  // SIGNAL_CONFLICT: high overreaching risk but adaptation showing positive
  if (
    f &&
    a &&
    f.functionalOverreachingRisk === 'CRITICAL' &&
    a.adaptationStatus === 'POSITIVELY_ADAPTING'
  ) {
    conflicts.push({
      id: 'SIGNAL_CONFLICT_01',
      type: 'SIGNAL_CONFLICT',
      description:
        'Fatigue model detects critical overreaching risk, but adaptation model shows positive adaptation. This pattern can occur in the early supercompensation window — but also signals data lag.',
      models: ['Fatigue', 'Adaptation'],
      resolution:
        'Treat this as a supercompensation window if recent load was intentional. Introduce a recovery day before the next hard session.',
    });
  }

  return conflicts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Opportunity detection
// ─────────────────────────────────────────────────────────────────────────────

export function detectOpportunities(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
): ReasoningOpportunity[] {
  const opportunities: ReasoningOpportunity[] = [];

  // LOAD_INCREASE: recovery adequate, fatigue low, adaptation plateauing
  if (
    r &&
    f &&
    a &&
    (r.readinessCategory === 'OPTIMAL' || r.readinessCategory === 'ADEQUATE') &&
    (f.fatigueLevel === 'FRESH' || f.fatigueLevel === 'FUNCTIONAL_LOW') &&
    (a.adaptationStatus === 'PLATEAUING' || a.plateauRisk)
  ) {
    opportunities.push({
      id: 'OPP_LOAD_INCREASE',
      type: 'LOAD_INCREASE',
      title: 'Load increase window',
      rationale:
        'Recovery is adequate and fatigue is low, but adaptation has plateaued. This is the optimal window to introduce a progressive overload stimulus.',
      expectedBenefit: 82,
      timeWindow: 'THIS_WEEK',
    });
  }

  // QUALITY_SESSION: all green, no plateau
  if (
    r?.readinessCategory === 'OPTIMAL' &&
    (f?.fatigueLevel === 'FRESH' || f?.fatigueLevel === 'FUNCTIONAL_LOW') &&
    !a?.plateauRisk
  ) {
    opportunities.push({
      id: 'OPP_QUALITY_SESSION',
      type: 'QUALITY_SESSION',
      title: 'Optimal quality session window',
      rationale:
        'Recovery is optimal and fatigue is minimal. Today is a high-value day for a key quality session — interval, threshold, or race-pace effort.',
      expectedBenefit: 90,
      timeWindow: 'TODAY',
    });
  }

  // DELOAD: consecutive accumulation days ≥ 5
  if (
    f &&
    f.consecutiveAccumulationDays >= 5 &&
    (f.trajectory === 'ACCUMULATING' || f.trajectory === 'ACCELERATING')
  ) {
    opportunities.push({
      id: 'OPP_DELOAD',
      type: 'DELOAD',
      title: 'Deload week — fatigue is accumulating',
      rationale: `Fatigue has been accumulating for ${f.consecutiveAccumulationDays} consecutive days. A deload week now will produce a supercompensation response.`,
      expectedBenefit: 75,
      timeWindow: 'THIS_WEEK',
    });
  }

  // RACE_READINESS: adaptation peak imminent
  if (
    a &&
    a.estimatedAdaptationPeak !== null &&
    a.estimatedAdaptationPeak !== undefined &&
    a.estimatedAdaptationPeak <= 7 &&
    r &&
    (r.readinessCategory === 'OPTIMAL' || r.readinessCategory === 'ADEQUATE')
  ) {
    opportunities.push({
      id: 'OPP_RACE_READINESS',
      type: 'RACE_READINESS',
      title: `Peak form in ~${a.estimatedAdaptationPeak} day(s)`,
      rationale:
        'Adaptation signals indicate peak form is imminent. Protect this window — avoid high training stress and prioritise sleep and nutrition.',
      expectedBenefit: 95,
      timeWindow: a.estimatedAdaptationPeak <= 2 ? 'TODAY' : 'THIS_WEEK',
    });
  }

  // RECOVERY_WINDOW: recovery is low — protect it
  if (r && (r.readinessCategory === 'LOW' || r.readinessCategory === 'VERY_LOW')) {
    opportunities.push({
      id: 'OPP_RECOVERY_WINDOW',
      type: 'RECOVERY_WINDOW',
      title: 'Recovery window — protect rest today',
      rationale:
        'Readiness is critically low. Additional training today will deepen the deficit. Protecting this rest period is the highest-value action.',
      expectedBenefit: 80,
      timeWindow: 'TODAY',
    });
  }

  // Return max 2 opportunities (highest expectedBenefit first)
  return opportunities.sort((a, b) => b.expectedBenefit - a.expectedBenefit).slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Key findings
// ─────────────────────────────────────────────────────────────────────────────

export function buildKeyFindings(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
  conflicts: ReasoningConflict[],
): ReasoningFinding[] {
  const findings: ReasoningFinding[] = [];

  // Cross-system: overreaching without adaptation (highest severity)
  if (a?.overreachingWithoutAdaptationDetected && f) {
    findings.push({
      id: 'FINDING_OVERREACHING_NO_ADAPT',
      category: 'CROSS_SYSTEM',
      severity: 'CRITICAL',
      title: 'Overreaching without adaptive response',
      evidence: [
        `Fatigue index: ${f.fatigueIndex ?? '—'}/100`,
        'Autonomic adaptation score suppressed',
        'Training load is not producing positive physiological adaptation',
      ],
      confidence: Math.min(f.confidence, a.confidence),
    });
  }

  // Fatigue: overreaching risk
  if (f?.fatigueLevel === 'OVERREACHING_RISK') {
    findings.push({
      id: 'FINDING_OVERREACHING_RISK',
      category: 'FATIGUE',
      severity: 'CRITICAL',
      title: 'Overreaching risk — mandatory rest required',
      evidence: [
        `Fatigue index: ${f.fatigueIndex ?? '—'}/100`,
        `${f.consecutiveAccumulationDays} consecutive accumulation days`,
        `Performance impairment estimated: ${Math.round(f.performanceImpairmentEstimate * 100)}%`,
      ],
      confidence: f.confidence,
    });
  }

  // Recovery: very low readiness
  if (r?.readinessCategory === 'VERY_LOW' || r?.readinessCategory === 'LOW') {
    findings.push({
      id: 'FINDING_LOW_READINESS',
      category: 'RECOVERY',
      severity: r.readinessCategory === 'VERY_LOW' ? 'CRITICAL' : 'WARNING',
      title: `Readiness ${r.readinessCategory === 'VERY_LOW' ? 'critically' : ''} low`,
      evidence: [
        `Readiness score: ${r.readinessScore ?? '—'}/100`,
        r.primaryLimitingFactor
          ? `Primary limiter: ${r.primaryLimitingFactor}`
          : 'Multiple systems affected',
        r.estimatedTimeToFullRecovery
          ? `Estimated recovery: ${r.estimatedTimeToFullRecovery} day(s)`
          : 'Recovery timeline unclear',
      ],
      confidence: r.confidence,
    });
  }

  // Cross-system: dissonance detected
  if (r?.dissonanceDetected) {
    findings.push({
      id: 'FINDING_DISSONANCE',
      category: 'CROSS_SYSTEM',
      severity: 'WARNING',
      title: 'Objective–subjective dissonance detected',
      evidence: [
        'HRV and subjective wellness markers disagree by > 20 points',
        'This pattern may indicate early illness, elevated stress, or underperformance on subjective report',
        'Prioritise objective markers (HRV, RHR) for training decisions today',
      ],
      confidence: r.confidence,
    });
  }

  // Fatigue: high accumulation
  if (f && f.fatigueLevel === 'ACCUMULATED' && f.consecutiveAccumulationDays >= 3) {
    findings.push({
      id: 'FINDING_FATIGUE_ACCUMULATING',
      category: 'FATIGUE',
      severity: 'WARNING',
      title: `Fatigue accumulating — ${f.consecutiveAccumulationDays} consecutive days`,
      evidence: [
        `Fatigue index: ${f.fatigueIndex ?? '—'}/100`,
        `Dominant system: ${f.dominantDimension}`,
        `Estimated time to fresh: ${f.estimatedTimeToFresh ?? '—'} day(s)`,
      ],
      confidence: f.confidence,
    });
  }

  // Adaptation: plateau risk
  if (a?.plateauRisk) {
    findings.push({
      id: 'FINDING_PLATEAU_RISK',
      category: 'ADAPTATION',
      severity: 'WARNING',
      title: 'Adaptation plateau risk — ≥ 14 days without improvement',
      evidence: [
        `Adaptation index: ${a.adaptationIndex ?? '—'}/100`,
        'Load progression is not generating new adaptive stimulus',
        'A change in training stimulus is recommended',
      ],
      confidence: a.confidence,
    });
  }

  // Cross-system: conflict detected
  if (conflicts.length > 0) {
    const [conflict] = conflicts;
    findings.push({
      id: 'FINDING_CROSS_SYSTEM_CONFLICT',
      category: 'CROSS_SYSTEM',
      severity: 'WARNING',
      title: `Cross-system conflict: ${conflict.type.replace('_', ' ').toLowerCase()}`,
      evidence: [
        conflict.description,
        `Affected models: ${conflict.models.join(', ')}`,
        conflict.resolution,
      ],
      confidence: 0.8,
    });
  }

  // Recovery: positive finding
  if (r?.readinessCategory === 'OPTIMAL' && f?.fatigueLevel === 'FRESH') {
    findings.push({
      id: 'FINDING_OPTIMAL_STATE',
      category: 'CROSS_SYSTEM',
      severity: 'INFO',
      title: 'Optimal readiness and minimal fatigue',
      evidence: [
        `Readiness: ${r.readinessScore ?? '—'}/100 (OPTIMAL)`,
        `Fatigue index: ${f.fatigueIndex ?? '—'}/100 (FRESH)`,
        'All physiological systems indicate high training capacity',
      ],
      confidence: Math.min(r.confidence, f.confidence),
    });
  }

  // Adaptation: positive finding
  if (a?.adaptationStatus === 'POSITIVELY_ADAPTING') {
    findings.push({
      id: 'FINDING_POSITIVE_ADAPTATION',
      category: 'ADAPTATION',
      severity: 'INFO',
      title: 'Supercompensation occurring',
      evidence: [
        `Adaptation index: ${a.adaptationIndex ?? '—'}/100`,
        `Trend: ${a.adaptationTrend}`,
        a.estimatedAdaptationPeak
          ? `Peak form estimated in ${a.estimatedAdaptationPeak} day(s)`
          : 'Adaptation trajectory positive',
      ],
      confidence: a.confidence,
    });
  }

  // Sort by severity then confidence
  const severityOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  findings.sort((a, b) => {
    const severityDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
    if (severityDiff !== 0) return severityDiff;
    return b.confidence - a.confidence;
  });

  return findings.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// Limiting factor selection
// ─────────────────────────────────────────────────────────────────────────────

export function selectLimitingFactor(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
  verdict: OverallVerdict,
): ReasoningState['limitingFactor'] {
  // No limiting factor when in optimal state
  if (verdict === 'TRAIN_HARD' || verdict === 'RACE_READY') {
    return { system: null, description: null, actionable: false };
  }

  // Fatigue limiting (highest safety priority)
  if (f && (f.fatigueLevel === 'OVERREACHING_RISK' || f.fatigueLevel === 'NON_FUNCTIONAL_RISK')) {
    return {
      system: 'FATIGUE',
      description: f.primaryLimitingFactor ?? `${f.dominantDimension.toLowerCase()} fatigue`,
      actionable: true,
    };
  }

  if (f && f.fatigueLevel === 'ACCUMULATED') {
    return {
      system: 'FATIGUE',
      description: `${f.dominantDimension.toLowerCase()} fatigue accumulation (${f.consecutiveAccumulationDays} days)`,
      actionable: true,
    };
  }

  // Recovery limiting
  if (r && (r.readinessCategory === 'VERY_LOW' || r.readinessCategory === 'LOW')) {
    return {
      system: 'RECOVERY',
      description: r.primaryLimitingFactor
        ? `${r.primaryLimitingFactor} recovery deficit`
        : 'readiness critically low',
      actionable: true,
    };
  }

  if (r && r.readinessCategory === 'REDUCED') {
    return {
      system: 'RECOVERY',
      description: r.primaryLimitingFactor ?? 'reduced readiness',
      actionable: true,
    };
  }

  // Adaptation limiting
  if (a && (a.adaptationStatus === 'MALADAPTING' || a.adaptationStatus === 'DETRAINING')) {
    return {
      system: 'ADAPTATION',
      description: a.limitingFactor ?? 'insufficient adaptive stimulus',
      actionable: true,
    };
  }

  if (a?.plateauRisk) {
    return {
      system: 'ADAPTATION',
      description: 'adaptation plateau — load increase needed',
      actionable: true,
    };
  }

  return { system: null, description: null, actionable: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// System attention priority
// ─────────────────────────────────────────────────────────────────────────────

export function selectAttentionPriority(
  limitingFactor: ReasoningState['limitingFactor'],
  verdict: OverallVerdict,
): SystemAttentionPriority {
  if (limitingFactor.system) return limitingFactor.system;
  if (verdict === 'TRAIN_HARD' || verdict === 'TRAIN_SMART') return 'BALANCED';
  return 'BALANCED';
}

// ─────────────────────────────────────────────────────────────────────────────
// Top action
// ─────────────────────────────────────────────────────────────────────────────

export function buildTopAction(
  verdict: OverallVerdict,
  limitingFactor: ReasoningState['limitingFactor'],
  a: AdaptationState | null,
): ReasoningState['topAction'] {
  switch (verdict) {
    case 'TRAIN_HARD':
      return {
        verb: 'Train',
        focus:
          a?.adaptationStatus === 'POSITIVELY_ADAPTING' ? 'progressive overload' : 'aerobic base',
        rationale: 'All physiological systems are green. Maximise the training stimulus today.',
        expectedBenefit: 90,
      };
    case 'TRAIN_SMART':
      return {
        verb: 'Train',
        focus: 'quality over volume',
        rationale:
          'Conditions are adequate but not optimal. Prioritise quality and technique over raw volume.',
        expectedBenefit: 72,
      };
    case 'TRAIN_EASY':
      return {
        verb: 'Train',
        focus: 'easy endurance',
        rationale:
          'Training capacity is reduced. A low-intensity aerobic session maintains fitness without deepening fatigue.',
        expectedBenefit: 55,
      };
    case 'RECOVER':
      return {
        verb: 'Rest',
        focus: limitingFactor.description ?? 'full recovery',
        rationale:
          'One or more physiological systems require rest. Training today will deepen the deficit and delay adaptation.',
        expectedBenefit: 80,
      };
    case 'RACE_READY':
      return {
        verb: 'Protect',
        focus: 'peak form',
        rationale:
          'You are approaching peak form. Avoid unnecessary training stress and prioritise sleep and nutrition.',
        expectedBenefit: 95,
      };
    case 'CAUTION':
      return {
        verb: 'Train',
        focus: 'controlled easy session',
        rationale:
          'Cross-system conflicts detected. A conservative easy session avoids worsening the conflicting signals.',
        expectedBenefit: 50,
      };
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidence graph
// ─────────────────────────────────────────────────────────────────────────────

export function buildEvidenceGraph(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
  verdict: OverallVerdict,
  limitingFactor: ReasoningState['limitingFactor'],
): ReasoningState['evidenceGraph'] {
  const base = { recovery: 1.0, fatigue: 1.0, adaptation: 1.0 };

  // Boost the model whose signal drove the verdict
  if (verdict === 'RECOVER') {
    if (f?.fatigueLevel === 'OVERREACHING_RISK' || f?.trainingCapacity === 'REST_ONLY') {
      base.fatigue = 2.5;
    } else if (r?.readinessCategory === 'LOW' || r?.readinessCategory === 'VERY_LOW') {
      base.recovery = 2.5;
    }
  } else if (verdict === 'TRAIN_HARD') {
    // All contributed equally
  } else if (verdict === 'RACE_READY') {
    base.adaptation = 1.8;
  } else if (limitingFactor.system === 'FATIGUE') {
    base.fatigue = 1.8;
  } else if (limitingFactor.system === 'RECOVERY') {
    base.recovery = 1.8;
  } else if (limitingFactor.system === 'ADAPTATION') {
    base.adaptation = 1.8;
  }

  // Zero out missing models
  if (!r) base.recovery = 0;
  if (!f) base.fatigue = 0;
  if (!a) base.adaptation = 0;

  const total = base.recovery + base.fatigue + base.adaptation;
  if (total === 0)
    return { recoveryContribution: 0, fatigueContribution: 0, adaptationContribution: 0 };

  return {
    recoveryContribution: Math.round((base.recovery / total) * 100) / 100,
    fatigueContribution: Math.round((base.fatigue / total) * 100) / 100,
    adaptationContribution: Math.round((base.adaptation / total) * 100) / 100,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence and data completeness
// ─────────────────────────────────────────────────────────────────────────────

export function computeReasoningConfidence(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
  consistency: PhysiologicalConsistency,
): { confidence: number; dataCompleteness: DataCompleteness } {
  const available = [r, f, a].filter(Boolean);
  const count = available.length;

  if (count < 2) {
    return { confidence: 0.15, dataCompleteness: 'INSUFFICIENT' };
  }

  const avgConfidence = available.reduce((sum, m) => sum + m!.confidence, 0) / count;

  let base = avgConfidence;
  if (count === 3) base = Math.min(base + 0.05, 0.95);

  // Consistency modifier
  if (consistency === 'ALIGNED') base = Math.min(base + 0.1, 0.95);
  if (consistency === 'CONFLICTING') base = Math.max(base - 0.15, 0.2);

  const dataCounts = available.map((m) => m!.dataCompleteness);
  const hasInsufficient = dataCounts.some((d) => d === 'INSUFFICIENT');
  const hasSparse = dataCounts.some((d) => d === 'SPARSE');
  const hasPartial = dataCounts.some((d) => d === 'PARTIAL');

  let dataCompleteness: DataCompleteness;
  if (hasInsufficient) {
    dataCompleteness = 'INSUFFICIENT';
    base = Math.min(base, 0.4);
  } else if (hasSparse) {
    dataCompleteness = 'SPARSE';
    base = Math.min(base, 0.55);
  } else if (hasPartial || count < 3) {
    dataCompleteness = 'PARTIAL';
  } else {
    dataCompleteness = 'FULL';
  }

  return { confidence: Math.round(base * 100) / 100, dataCompleteness };
}

// Re-export for use in model.ts
import type { ReasoningState } from '@/core/digital-twin/types';
