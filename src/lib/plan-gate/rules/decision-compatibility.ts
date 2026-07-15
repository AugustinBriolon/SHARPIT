import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

const HIGH_INTENSITY = new Set(['THRESHOLD', 'VO2MAX', 'RACE']);

/**
 * Validates the proposal against the canonical DecisionState (recovery/fatigue/adaptation
 * arbitration, already computed by the frozen Core). Never treats missing/low-confidence
 * decision data as a training decision — that degrades to REQUIRES_CONFIRMATION, not REJECTED.
 */
export const decisionCompatibilityRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  const findings: RuleFinding[] = [];
  const { decision, fatigueTrainingCapacity } = context;
  const isHighIntensity = proposal.intensity != null && HIGH_INTENSITY.has(proposal.intensity);

  if (!decision || decision.confidenceTier === 'INSUFFICIENT') {
    findings.push({
      ruleCode: 'DECISION_INSUFFICIENT_DATA',
      severity: 'REQUIRES_CONFIRMATION',
      rationale:
        "L'état physiologique du jour n'est pas encore assez fiable pour valider cette séance automatiquement. Confirme que tu te sens prêt·e avant de la garder.",
      evidenceRefs: ['decision.confidenceTier'],
    });
    return findings;
  }

  if (
    isHighIntensity &&
    (decision.overallVerdict === 'RECOVER' || decision.overallVerdict === 'CAUTION')
  ) {
    findings.push({
      ruleCode: 'DECISION_INTENSITY_CONFLICT',
      severity: 'REJECTED',
      rationale: `Le verdict du jour est "${decision.overallVerdict}" — une séance ${proposal.intensity} n'est pas cohérente avec l'état de récupération actuel.`,
      evidenceRefs: ['decision.overallVerdict', 'decision.limitingFactor'],
      saferAlternative: {
        ...proposal,
        intensity: 'ENDURANCE',
        load: proposal.load != null ? Math.round(proposal.load * 0.6) : null,
      },
    });
  }

  if (
    fatigueTrainingCapacity === 'REST_ONLY' &&
    proposal.intensity != null &&
    proposal.intensity !== 'RECOVERY'
  ) {
    findings.push({
      ruleCode: 'FATIGUE_REST_ONLY',
      severity: 'REJECTED',
      rationale:
        'Le modèle de fatigue indique une capacité "repos uniquement" ce jour — toute séance autre que récupération est incompatible.',
      evidenceRefs: ['fatigueTrainingCapacity'],
      saferAlternative: {
        ...proposal,
        intensity: 'RECOVERY',
        durationMin: proposal.durationMin != null ? Math.min(proposal.durationMin, 30) : null,
        load: null,
      },
    });
  } else if (fatigueTrainingCapacity === 'LIGHT_ONLY' && isHighIntensity) {
    findings.push({
      ruleCode: 'FATIGUE_LIGHT_ONLY',
      severity: 'REJECTED',
      rationale:
        'Le modèle de fatigue limite la capacité à "léger uniquement" — une séance haute intensité n\'est pas sûre aujourd\'hui.',
      evidenceRefs: ['fatigueTrainingCapacity'],
      saferAlternative: {
        ...proposal,
        intensity: 'ENDURANCE',
        load: proposal.load != null ? Math.round(proposal.load * 0.6) : null,
      },
    });
  }

  return findings;
};
