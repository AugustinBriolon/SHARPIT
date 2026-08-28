import type {
  AdaptationState,
  FatigueState,
  OverallVerdict,
  PhysiologicalConsistency,
  ReasoningConflict,
  ReasoningFinding,
  ReasoningState,
  RecoveryState,
} from '@/core/digital-twin/types';
import type { I18nItem } from '@/core/inference/shared/types';
import type { ModelDirections } from './types';

export type BuildKeyFindingsInput = {
  recovery: RecoveryState | null;
  fatigue: FatigueState | null;
  adaptation: AdaptationState | null;
  conflicts: ReasoningConflict[];
  modelDirections?: ModelDirections;
  physiologicalConsistency?: PhysiologicalConsistency;
  overallVerdict?: OverallVerdict;
  limitingFactor?: ReasoningState['limitingFactor'];
  arbitrationFinding?: ReasoningFinding | null;
};

function findingOverreachingNoAdapt(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
): ReasoningFinding | null {
  if (!a?.overreachingWithoutAdaptationDetected || !f) {
    return null;
  }

  return {
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
  };
}

function findingOverreachingRisk(f: FatigueState | null): ReasoningFinding | null {
  if (f?.fatigueLevel !== 'OVERREACHING_RISK') {
    return null;
  }

  return {
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
  };
}

function lowReadinessEvidence(r: RecoveryState): I18nItem[] {
  return [
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
}

function findingLowReadiness(r: RecoveryState | null): ReasoningFinding | null {
  if (!r || (r.readinessCategory !== 'VERY_LOW' && r.readinessCategory !== 'LOW')) {
    return null;
  }

  return {
    id: 'FINDING_LOW_READINESS',
    category: 'RECOVERY',
    severity: r.readinessCategory === 'VERY_LOW' ? 'CRITICAL' : 'WARNING',
    title: {
      code:
        r.readinessCategory === 'VERY_LOW'
          ? 'reasoning.finding.lowReadiness.titleCritical'
          : 'reasoning.finding.lowReadiness.title',
    },
    evidenceItems: lowReadinessEvidence(r),
    confidence: r.confidence,
  };
}

function findingDissonance(r: RecoveryState | null): ReasoningFinding | null {
  if (!r?.dissonanceDetected) {
    return null;
  }

  return {
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
  };
}

function findingFatigueAccumulating(f: FatigueState | null): ReasoningFinding | null {
  if (!f || f.fatigueLevel !== 'ACCUMULATED' || f.consecutiveAccumulationDays < 3) {
    return null;
  }

  return {
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
  };
}

function findingPlateauRisk(a: AdaptationState | null): ReasoningFinding | null {
  if (!a?.plateauRisk) {
    return null;
  }

  return {
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
  };
}

function findingCrossSystemConflict(conflicts: ReasoningConflict[]): ReasoningFinding | null {
  const [conflict] = conflicts;
  if (!conflict) {
    return null;
  }

  return {
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
  };
}

function findingOptimalState(
  r: RecoveryState | null,
  f: FatigueState | null,
): ReasoningFinding | null {
  if (r?.readinessCategory !== 'OPTIMAL' || f?.fatigueLevel !== 'FRESH') {
    return null;
  }

  return {
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
  };
}

function findingPositiveAdaptation(a: AdaptationState | null): ReasoningFinding | null {
  if (a?.adaptationStatus !== 'POSITIVELY_ADAPTING') {
    return null;
  }

  return {
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
  };
}

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

export function collectKeyFindings(input: BuildKeyFindingsInput): ReasoningFinding[] {
  const { recovery, fatigue, adaptation, conflicts, arbitrationFinding } = input;

  const findings = [
    findingOverreachingNoAdapt(recovery, fatigue, adaptation),
    findingOverreachingRisk(fatigue),
    findingLowReadiness(recovery),
    findingDissonance(recovery),
    findingFatigueAccumulating(fatigue),
    findingPlateauRisk(adaptation),
    arbitrationFinding ?? null,
    findingCrossSystemConflict(conflicts),
    findingOptimalState(recovery, fatigue),
    findingPositiveAdaptation(adaptation),
  ].filter((finding): finding is ReasoningFinding => (finding !== undefined && finding !== null));

  findings.sort((a, b) => {
    const severityDiff = (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return b.confidence - a.confidence;
  });

  return findings.slice(0, 5);
}
