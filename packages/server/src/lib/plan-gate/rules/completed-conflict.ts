import { startOfDay } from 'date-fns';
import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

/** A completed session is an immutable historical record — never modified, never silently replaced. */
export const completedConflictRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  const findings: RuleFinding[] = [];

  if (proposal.action === 'MODIFY' && proposal.sessionId) {
    const target = context.existingSessions.find((s) => s.id === proposal.sessionId);
    if (target?.completed) {
      findings.push({
        ruleCode: 'COMPLETED_SESSION_IMMUTABLE',
        severity: 'REJECTED',
        rationale: `La séance ${proposal.sessionId} est déjà réalisée — elle ne peut plus être modifiée.`,
        evidenceRefs: [`existingSessions[id=${proposal.sessionId}].completed`],
      });
    }
  }

  if (proposal.action === 'ADD') {
    const proposedDate = startOfDay(new Date(`${proposal.date}T00:00:00`));
    const conflict = context.existingSessions.find(
      (s) =>
        s.completed &&
        s.type === proposal.type &&
        startOfDay(s.date).getTime() === proposedDate.getTime(),
    );
    if (conflict) {
      findings.push({
        ruleCode: 'COMPLETED_SESSION_CONFLICT',
        severity: 'REJECTED',
        rationale: `Une séance ${proposal.type} déjà réalisée existe le ${proposal.date} (id ${conflict.id}) — impossible d'en ajouter une autre à la même date.`,
        evidenceRefs: [`existingSessions[id=${conflict.id}]`],
      });
    }
  }

  return findings;
};
