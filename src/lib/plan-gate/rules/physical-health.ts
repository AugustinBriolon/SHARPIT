import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';
import { isSet } from '@/lib/util/value';

const HIGH_INTENSITY = new Set(['THRESHOLD', 'VO2MAX', 'RACE']);

function blockedTrainingFinding(): RuleFinding {
  return {
    ruleCode: 'PHYSICAL_HEALTH_BLOCKED',
    severity: 'REJECTED',
    rationale:
      "Une condition physique active bloque actuellement l'entraînement — cette séance ne peut pas être confirmée telle quelle.",
    evidenceRefs: [
      'physicalHealth.trainingBlockedByCondition',
      'physicalHealth.primaryLimitingConditionId',
    ],
  };
}

function capacityFindings(
  proposal: GateProposal,
  capacity: NonNullable<GateContext['physicalHealth']>['aggregateTrainingCapacity'],
  isHighIntensity: boolean,
): RuleFinding[] {
  if (capacity === 'UNABLE') {
    return [
      {
        ruleCode: 'PHYSICAL_HEALTH_UNABLE',
        severity: 'REJECTED',
        rationale:
          "La capacité d'entraînement inférée est actuellement à zéro (condition physique active) — repos recommandé.",
        evidenceRefs: ['physicalHealth.aggregateTrainingCapacity'],
        saferAlternative: {
          ...proposal,
          type: 'STRENGTH',
          intensity: 'RECOVERY',
          durationMin: null,
          load: null,
          title: 'Mobilité / repos actif',
        },
      },
    ];
  }

  if (capacity === 'LIMITED' && isHighIntensity) {
    return [
      {
        ruleCode: 'PHYSICAL_HEALTH_LIMITED',
        severity: 'REJECTED',
        rationale:
          'Capacité limitée par une condition physique active — une séance haute intensité présente un risque disproportionné.',
        evidenceRefs: [
          'physicalHealth.aggregateTrainingCapacity',
          'physicalHealth.primaryLimitingConditionId',
        ],
        saferAlternative: {
          ...proposal,
          intensity: 'ENDURANCE',
          load: isSet(proposal.load) ? Math.round(proposal.load * 0.6) : null,
        },
      },
    ];
  }

  if (capacity === 'REDUCED' && isHighIntensity) {
    return [
      {
        ruleCode: 'PHYSICAL_HEALTH_REDUCED',
        severity: 'REQUIRES_CONFIRMATION',
        rationale:
          "Capacité réduite par une condition physique active — confirme que cette séance haute intensité reste raisonnable aujourd'hui.",
        evidenceRefs: ['physicalHealth.aggregateTrainingCapacity'],
      },
    ];
  }

  return [];
}

export const physicalHealthRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  const { physicalHealth } = context;
  if (!physicalHealth) {
    return [];
  }

  if (physicalHealth.trainingBlockedByCondition) {
    return [blockedTrainingFinding()];
  }

  const isHighIntensity = isSet(proposal.intensity) && HIGH_INTENSITY.has(proposal.intensity);
  return capacityFindings(proposal, physicalHealth.aggregateTrainingCapacity, isHighIntensity);
};
