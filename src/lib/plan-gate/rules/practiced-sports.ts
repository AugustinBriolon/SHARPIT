import { isCoachActivityTypeAllowed } from '@/lib/practiced-sports';
import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

/**
 * Reject ADD of a sport the athlete does not practice.
 * MODIFY of an already-planned non-practiced sport stays allowed (history / existing plan).
 * MODIFY that changes type toward a non-practiced sport is rejected.
 */
export const practicedSportsRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  const sports = context.practicedSports;
  if (!sports || sports.length === 0) {
    return [];
  }

  if (proposal.action === 'MODIFY' && proposal.sessionId) {
    const existing = context.existingSessions.find((s) => s.id === proposal.sessionId);
    if (existing && existing.type === proposal.type) {
      return [];
    }
  }

  if (isCoachActivityTypeAllowed(proposal.type, sports)) {
    return [];
  }

  return [
    {
      ruleCode: 'SPORT_NOT_PRACTICED',
      severity: 'REJECTED',
      rationale: `Sport ${proposal.type} hors sports pratiqués — ne pas proposer de nouvelle séance de ce type.`,
      evidenceRefs: ['context.practicedSports', 'proposal.type'],
    },
  ];
};
