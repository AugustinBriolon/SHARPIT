import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Only runs when a calendar is actually connected (busyBlocks !== null) — never guesses availability. */
export const calendarConflictRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  if (context.busyBlocks === null) return [];
  if (!proposal.startTime || proposal.durationMin == null) return [];

  const dayBlocks = context.busyBlocks.filter((b) => b.dayKey === proposal.date);
  if (dayBlocks.length === 0) return [];

  const start = toMinutes(proposal.startTime);
  const end = start + proposal.durationMin;

  const overlap = dayBlocks.find((b) => {
    const busyStart = toMinutes(b.start);
    const busyEnd = toMinutes(b.end);
    return start < busyEnd && end > busyStart;
  });

  if (overlap) {
    return [
      {
        ruleCode: 'CALENDAR_CONFLICT',
        severity: 'WARNING',
        rationale: `Cette séance (${proposal.startTime}, ${proposal.durationMin} min) chevauche un créneau occupé de l'agenda (${overlap.start}–${overlap.end}).`,
        evidenceRefs: [`busyBlocks[dayKey=${proposal.date}]`],
      },
    ];
  }

  return [];
};
