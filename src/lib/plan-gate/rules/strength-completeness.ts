import { auditStrengthPrescription } from '@/lib/planned-session/strength/strength-session-template';
import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

/**
 * A strength session must carry a prescription that fills its slot.
 *
 * Generated weeks used to propose 45-minute prehab sessions holding three to
 * five exercises — about twenty minutes of work — because nothing checked the
 * prescription against the duration it was meant to cover.
 */
export const strengthCompletenessRule: PlanGateRule = (
  _context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  if (proposal.type !== 'STRENGTH') {
    return [];
  }

  if (!proposal.strengthPrescription || proposal.strengthPrescription.sets.length === 0) {
    return [
      {
        ruleCode: 'STRENGTH_PRESCRIPTION_MISSING',
        severity: 'WARNING',
        rationale:
          "Séance de renfo sans exercices prescrits — elle ne pourra pas être envoyée à la montre et n'est pas évaluable.",
        evidenceRefs: ['proposal.strengthPrescription'],
      },
    ];
  }

  const audit = auditStrengthPrescription({
    durationMin: proposal.durationMin,
    prescription: proposal.strengthPrescription,
  });
  if (!audit || audit.verdict === 'ok') {
    return [];
  }

  return [
    {
      ruleCode:
        audit.verdict === 'too_short'
          ? 'STRENGTH_SESSION_UNDERFILLED'
          : 'STRENGTH_SESSION_OVERFILLED',
      severity: 'WARNING',
      rationale: audit.message,
      evidenceRefs: ['proposal.durationMin', 'proposal.strengthPrescription'],
    },
  ];
};
