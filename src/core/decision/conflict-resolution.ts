/**
 * Decision Engine — cross-model conflict detection and resolution.
 */

import type {
  AdaptationState,
  FatigueState,
  RecoveryState,
  ReasoningConflict,
} from '@/core/digital-twin/types';
import type { PhysicalHealthState } from '@/core/inference/physical-health/types';
import { arbitrateModelConflict, detectConflicts } from '@/core/inference/reasoning/scoring';
import type { ModelDirections } from '@/core/inference/reasoning/types';
import type { DecisionConflict, DecisionDomain, DecisionLimitingFactor } from './decision-state';
import { domainPriorityIndex } from './priority';

function mapConflictDomains(models: readonly string[]): DecisionDomain[] {
  const domains: DecisionDomain[] = [];
  for (const model of models) {
    switch (model.toLowerCase()) {
      case 'recovery':
        domains.push('RECOVERY');
        break;
      case 'fatigue':
        domains.push('FATIGUE');
        break;
      case 'adaptation':
        domains.push('ADAPTATION');
        break;
      case 'physicalhealth':
      case 'physical health':
        domains.push('PHYSICAL_HEALTH');
        break;
      default:
        break;
    }
  }
  return domains;
}

function resolveConflict(
  conflict: ReasoningConflict,
  limitingFactor: DecisionLimitingFactor,
  modelDirections: ModelDirections,
  verdict: import('@/core/digital-twin/types').OverallVerdict,
): DecisionDomain | null {
  if (limitingFactor.domain === 'PHYSICAL_HEALTH') return 'PHYSICAL_HEALTH';

  const arbitration = arbitrateModelConflict(modelDirections, verdict, {
    system: limitingFactor.system === 'PHYSICAL_HEALTH' ? null : limitingFactor.system,
    description: limitingFactor.description,
    actionable: limitingFactor.actionable,
  });

  if (arbitration) return arbitration;

  const domains = mapConflictDomains(conflict.models);
  if (domains.length === 0) return null;

  return [...domains].sort((a, b) => domainPriorityIndex(a) - domainPriorityIndex(b))[0] ?? null;
}

export function detectDecisionConflicts(input: {
  recovery: RecoveryState | null;
  fatigue: FatigueState | null;
  adaptation: AdaptationState | null;
  physicalHealth: PhysicalHealthState | null;
}): DecisionConflict[] {
  const base = detectConflicts(input.recovery, input.fatigue, input.adaptation);
  const conflicts: DecisionConflict[] = base.map((conflict) => ({
    id: conflict.id,
    type: conflict.type,
    domains: mapConflictDomains(conflict.models),
    descriptionCode: conflict.descriptionCode,
    resolutionCode: conflict.resolutionCode,
    resolvedBy: null,
  }));

  if (
    input.physicalHealth?.trainingBlockedByCondition &&
    input.fatigue &&
    input.fatigue.trainingCapacity !== 'REST_ONLY'
  ) {
    conflicts.push({
      id: 'PHYSICAL_HEALTH_CAPACITY_CONFLICT',
      type: 'CAPACITY_CONFLICT',
      domains: ['PHYSICAL_HEALTH', 'FATIGUE'],
      descriptionCode: 'decision.conflict.physicalHealthCapacity.description',
      resolutionCode: 'decision.conflict.physicalHealthCapacity.resolution',
      resolvedBy: 'PHYSICAL_HEALTH',
    });
  }

  return conflicts;
}

export function resolveDecisionConflicts(input: {
  conflicts: readonly DecisionConflict[];
  limitingFactor: DecisionLimitingFactor;
  modelDirections: ModelDirections;
  verdict: import('@/core/digital-twin/types').OverallVerdict;
  baseConflicts: readonly ReasoningConflict[];
}): DecisionConflict[] {
  return input.conflicts.map((conflict) => {
    if (conflict.resolvedBy) return conflict;

    const base = input.baseConflicts.find((b) => b.id === conflict.id);
    const resolvedBy = base
      ? resolveConflict(base, input.limitingFactor, input.modelDirections, input.verdict)
      : null;

    return { ...conflict, resolvedBy };
  });
}
