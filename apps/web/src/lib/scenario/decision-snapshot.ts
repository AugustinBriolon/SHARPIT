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

function findWorstVerdict(verdicts: OverallVerdict[]): OverallVerdict {
  let worstVerdict: OverallVerdict = 'RACE_READY';
  for (const verdict of verdicts) {
    if (verdictRiskRank(verdict) > verdictRiskRank(worstVerdict)) {
      worstVerdict = verdict;
    }
  }
  return worstVerdict;
}

function resolveLimitingDomain(
  end: ProjectedAthleteState['days'][number] | undefined,
): DecisionDomain | null {
  if (!end) {
    return null;
  }
  if (end.decision.limitingFactor.domain) {
    return end.decision.limitingFactor.domain as DecisionDomain;
  }
  if (end.decision.limitingFactor.system === 'PHYSICAL_HEALTH') {
    return 'PHYSICAL_HEALTH';
  }
  return end.decision.limitingFactor.system as DecisionDomain | null;
}

function endVerdictFromDay(end: ProjectedAthleteState['days'][number] | undefined) {
  return end?.decision.overallVerdict ?? 'INSUFFICIENT_DATA';
}

function endConfidenceFromDay(end: ProjectedAthleteState['days'][number] | undefined) {
  return end?.decision.confidence ?? 0;
}

function endConfidenceTierFromDay(end: ProjectedAthleteState['days'][number] | undefined) {
  return end?.decision.confidenceTier ?? 'INSUFFICIENT';
}

function endExpectedBenefitFromDay(end: ProjectedAthleteState['days'][number] | undefined) {
  return end?.decision.primaryDecision.expectedBenefit ?? 0;
}

function endVerdictFields(end: ProjectedAthleteState['days'][number] | undefined) {
  return {
    endVerdict: endVerdictFromDay(end),
    endConfidence: endConfidenceFromDay(end),
    endConfidenceTier: endConfidenceTierFromDay(end),
    endExpectedBenefit: endExpectedBenefitFromDay(end),
  };
}

function endDecisionFields(
  end: ProjectedAthleteState['days'][number] | undefined,
  worstVerdict: OverallVerdict,
  riskDayCount: number,
  horizonMeanConfidence: number,
): ScenarioDecisionSnapshot {
  return {
    ...endVerdictFields(end),
    endLimitingFactorDomain: resolveLimitingDomain(end),
    endLimitingFactorPriority: end?.decision.limitingFactor.priority ?? 99,
    worstVerdict,
    riskDayCount,
    horizonMeanConfidence,
  };
}

export function extractScenarioDecisionSnapshot(
  projection: ProjectedAthleteState,
): ScenarioDecisionSnapshot {
  const { days } = projection;
  const end = days.at(-1);
  const verdicts = days.map((d) => d.decision.overallVerdict);
  const worstVerdict = findWorstVerdict(verdicts);
  const riskDayCount = days.filter((d) => RISK_VERDICTS.has(d.decision.overallVerdict)).length;
  const horizonMeanConfidence =
    days.length > 0
      ? Math.round((days.reduce((sum, d) => sum + d.decision.confidence, 0) / days.length) * 100) /
        100
      : 0;

  return endDecisionFields(end, worstVerdict, riskDayCount, horizonMeanConfidence);
}

export { VERDICT_RISK_ORDER };
