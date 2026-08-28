import { startOfWeek } from 'date-fns';
import { computeTrainingLoad, ACWR_THRESHOLDS } from '@/lib/training/training-load';
import type { GateContext, GateProposal, PlanLevelGateRule, RuleFinding } from '../types';

export const WEEKLY_TARGET_TOLERANCE = 1.1;
const WEEK_OPTS = { weekStartsOn: 1 as const };

function weekKey(date: Date): string {
  return startOfWeek(date, WEEK_OPTS).toISOString().slice(0, 10);
}

function accumulateProposalLoads(
  proposals: readonly GateProposal[],
  loadByWeek: Map<string, number>,
): void {
  for (const p of proposals) {
    if (p.action !== 'ADD' && p.action !== 'MODIFY') {
      continue;
    }
    const key = weekKey(new Date(`${p.date}T00:00:00`));
    loadByWeek.set(key, (loadByWeek.get(key) ?? 0) + (p.load ?? 0));
  }
}

function accumulateExistingLoads(
  context: GateContext,
  proposals: readonly GateProposal[],
  loadByWeek: Map<string, number>,
): void {
  const modifiedIds = new Set(
    proposals.filter((p) => p.action === 'MODIFY' && p.sessionId).map((p) => p.sessionId),
  );
  for (const session of context.existingSessions) {
    if (modifiedIds.has(session.id)) {
      continue;
    }
    const key = weekKey(session.date);
    if (loadByWeek.has(key)) {
      loadByWeek.set(key, (loadByWeek.get(key) ?? 0) + (session.load ?? 0));
    }
  }
}

function weeklyLoadFinding(
  key: string,
  projectedLoad: number,
  planWeek: GateContext['planWeeks'][number] | undefined,
): RuleFinding {
  return {
    ruleCode: 'WEEKLY_LOAD_EXCEEDED',
    severity: 'WARNING',
    rationale: planWeek
      ? `Charge projetée pour la semaine du ${key} (~${Math.round(projectedLoad)} TSS) dépasse la cible du plan (${planWeek.targetLoad} TSS) de plus de 10%.`
      : `Charge projetée pour la semaine du ${key} (~${Math.round(projectedLoad)} TSS) dépasse largement la charge récente tolérée par l'athlète.`,
    evidenceRefs: planWeek
      ? [`planWeeks[weekStart=${key}].targetLoad`]
      : ['trainingLoad.weeklyLoad', 'ACWR_THRESHOLDS.OVERLOAD_MODERATE'],
  };
}

export const weeklyLoadRule: PlanLevelGateRule = (
  context: GateContext,
  proposals: readonly GateProposal[],
): RuleFinding[] => {
  const loadByWeek = new Map<string, number>();
  accumulateProposalLoads(proposals, loadByWeek);
  accumulateExistingLoads(context, proposals, loadByWeek);

  const findings: RuleFinding[] = [];
  for (const [key, projectedLoad] of loadByWeek) {
    const weekStart = new Date(`${key}T00:00:00`);
    const planWeek = context.planWeeks.find((w) => weekKey(w.weekStart) === key);
    const ceiling = planWeek
      ? planWeek.targetLoad * WEEKLY_TARGET_TOLERANCE
      : computeTrainingLoad([...context.dailyTrainingStress], weekStart).weeklyLoad *
        ACWR_THRESHOLDS.OVERLOAD_MODERATE;

    if (ceiling > 0 && projectedLoad > ceiling) {
      findings.push(weeklyLoadFinding(key, projectedLoad, planWeek));
    }
  }

  return findings;
};
