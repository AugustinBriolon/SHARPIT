import { startOfDay } from 'date-fns';
import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isMalformed(proposal: GateProposal): string | null {
  if (!DATE_PATTERN.test(proposal.date)) return 'invalid date format';
  if (Number.isNaN(new Date(`${proposal.date}T00:00:00`).getTime())) return 'unparseable date';
  if (proposal.durationMin != null && proposal.durationMin <= 0) return 'non-positive duration';
  if (proposal.load != null && proposal.load < 0) return 'negative load';
  if (proposal.action === 'MODIFY' && !proposal.sessionId) return 'MODIFY without sessionId';
  return null;
}

export const malformedAndDuplicateRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  const findings: RuleFinding[] = [];

  const malformedReason = isMalformed(proposal);
  if (malformedReason) {
    findings.push({
      ruleCode: 'MALFORMED_PROPOSAL',
      severity: 'REJECTED',
      rationale: `Proposition invalide (${malformedReason}) — impossible de la traiter en l'état.`,
      evidenceRefs: ['proposal'],
    });
    return findings;
  }

  const proposedDate = startOfDay(new Date(`${proposal.date}T00:00:00`));
  const today = startOfDay(context.now);

  // Past-date and duplicate checks only make sense for genuinely NEW sessions.
  // A MODIFY proposal that leaves the date untouched inherits the existing session's
  // date (see build-context.ts / adapt route's toGateProposal) — that date may already
  // be in the past (e.g. adjusting today's load), which is not a "malformed" proposal.
  if (proposal.action !== 'ADD') return findings;

  if (proposedDate < today) {
    findings.push({
      ruleCode: 'PAST_DATE',
      severity: 'REJECTED',
      rationale: `La date proposée (${proposal.date}) est dans le passé.`,
      evidenceRefs: ['proposal.date', 'context.now'],
    });
    return findings;
  }

  const duplicate = context.existingSessions.find(
    (s) => startOfDay(s.date).getTime() === proposedDate.getTime() && s.type === proposal.type,
  );
  if (duplicate) {
    findings.push({
      ruleCode: 'DUPLICATE_SESSION',
      severity: 'REJECTED',
      rationale: `Une séance ${proposal.type} existe déjà le ${proposal.date} (id ${duplicate.id}).`,
      evidenceRefs: [`existingSessions[id=${duplicate.id}]`],
    });
  }

  return findings;
};
