import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';
import { isSet } from '@/lib/util/value';

const HIGH_INTENSITY = new Set(['THRESHOLD', 'VO2MAX', 'RACE']);

function insufficientDecisionFinding(): RuleFinding {
  return {
    ruleCode: 'DECISION_INSUFFICIENT_DATA',
    severity: 'REQUIRES_CONFIRMATION',
    rationale:
      "L'état physiologique du jour n'est pas encore assez fiable pour valider cette séance automatiquement. Confirme que tu te sens prêt·e avant de la garder.",
    evidenceRefs: ['decision.confidenceTier'],
  };
}

function intensityConflictFinding(proposal: GateProposal, overallVerdict: string): RuleFinding {
  return {
    ruleCode: 'DECISION_INTENSITY_CONFLICT',
    severity: 'REJECTED',
    rationale: `Le verdict du jour est "${overallVerdict}" — une séance ${proposal.intensity} n'est pas cohérente avec l'état de récupération actuel.`,
    evidenceRefs: ['decision.overallVerdict', 'decision.limitingFactor'],
    saferAlternative: {
      ...proposal,
      intensity: 'ENDURANCE',
      load: isSet(proposal.load) ? Math.round(proposal.load * 0.6) : null,
    },
  };
}

function fatigueCapacityFindings(
  proposal: GateProposal,
  fatigueTrainingCapacity: GateContext['fatigueTrainingCapacity'],
  isHighIntensity: boolean,
): RuleFinding[] {
  if (
    fatigueTrainingCapacity === 'REST_ONLY' &&
    isSet(proposal.intensity) &&
    proposal.intensity !== 'RECOVERY'
  ) {
    return [
      {
        ruleCode: 'FATIGUE_REST_ONLY',
        severity: 'REJECTED',
        rationale:
          'Le modèle de fatigue indique une capacité "repos uniquement" ce jour — toute séance autre que récupération est incompatible.',
        evidenceRefs: ['fatigueTrainingCapacity'],
        saferAlternative: {
          ...proposal,
          intensity: 'RECOVERY',
          durationMin: isSet(proposal.durationMin) ? Math.min(proposal.durationMin, 30) : null,
          load: null,
        },
      },
    ];
  }

  if (fatigueTrainingCapacity === 'LIGHT_ONLY' && isHighIntensity) {
    return [
      {
        ruleCode: 'FATIGUE_LIGHT_ONLY',
        severity: 'REJECTED',
        rationale:
          'Le modèle de fatigue limite la capacité à "léger uniquement" — une séance haute intensité n\'est pas sûre aujourd\'hui.',
        evidenceRefs: ['fatigueTrainingCapacity'],
        saferAlternative: {
          ...proposal,
          intensity: 'ENDURANCE',
          load: isSet(proposal.load) ? Math.round(proposal.load * 0.6) : null,
        },
      },
    ];
  }

  return [];
}

export const decisionCompatibilityRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  const { decision, fatigueTrainingCapacity } = context;
  const isHighIntensity = isSet(proposal.intensity) && HIGH_INTENSITY.has(proposal.intensity);

  if (!decision || decision.confidenceTier === 'INSUFFICIENT') {
    return [insufficientDecisionFinding()];
  }

  const findings: RuleFinding[] = [];
  if (
    isHighIntensity &&
    (decision.overallVerdict === 'RECOVER' || decision.overallVerdict === 'CAUTION')
  ) {
    findings.push(intensityConflictFinding(proposal, decision.overallVerdict));
  }

  findings.push(...fatigueCapacityFindings(proposal, fatigueTrainingCapacity, isHighIntensity));
  return findings;
};
