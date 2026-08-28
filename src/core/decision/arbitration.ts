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

function primaryPhysicalHealthCondition(
  physicalHealth: PhysicalHealthState,
): PhysicalHealthState['conditions'][number] | undefined {
  return physicalHealth.conditions.find(
    (c) => c.conditionId === physicalHealth.primaryLimitingConditionId,
  );
}

function physicalHealthLimitCode(mode: 'blocked' | 'reduced', hasPrimary: boolean): string {
  if (mode === 'blocked') {
    return hasPrimary
      ? 'decision.limitingFactor.physicalHealth.blocked'
      : 'decision.limitingFactor.physicalHealth.blockedGeneric';
  }
  return hasPrimary
    ? 'decision.limitingFactor.physicalHealth.reduced'
    : 'decision.limitingFactor.physicalHealth.reducedGeneric';
}

function physicalHealthLimitingFactor(
  physicalHealth: PhysicalHealthState,
  mode: 'blocked' | 'reduced',
): DecisionLimitingFactor {
  const primary = primaryPhysicalHealthCondition(physicalHealth);
  const code = physicalHealthLimitCode(mode, Boolean(primary));

  return {
    domain: 'PHYSICAL_HEALTH',
    system: 'PHYSICAL_HEALTH',
    description: primary ? { code, params: { condition: primary.label } } : { code },
    actionable: true,
    priority: domainPriorityIndex('PHYSICAL_HEALTH'),
  };
}

function hasReducedPhysicalHealthLimit(
  physicalHealth: PhysicalHealthState,
  verdict: OverallVerdict,
): boolean {
  return (
    physicalHealth.activeConditionCount > 0 &&
    physicalHealth.aggregateTrainingCapacity === 'REDUCED' &&
    isReducedCapacityVerdict(verdict)
  );
}

function isReducedCapacityVerdict(verdict: OverallVerdict): boolean {
  return verdict !== 'TRAIN_HARD' && verdict !== 'RACE_READY';
}

export function applyPhysicalHealthSafetyOverride(
  verdict: OverallVerdict,
  physicalHealth: PhysicalHealthState | null,
): { verdict: OverallVerdict; safetyOverrideApplied: boolean } {
  if (!physicalHealth) {
    return { verdict, safetyOverrideApplied: false };
  }

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
  if (!environment || environment.trainingImpact === 'NONE') {
    return verdict;
  }

  if (environment.trainingImpact === 'SIGNIFICANT') {
    if (verdict === 'TRAIN_HARD') {
      return 'TRAIN_EASY';
    }
    if (verdict === 'RACE_READY') {
      return 'TRAIN_SMART';
    }
  }

  if (environment.trainingImpact === 'MODERATE' && verdict === 'TRAIN_HARD') {
    return 'TRAIN_SMART';
  }

  return verdict;
}

function environmentLimitingFactor(): DecisionLimitingFactor {
  return {
    domain: 'ENVIRONMENT',
    system: null,
    description: { code: 'decision.limitingFactor.environment.significant' },
    actionable: true,
    priority: domainPriorityIndex('ENVIRONMENT'),
  };
}

function fromBaseLimitingFactor(
  base: ReturnType<typeof selectLimitingFactor>,
): DecisionLimitingFactor {
  const domain: DecisionDomain | null = base.system ?? null;
  return {
    domain,
    system: base.system,
    description: base.description,
    actionable: base.actionable,
    priority: (domain !== undefined && domain !== null) ? domainPriorityIndex(domain) : 99,
  };
}

function tryPhysicalHealthLimiting(
  physicalHealth: PhysicalHealthState | null,
  verdict: OverallVerdict,
): DecisionLimitingFactor | null {
  if (physicalHealth?.trainingBlockedByCondition) {
    return physicalHealthLimitingFactor(physicalHealth, 'blocked');
  }
  if (physicalHealth && hasReducedPhysicalHealthLimit(physicalHealth, verdict)) {
    return physicalHealthLimitingFactor(physicalHealth, 'reduced');
  }
  return null;
}

export function arbitrateLimitingFactor(input: {
  recovery: RecoveryState | null;
  fatigue: FatigueState | null;
  adaptation: AdaptationState | null;
  physicalHealth: PhysicalHealthState | null;
  environment: EnvironmentalDecisionSnapshot | null;
  verdict: OverallVerdict;
}): DecisionLimitingFactor {
  const physicalHealthLimit = tryPhysicalHealthLimiting(input.physicalHealth, input.verdict);
  if (physicalHealthLimit) {
    return physicalHealthLimit;
  }

  const base = selectLimitingFactor(input.recovery, input.fatigue, input.adaptation, input.verdict);
  if (
    input.environment?.trainingImpact === 'SIGNIFICANT' &&
    (base.system === undefined || base.system === null) &&
    isReducedCapacityVerdict(input.verdict)
  ) {
    return environmentLimitingFactor();
  }

  return fromBaseLimitingFactor(base);
}

const RECOVER_HEADLINE_BY_SYSTEM: Partial<
  Record<NonNullable<DecisionLimitingFactor['system']>, string>
> = {
  FATIGUE: 'decision.primary.headline.recover.fatigue',
  RECOVERY: 'decision.primary.headline.recover.recovery',
};

const HEADLINE_BY_VERDICT: Partial<Record<OverallVerdict, string>> = {
  TRAIN_HARD: 'decision.primary.headline.trainHard',
  RACE_READY: 'decision.primary.headline.raceReady',
  CAUTION: 'decision.primary.headline.caution',
  TRAIN_EASY: 'decision.primary.headline.trainEasy',
  TRAIN_SMART: 'decision.primary.headline.trainSmart',
};

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
  if (verdict === 'RECOVER') {
    return (
      (limitingFactor.system && RECOVER_HEADLINE_BY_SYSTEM[limitingFactor.system]) ??
      'decision.primary.headline.recover'
    );
  }

  return HEADLINE_BY_VERDICT[verdict] ?? 'decision.primary.headline.insufficient';
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

function toLegacyLimitingFactor(
  limitingFactor: DecisionLimitingFactor,
): ReasoningState['limitingFactor'] {
  return {
    system: limitingFactor.system === 'PHYSICAL_HEALTH' ? null : limitingFactor.system,
    description: limitingFactor.description,
    actionable: limitingFactor.actionable,
  };
}

function defaultPrimaryDecisionFields(): Pick<
  PrimaryDecision,
  'verbCode' | 'focusCode' | 'rationaleCode' | 'expectedBenefit'
> {
  return {
    verbCode: 'decision.primary.insufficient.verb',
    focusCode: 'decision.primary.insufficient.focus',
    rationaleCode: 'decision.primary.insufficient.rationale',
    expectedBenefit: 0,
  };
}

function mergePrimaryActionCodes(
  topAction: ReturnType<typeof buildTopAction>,
  defaults: ReturnType<typeof defaultPrimaryDecisionFields>,
): Pick<PrimaryDecision, 'verbCode' | 'focusCode'> {
  return {
    verbCode: topAction?.verbCode ?? defaults.verbCode,
    focusCode: topAction?.focusCode ?? defaults.focusCode,
  };
}

function mergePrimaryActionRationale(
  topAction: ReturnType<typeof buildTopAction>,
  defaults: ReturnType<typeof defaultPrimaryDecisionFields>,
): Pick<PrimaryDecision, 'rationaleCode' | 'expectedBenefit'> {
  return {
    rationaleCode: topAction?.rationaleCode ?? defaults.rationaleCode,
    expectedBenefit: topAction?.expectedBenefit ?? defaults.expectedBenefit,
  };
}

function mergePrimaryDecisionFields(
  topAction: ReturnType<typeof buildTopAction>,
  defaults: ReturnType<typeof defaultPrimaryDecisionFields>,
): Pick<PrimaryDecision, 'verbCode' | 'focusCode' | 'rationaleCode' | 'expectedBenefit'> {
  return {
    ...mergePrimaryActionCodes(topAction, defaults),
    ...mergePrimaryActionRationale(topAction, defaults),
  };
}

export function buildPrimaryDecision(input: {
  verdict: OverallVerdict;
  limitingFactor: DecisionLimitingFactor;
  adaptation: AdaptationState | null;
}): PrimaryDecision {
  const topAction = buildTopAction(
    input.verdict,
    toLegacyLimitingFactor(input.limitingFactor),
    input.adaptation,
  );
  const defaults = defaultPrimaryDecisionFields();

  return {
    verdict: input.verdict,
    headlineCode: resolveHeadlineCode(input.verdict, input.limitingFactor),
    ...mergePrimaryDecisionFields(topAction, defaults),
  };
}
