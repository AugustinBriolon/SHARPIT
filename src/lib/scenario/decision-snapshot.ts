/**
 * Extract Decision Engine snapshots from projected athlete state.
 */

import type { OverallVerdict } from '@/core/digital-twin/types';
import type { DecisionDomain } from '@/core/decision/decision-state';
import type { ScenarioDecisionSnapshot } from '@/core/scenario/types';
import type { ProjectedAthleteState } from '@/core/projection/types';

const RISK_VERDICTS = new Set<OverallVerdict>(['RECOVER', 'CAUTION', 'INSUFFICIENT_DATA']);

const VERDICT_RISK_ORDER: Record<OverallVerdict, number> = {
  RACE_READY: 0,
  TRAIN_HARD: 1,
  TRAIN_SMART: 2,
  TRAIN_EASY: 3,
  RECOVER: 4,
  CAUTION: 5,
  INSUFFICIENT_DATA: 6,
};

export function verdictRiskRank(verdict: OverallVerdict): number {
  return VERDICT_RISK_ORDER[verdict];
}

export function extractScenarioDecisionSnapshot(
  projection: ProjectedAthleteState,
): ScenarioDecisionSnapshot {
  const { days } = projection;
  const end = days.at(-1);
  const verdicts = days.map((d) => d.decision.overallVerdict);

  let worstVerdict: OverallVerdict = 'RACE_READY';
  for (const verdict of verdicts) {
    if (verdictRiskRank(verdict) > verdictRiskRank(worstVerdict)) {
      worstVerdict = verdict;
    }
  }

  const riskDayCount = days.filter((d) => RISK_VERDICTS.has(d.decision.overallVerdict)).length;
  const horizonMeanConfidence =
    days.length > 0
      ? Math.round((days.reduce((sum, d) => sum + d.decision.confidence, 0) / days.length) * 100) /
        100
      : 0;

  const limitingDomain =
    (end?.decision.limitingFactor.domain as DecisionDomain | null) ??
    (end?.decision.limitingFactor.system === 'PHYSICAL_HEALTH'
      ? 'PHYSICAL_HEALTH'
      : end?.decision.limitingFactor.system) ??
    null;

  return {
    endVerdict: end?.decision.overallVerdict ?? 'INSUFFICIENT_DATA',
    endConfidence: end?.decision.confidence ?? 0,
    endConfidenceTier: end?.decision.confidenceTier ?? 'INSUFFICIENT',
    endExpectedBenefit: end?.decision.primaryDecision.expectedBenefit ?? 0,
    endLimitingFactorDomain: limitingDomain,
    endLimitingFactorPriority: end?.decision.limitingFactor.priority ?? 99,
    worstVerdict,
    riskDayCount,
    horizonMeanConfidence,
  };
}

export { VERDICT_RISK_ORDER };
