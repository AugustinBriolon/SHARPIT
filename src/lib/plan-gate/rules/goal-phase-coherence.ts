import { startOfWeek } from 'date-fns';
import { isSet } from '@/lib/util/value';
import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

const WEEK_OPTS = { weekStartsOn: 1 as const };

function beyondGoalHorizonFinding(proposal: GateProposal, goalTargetDate: Date): RuleFinding {
  const goalRef = proposal.goalId ? `goalId=${proposal.goalId}` : 'goal.targetDate';
  return {
    ruleCode: 'BEYOND_GOAL_HORIZON',
    severity: 'WARNING',
    rationale: `Cette séance (${proposal.date}) est planifiée après la date de l'objectif — vérifie si elle a encore du sens.`,
    evidenceRefs: [goalRef, 'goal.targetDate'],
  };
}

function taperLoadIncreaseFinding(proposal: GateProposal, recentAvg: number): RuleFinding {
  return {
    ruleCode: 'TAPER_LOAD_INCREASE',
    severity: 'WARNING',
    rationale: `Cette séance (charge ~${Math.round(proposal.load ?? 0)}) dépasse la charge moyenne récente pendant une semaine d'affûtage (TAPER) — vérifie que ce n'est pas une surcharge accidentelle avant l'objectif.`,
    evidenceRefs: [`planWeeks[phase=TAPER]`, 'existingSessions[*].load'],
  };
}

function averageRecentLoad(context: GateContext): number | null {
  const recentLoads = context.existingSessions
    .filter((s) => isSet(s.load))
    .map((s) => s.load as number);
  if (recentLoads.length === 0) {
    return null;
  }
  return recentLoads.reduce((a, b) => a + b, 0) / recentLoads.length;
}

function planWeekForDate(context: GateContext, proposedDate: Date) {
  const weekKey = startOfWeek(proposedDate, WEEK_OPTS).toISOString().slice(0, 10);
  return context.planWeeks.find(
    (w) => startOfWeek(w.weekStart, WEEK_OPTS).toISOString().slice(0, 10) === weekKey,
  );
}

function collectTaperLoadFinding(
  context: GateContext,
  proposal: GateProposal,
  proposedDate: Date,
): RuleFinding | null {
  const planWeek = planWeekForDate(context, proposedDate);
  if (
    planWeek?.phase !== 'TAPER' ||
    proposal.load === undefined ||
    proposal.load === null ||
    proposal.load <= 0
  ) {
    return null;
  }
  const recentAvg = averageRecentLoad(context);
  if (isSet(recentAvg) && proposal.load > recentAvg) {
    return taperLoadIncreaseFinding(proposal, recentAvg);
  }
  return null;
}

export const goalPhaseCoherenceRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  const findings: RuleFinding[] = [];
  const proposedDate = new Date(`${proposal.date}T00:00:00`);

  if (context.goal?.targetDate && proposedDate > context.goal.targetDate) {
    findings.push(beyondGoalHorizonFinding(proposal, context.goal.targetDate));
  }

  const taperFinding = collectTaperLoadFinding(context, proposal, proposedDate);
  if (taperFinding) {
    findings.push(taperFinding);
  }

  return findings;
};
