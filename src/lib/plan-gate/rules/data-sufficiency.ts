import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

const PRECISION_SENSITIVE = new Set(['THRESHOLD', 'VO2MAX']);

/** Missing thresholds force a conservative confirmation rather than a silent guess. */
export const dataSufficiencyRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  if (proposal.intensity == null || !PRECISION_SENSITIVE.has(proposal.intensity)) return [];
  if (context.athleteProfile?.hasThresholds) return [];

  return [
    {
      ruleCode: 'MISSING_THRESHOLDS',
      severity: 'REQUIRES_CONFIRMATION',
      rationale: `Aucun seuil (FTP/FC seuil/allure seuil) enregistré — les zones pour cette séance ${proposal.intensity} sont des estimations, pas des cibles précises.`,
      evidenceRefs: ['athleteProfile.hasThresholds'],
      requiredAssumption:
        "Pas de seuils physiologiques renseignés — zones d'intensité estimées par défaut.",
    },
  ];
};
