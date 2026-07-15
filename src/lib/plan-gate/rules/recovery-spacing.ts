import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

const HIGH_INTENSITY = new Set(['THRESHOLD', 'VO2MAX', 'RACE']);
const MIN_SPACING_MS = 24 * 60 * 60 * 1000;

/** Warns when a proposed high-intensity session lands within 24h of another key session. */
export const recoverySpacingRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  if (proposal.intensity == null || !HIGH_INTENSITY.has(proposal.intensity)) return [];

  const proposedTime = new Date(`${proposal.date}T00:00:00`).getTime();

  const nearbyExisting = context.existingSessions.find(
    (s) =>
      s.id !== proposal.sessionId &&
      s.intensity != null &&
      HIGH_INTENSITY.has(s.intensity) &&
      Math.abs(s.date.getTime() - proposedTime) < MIN_SPACING_MS &&
      s.date.getTime() !== proposedTime,
  );

  if (nearbyExisting) {
    return [
      {
        ruleCode: 'INSUFFICIENT_RECOVERY_SPACING',
        severity: 'WARNING',
        rationale: `Moins de 24h sépare cette séance ${proposal.intensity} d'une autre séance clé (id ${nearbyExisting.id}) — vérifie que la récupération est suffisante.`,
        evidenceRefs: [`existingSessions[id=${nearbyExisting.id}]`],
      },
    ];
  }

  return [];
};
