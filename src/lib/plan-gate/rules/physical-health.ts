import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

const HIGH_INTENSITY = new Set(['THRESHOLD', 'VO2MAX', 'RACE']);

/**
 * Reuses the Physical Health Engine's own already-inferred aggregate capacity
 * (snapshot.physicalHealth) — does not re-derive body-region-vs-sport matching,
 * which the engine already scores more reliably than a rule could from free text.
 */
export const physicalHealthRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  const findings: RuleFinding[] = [];
  const { physicalHealth } = context;
  if (!physicalHealth) return findings;

  if (physicalHealth.trainingBlockedByCondition) {
    findings.push({
      ruleCode: 'PHYSICAL_HEALTH_BLOCKED',
      severity: 'REJECTED',
      rationale:
        "Une condition physique active bloque actuellement l'entraînement — cette séance ne peut pas être confirmée telle quelle.",
      evidenceRefs: [
        'physicalHealth.trainingBlockedByCondition',
        'physicalHealth.primaryLimitingConditionId',
      ],
    });
    return findings;
  }

  const isHighIntensity = proposal.intensity != null && HIGH_INTENSITY.has(proposal.intensity);
  const capacity = physicalHealth.aggregateTrainingCapacity;

  if (capacity === 'UNABLE') {
    findings.push({
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
    });
  } else if (capacity === 'LIMITED' && isHighIntensity) {
    findings.push({
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
        load: proposal.load != null ? Math.round(proposal.load * 0.6) : null,
      },
    });
  } else if (capacity === 'REDUCED' && isHighIntensity) {
    findings.push({
      ruleCode: 'PHYSICAL_HEALTH_REDUCED',
      severity: 'REQUIRES_CONFIRMATION',
      rationale:
        "Capacité réduite par une condition physique active — confirme que cette séance haute intensité reste raisonnable aujourd'hui.",
      evidenceRefs: ['physicalHealth.aggregateTrainingCapacity'],
    });
  }

  return findings;
};
