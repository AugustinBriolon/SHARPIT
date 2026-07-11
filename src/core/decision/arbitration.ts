/**
 * Decision Engine — verdict synthesis and limiting-factor arbitration.
 *
 * Composes existing inference outputs only — no physiological calculation.
 */

import type {
  AdaptationState,
  FatigueState,
  OverallVerdict,
  RecoveryState,
  ReasoningState,
} from '@/core/digital-twin/types';
import type { PhysicalHealthState } from '@/core/inference/physical-health/types';
import type { EnvironmentalDecisionSnapshot } from '@/core/inference/environment/types';
import {
  buildTopAction,
  selectLimitingFactor,
  synthesizeVerdict,
} from '@/core/inference/reasoning/scoring';
import type { DecisionDomain, DecisionLimitingFactor, PrimaryDecision } from './decision-state';
import { domainPriorityIndex } from './priority';

export function applyPhysicalHealthSafetyOverride(
  verdict: OverallVerdict,
  physicalHealth: PhysicalHealthState | null,
): { verdict: OverallVerdict; safetyOverrideApplied: boolean } {
  if (!physicalHealth) return { verdict, safetyOverrideApplied: false };

  if (physicalHealth.trainingBlockedByCondition) {
    return { verdict: 'RECOVER', safetyOverrideApplied: true };
  }

  if (physicalHealth.aggregateTrainingCapacity === 'UNABLE') {
    return { verdict: 'RECOVER', safetyOverrideApplied: true };
  }

  if (
    physicalHealth.aggregateTrainingCapacity === 'REDUCED' &&
    (verdict === 'TRAIN_HARD' || verdict === 'RACE_READY')
  ) {
    return { verdict: 'TRAIN_EASY', safetyOverrideApplied: true };
  }

  return { verdict, safetyOverrideApplied: false };
}

export function applyEnvironmentalModeration(
  verdict: OverallVerdict,
  environment: EnvironmentalDecisionSnapshot | null,
): OverallVerdict {
  if (!environment || environment.trainingImpact === 'NONE') return verdict;

  if (environment.trainingImpact === 'SIGNIFICANT') {
    if (verdict === 'TRAIN_HARD') return 'TRAIN_EASY';
    if (verdict === 'RACE_READY') return 'TRAIN_SMART';
  }

  if (environment.trainingImpact === 'MODERATE' && verdict === 'TRAIN_HARD') {
    return 'TRAIN_SMART';
  }

  return verdict;
}

export function arbitrateLimitingFactor(input: {
  recovery: RecoveryState | null;
  fatigue: FatigueState | null;
  adaptation: AdaptationState | null;
  physicalHealth: PhysicalHealthState | null;
  environment: EnvironmentalDecisionSnapshot | null;
  verdict: OverallVerdict;
}): DecisionLimitingFactor {
  const { recovery, fatigue, adaptation, physicalHealth, environment, verdict } = input;

  if (physicalHealth?.trainingBlockedByCondition) {
    const primary = physicalHealth.conditions.find(
      (c) => c.conditionId === physicalHealth.primaryLimitingConditionId,
    );
    return {
      domain: 'PHYSICAL_HEALTH',
      system: 'PHYSICAL_HEALTH',
      description: primary
        ? {
            code: 'decision.limitingFactor.physicalHealth.blocked',
            params: { condition: primary.label },
          }
        : { code: 'decision.limitingFactor.physicalHealth.blockedGeneric' },
      actionable: true,
      priority: domainPriorityIndex('PHYSICAL_HEALTH'),
    };
  }

  if (
    physicalHealth &&
    physicalHealth.activeConditionCount > 0 &&
    physicalHealth.aggregateTrainingCapacity === 'REDUCED' &&
    verdict !== 'TRAIN_HARD' &&
    verdict !== 'RACE_READY'
  ) {
    const primary = physicalHealth.conditions.find(
      (c) => c.conditionId === physicalHealth.primaryLimitingConditionId,
    );
    return {
      domain: 'PHYSICAL_HEALTH',
      system: 'PHYSICAL_HEALTH',
      description: primary
        ? {
            code: 'decision.limitingFactor.physicalHealth.reduced',
            params: { condition: primary.label },
          }
        : { code: 'decision.limitingFactor.physicalHealth.reducedGeneric' },
      actionable: true,
      priority: domainPriorityIndex('PHYSICAL_HEALTH'),
    };
  }

  const base = selectLimitingFactor(recovery, fatigue, adaptation, verdict);

  if (
    environment?.trainingImpact === 'SIGNIFICANT' &&
    base.system == null &&
    verdict !== 'TRAIN_HARD' &&
    verdict !== 'RACE_READY'
  ) {
    return {
      domain: 'ENVIRONMENT',
      system: null,
      description: { code: 'decision.limitingFactor.environment.significant' },
      actionable: true,
      priority: domainPriorityIndex('ENVIRONMENT'),
    };
  }

  const domain: DecisionDomain | null = base.system ?? null;

  return {
    domain,
    system: base.system,
    description: base.description,
    actionable: base.actionable,
    priority: domain != null ? domainPriorityIndex(domain) : 99,
  };
}

function resolveHeadlineCode(
  verdict: OverallVerdict,
  limitingFactor: DecisionLimitingFactor,
): string {
  if (limitingFactor.domain === 'PHYSICAL_HEALTH') {
    return 'decision.primary.headline.physicalHealth';
  }
  if (limitingFactor.domain === 'ENVIRONMENT') {
    return 'decision.primary.headline.environment';
  }

  switch (verdict) {
    case 'RECOVER':
      if (limitingFactor.system === 'FATIGUE') return 'decision.primary.headline.recover.fatigue';
      if (limitingFactor.system === 'RECOVERY') return 'decision.primary.headline.recover.recovery';
      return 'decision.primary.headline.recover';
    case 'TRAIN_HARD':
      return 'decision.primary.headline.trainHard';
    case 'RACE_READY':
      return 'decision.primary.headline.raceReady';
    case 'CAUTION':
      return 'decision.primary.headline.caution';
    case 'TRAIN_EASY':
      return 'decision.primary.headline.trainEasy';
    case 'TRAIN_SMART':
      return 'decision.primary.headline.trainSmart';
    default:
      return 'decision.primary.headline.insufficient';
  }
}

export function synthesizeCanonicalVerdict(input: {
  recovery: RecoveryState | null;
  fatigue: FatigueState | null;
  adaptation: AdaptationState | null;
  physicalHealth: PhysicalHealthState | null;
  environment: EnvironmentalDecisionSnapshot | null;
}): {
  verdict: OverallVerdict;
  safetyOverrideApplied: boolean;
} {
  const availableCount = [input.recovery, input.fatigue, input.adaptation].filter(Boolean).length;
  let verdict = synthesizeVerdict(input.recovery, input.fatigue, input.adaptation, availableCount);

  const phOverride = applyPhysicalHealthSafetyOverride(verdict, input.physicalHealth);
  const { verdict: phVerdict, safetyOverrideApplied } = phOverride;
  verdict = phVerdict;
  verdict = applyEnvironmentalModeration(verdict, input.environment);

  return {
    verdict,
    safetyOverrideApplied,
  };
}

export function buildPrimaryDecision(input: {
  verdict: OverallVerdict;
  limitingFactor: DecisionLimitingFactor;
  adaptation: AdaptationState | null;
}): PrimaryDecision {
  const legacyLimiting: ReasoningState['limitingFactor'] = {
    system: input.limitingFactor.system === 'PHYSICAL_HEALTH' ? null : input.limitingFactor.system,
    description: input.limitingFactor.description,
    actionable: input.limitingFactor.actionable,
  };

  const topAction = buildTopAction(input.verdict, legacyLimiting, input.adaptation);

  return {
    verdict: input.verdict,
    headlineCode: resolveHeadlineCode(input.verdict, input.limitingFactor),
    verbCode: topAction?.verbCode ?? 'decision.primary.insufficient.verb',
    focusCode: topAction?.focusCode ?? 'decision.primary.insufficient.focus',
    rationaleCode: topAction?.rationaleCode ?? 'decision.primary.insufficient.rationale',
    expectedBenefit: topAction?.expectedBenefit ?? 0,
  };
}
