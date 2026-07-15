import { startOfWeek } from 'date-fns';
import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

const WEEK_OPTS = { weekStartsOn: 1 as const };

export const goalPhaseCoherenceRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  const findings: RuleFinding[] = [];
  const proposedDate = new Date(`${proposal.date}T00:00:00`);

  if (context.goal?.targetDate && proposedDate > context.goal.targetDate) {
    findings.push({
      ruleCode: 'BEYOND_GOAL_HORIZON',
      severity: 'WARNING',
      rationale: `Cette séance (${proposal.date}) est planifiée après la date de l'objectif — vérifie si elle a encore du sens.`,
      evidenceRefs: ['goal.targetDate'],
    });
  }

  const weekKey = startOfWeek(proposedDate, WEEK_OPTS).toISOString().slice(0, 10);
  const planWeek = context.planWeeks.find(
    (w) => startOfWeek(w.weekStart, WEEK_OPTS).toISOString().slice(0, 10) === weekKey,
  );

  if (planWeek?.phase === 'TAPER' && proposal.load != null && proposal.load > 0) {
    const recentLoads = context.existingSessions
      .filter((s) => s.load != null)
      .map((s) => s.load as number);
    const recentAvg =
      recentLoads.length > 0 ? recentLoads.reduce((a, b) => a + b, 0) / recentLoads.length : null;

    if (recentAvg != null && proposal.load > recentAvg) {
      findings.push({
        ruleCode: 'TAPER_LOAD_INCREASE',
        severity: 'WARNING',
        rationale: `Cette séance (charge ~${Math.round(proposal.load)}) dépasse la charge moyenne récente pendant une semaine d'affûtage (${planWeek.phase}) — vérifie que ce n'est pas une surcharge accidentelle avant l'objectif.`,
        evidenceRefs: [`planWeeks[phase=TAPER]`, 'existingSessions[*].load'],
      });
    }
  }

  return findings;
};
