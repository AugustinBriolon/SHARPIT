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
import type { I18nItem } from '@/core/inference/shared/types';
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
      descriptionCode: 'reasoning.conflict.capacityConflict01.description',
      models: ['Recovery', 'Fatigue'],
      resolutionCode: 'reasoning.conflict.capacityConflict01.resolution',
    });
  }

  // TIMING_CONFLICT: plateau risk but cannot increase load
  if (a?.plateauRisk && f && f.trainingCapacity === 'REST_ONLY') {
    conflicts.push({
      id: 'TIMING_CONFLICT_01',
      type: 'TIMING_CONFLICT',
      descriptionCode: 'reasoning.conflict.timingConflict01.description',
      models: ['Adaptation', 'Fatigue'],
      resolutionCode: 'reasoning.conflict.timingConflict01.resolution',
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
      descriptionCode: 'reasoning.conflict.signalConflict01.description',
      models: ['Fatigue', 'Adaptation'],
      resolutionCode: 'reasoning.conflict.signalConflict01.resolution',
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
      title: { code: 'reasoning.opportunity.loadIncrease.title' },
      rationale: { code: 'reasoning.opportunity.loadIncrease.rationale' },
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
      title: { code: 'reasoning.opportunity.qualitySession.title' },
      rationale: { code: 'reasoning.opportunity.qualitySession.rationale' },
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
      title: { code: 'reasoning.opportunity.deload.title' },
      rationale: {
        code: 'reasoning.opportunity.deload.rationale',
        params: { days: f.consecutiveAccumulationDays },
      },
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
      title: {
        code: 'reasoning.opportunity.raceReadiness.title',
        params: { days: a.estimatedAdaptationPeak },
      },
      rationale: { code: 'reasoning.opportunity.raceReadiness.rationale' },
      expectedBenefit: 95,
      timeWindow: a.estimatedAdaptationPeak <= 2 ? 'TODAY' : 'THIS_WEEK',
    });
  }

  // RECOVERY_WINDOW: recovery is low — protect it
  if (r && (r.readinessCategory === 'LOW' || r.readinessCategory === 'VERY_LOW')) {
    opportunities.push({
      id: 'OPP_RECOVERY_WINDOW',
      type: 'RECOVERY_WINDOW',
      title: { code: 'reasoning.opportunity.recoveryWindow.title' },
      rationale: { code: 'reasoning.opportunity.recoveryWindow.rationale' },
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
      title: { code: 'reasoning.finding.overreachingNoAdapt.title' },
      evidenceItems: [
        {
          code: 'reasoning.finding.overreachingNoAdapt.evidence.fatigueIndex',
          params: { index: f.fatigueIndex ?? 0 },
        },
        { code: 'reasoning.finding.overreachingNoAdapt.evidence.autonomicSuppressed' },
        { code: 'reasoning.finding.overreachingNoAdapt.evidence.noAdaptation' },
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
      title: { code: 'reasoning.finding.overreachingRisk.title' },
      evidenceItems: [
        {
          code: 'reasoning.finding.overreachingRisk.evidence.fatigueIndex',
          params: { index: f.fatigueIndex ?? 0 },
        },
        {
          code: 'reasoning.finding.overreachingRisk.evidence.accumulationDays',
          params: { days: f.consecutiveAccumulationDays },
        },
        {
          code: 'reasoning.finding.overreachingRisk.evidence.performanceImpairment',
          params: { percent: Math.round(f.performanceImpairmentEstimate * 100) },
        },
      ],
      confidence: f.confidence,
    });
  }

  // Recovery: very low readiness
  if (r?.readinessCategory === 'VERY_LOW' || r?.readinessCategory === 'LOW') {
    const evidenceItems: I18nItem[] = [
      {
        code: 'reasoning.finding.lowReadiness.evidence.score',
        params: { score: r.readinessScore ?? 0 },
      },
      r.primaryLimitingFactor
        ? {
            code: 'reasoning.finding.lowReadiness.evidence.limiter',
            params: { limiter: r.primaryLimitingFactor },
          }
        : { code: 'reasoning.finding.lowReadiness.evidence.multipleAffected' },
      r.estimatedTimeToFullRecovery
        ? {
            code: 'reasoning.finding.lowReadiness.evidence.estimatedRecovery',
            params: { days: r.estimatedTimeToFullRecovery },
          }
        : { code: 'reasoning.finding.lowReadiness.evidence.recoveryUnclear' },
    ];
    findings.push({
      id: 'FINDING_LOW_READINESS',
      category: 'RECOVERY',
      severity: r.readinessCategory === 'VERY_LOW' ? 'CRITICAL' : 'WARNING',
      title: {
        code:
          r.readinessCategory === 'VERY_LOW'
            ? 'reasoning.finding.lowReadiness.titleCritical'
            : 'reasoning.finding.lowReadiness.title',
      },
      evidenceItems,
      confidence: r.confidence,
    });
  }

  // Cross-system: dissonance detected
  if (r?.dissonanceDetected) {
    findings.push({
      id: 'FINDING_DISSONANCE',
      category: 'CROSS_SYSTEM',
      severity: 'WARNING',
      title: { code: 'reasoning.finding.dissonance.title' },
      evidenceItems: [
        { code: 'reasoning.finding.dissonance.evidence.disagreement' },
        { code: 'reasoning.finding.dissonance.evidence.causes' },
        { code: 'reasoning.finding.dissonance.evidence.prioritiseObjective' },
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
      title: {
        code: 'reasoning.finding.fatigueAccumulating.title',
        params: { days: f.consecutiveAccumulationDays },
      },
      evidenceItems: [
        {
          code: 'reasoning.finding.fatigueAccumulating.evidence.fatigueIndex',
          params: { index: f.fatigueIndex ?? 0 },
        },
        {
          code: 'reasoning.finding.fatigueAccumulating.evidence.dominantSystem',
          params: { system: f.dominantDimension },
        },
        f.estimatedTimeToFresh
          ? {
              code: 'reasoning.finding.fatigueAccumulating.evidence.timeToFresh',
              params: { days: f.estimatedTimeToFresh },
            }
          : { code: 'reasoning.finding.fatigueAccumulating.evidence.timeToFreshUnknown' },
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
      title: { code: 'reasoning.finding.plateauRisk.title' },
      evidenceItems: [
        {
          code: 'reasoning.finding.plateauRisk.evidence.adaptationIndex',
          params: { index: a.adaptationIndex ?? 0 },
        },
        { code: 'reasoning.finding.plateauRisk.evidence.noStimulus' },
        { code: 'reasoning.finding.plateauRisk.evidence.changeRecommended' },
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
      title: {
        code: 'reasoning.finding.crossSystemConflict.title',
        params: { conflictType: conflict.type.replace('_', ' ').toLowerCase() },
      },
      evidenceItems: [
        { code: conflict.descriptionCode },
        {
          code: 'reasoning.finding.crossSystemConflict.evidence.affectedModels',
          params: { models: conflict.models.join(', ') },
        },
        { code: conflict.resolutionCode },
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
      title: { code: 'reasoning.finding.optimalState.title' },
      evidenceItems: [
        {
          code: 'reasoning.finding.optimalState.evidence.readiness',
          params: { score: r.readinessScore ?? 0 },
        },
        {
          code: 'reasoning.finding.optimalState.evidence.fatigueIndex',
          params: { index: f.fatigueIndex ?? 0 },
        },
        { code: 'reasoning.finding.optimalState.evidence.highCapacity' },
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
      title: { code: 'reasoning.finding.positiveAdaptation.title' },
      evidenceItems: [
        {
          code: 'reasoning.finding.positiveAdaptation.evidence.adaptationIndex',
          params: { index: a.adaptationIndex ?? 0 },
        },
        {
          code: 'reasoning.finding.positiveAdaptation.evidence.trend',
          params: { trend: a.adaptationTrend },
        },
        a.estimatedAdaptationPeak
          ? {
              code: 'reasoning.finding.positiveAdaptation.evidence.peakEstimate',
              params: { days: a.estimatedAdaptationPeak },
            }
          : { code: 'reasoning.finding.positiveAdaptation.evidence.trajectoryPositive' },
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
      description: {
        code: 'reasoning.limitingFactor.fatigue.overreaching',
        params: { dimension: f.dominantDimension },
      },
      actionable: true,
    };
  }

  if (f && f.fatigueLevel === 'ACCUMULATED') {
    return {
      system: 'FATIGUE',
      description: {
        code: 'reasoning.limitingFactor.fatigue.accumulated',
        params: { dimension: f.dominantDimension, days: f.consecutiveAccumulationDays },
      },
      actionable: true,
    };
  }

  // Recovery limiting
  if (r && (r.readinessCategory === 'VERY_LOW' || r.readinessCategory === 'LOW')) {
    return {
      system: 'RECOVERY',
      description: r.primaryLimitingFactor
        ? {
            code: 'reasoning.limitingFactor.recovery.deficit',
            params: { limiter: r.primaryLimitingFactor },
          }
        : { code: 'reasoning.limitingFactor.recovery.criticallyLow' },
      actionable: true,
    };
  }

  if (r && r.readinessCategory === 'REDUCED') {
    return {
      system: 'RECOVERY',
      description: r.primaryLimitingFactor
        ? {
            code: 'reasoning.limitingFactor.recovery.deficit',
            params: { limiter: r.primaryLimitingFactor },
          }
        : { code: 'reasoning.limitingFactor.recovery.reduced' },
      actionable: true,
    };
  }

  // Adaptation limiting
  if (a && (a.adaptationStatus === 'MALADAPTING' || a.adaptationStatus === 'DETRAINING')) {
    return {
      system: 'ADAPTATION',
      description: a.limitingFactor
        ? {
            code: 'reasoning.limitingFactor.adaptation.factor',
            params: { factor: a.limitingFactor },
          }
        : { code: 'reasoning.limitingFactor.adaptation.insufficientStimulus' },
      actionable: true,
    };
  }

  if (a?.plateauRisk) {
    return {
      system: 'ADAPTATION',
      description: { code: 'reasoning.limitingFactor.adaptation.plateau' },
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
        verbCode: 'reasoning.topAction.trainHard.verb',
        focusCode:
          a?.adaptationStatus === 'POSITIVELY_ADAPTING'
            ? 'reasoning.topAction.trainHard.focus.progressiveOverload'
            : 'reasoning.topAction.trainHard.focus.aerobicBase',
        rationaleCode: 'reasoning.topAction.trainHard.rationale',
        expectedBenefit: 90,
      };
    case 'TRAIN_SMART':
      return {
        verbCode: 'reasoning.topAction.trainSmart.verb',
        focusCode: 'reasoning.topAction.trainSmart.focus',
        rationaleCode: 'reasoning.topAction.trainSmart.rationale',
        expectedBenefit: 72,
      };
    case 'TRAIN_EASY':
      return {
        verbCode: 'reasoning.topAction.trainEasy.verb',
        focusCode: 'reasoning.topAction.trainEasy.focus',
        rationaleCode: 'reasoning.topAction.trainEasy.rationale',
        expectedBenefit: 55,
      };
    case 'RECOVER':
      return {
        verbCode: 'reasoning.topAction.recover.verb',
        focusCode: limitingFactor.description?.code ?? 'reasoning.topAction.recover.focusDefault',
        rationaleCode: 'reasoning.topAction.recover.rationale',
        expectedBenefit: 80,
      };
    case 'RACE_READY':
      return {
        verbCode: 'reasoning.topAction.raceReady.verb',
        focusCode: 'reasoning.topAction.raceReady.focus',
        rationaleCode: 'reasoning.topAction.raceReady.rationale',
        expectedBenefit: 95,
      };
    case 'CAUTION':
      return {
        verbCode: 'reasoning.topAction.caution.verb',
        focusCode: 'reasoning.topAction.caution.focus',
        rationaleCode: 'reasoning.topAction.caution.rationale',
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
