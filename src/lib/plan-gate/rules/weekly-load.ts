import { startOfWeek } from 'date-fns';
import { computeTrainingLoad, ACWR_THRESHOLDS } from '@/lib/training-load';
import type { GateContext, GateProposal, PlanLevelGateRule, RuleFinding } from '../types';

export const WEEKLY_TARGET_TOLERANCE = 1.1;
const WEEK_OPTS = { weekStartsOn: 1 as const };

function weekKey(date: Date): string {
  return startOfWeek(date, WEEK_OPTS).toISOString().slice(0, 10);
}

/**
 * Plan-level: proposed weekly load vs. the athlete's own explicit weekly target
 * (PlanWeek.targetLoad) when available, else vs. their own recent rolling load
 * (computeTrainingLoad) using the existing ACWR "moderate overload" ratio —
 * reused, not a new threshold.
 */
export const weeklyLoadRule: PlanLevelGateRule = (
  context: GateContext,
  proposals: readonly GateProposal[],
): RuleFinding[] => {
  const findings: RuleFinding[] = [];
  const loadByWeek = new Map<string, number>();

  for (const p of proposals) {
    if (p.action !== 'ADD' && p.action !== 'MODIFY') continue;
    const key = weekKey(new Date(`${p.date}T00:00:00`));
    loadByWeek.set(key, (loadByWeek.get(key) ?? 0) + (p.load ?? 0));
  }

  const modifiedIds = new Set(
    proposals.filter((p) => p.action === 'MODIFY' && p.sessionId).map((p) => p.sessionId),
  );
  for (const session of context.existingSessions) {
    if (modifiedIds.has(session.id)) continue; // superseded by a MODIFY proposal above
    const key = weekKey(session.date);
    if (loadByWeek.has(key)) {
      loadByWeek.set(key, (loadByWeek.get(key) ?? 0) + (session.load ?? 0));
    }
  }

  for (const [key, projectedLoad] of loadByWeek) {
    const weekStart = new Date(`${key}T00:00:00`);
    const planWeek = context.planWeeks.find((w) => weekKey(w.weekStart) === key);

    const ceiling = planWeek
      ? planWeek.targetLoad * WEEKLY_TARGET_TOLERANCE
      : computeTrainingLoad([...context.recentActivities], weekStart).weeklyLoad *
        ACWR_THRESHOLDS.OVERLOAD_MODERATE;

    if (ceiling > 0 && projectedLoad > ceiling) {
      findings.push({
        ruleCode: 'WEEKLY_LOAD_EXCEEDED',
        severity: 'WARNING',
        rationale: planWeek
          ? `Charge projetée pour la semaine du ${key} (~${Math.round(projectedLoad)} TSS) dépasse la cible du plan (${planWeek.targetLoad} TSS) de plus de 10%.`
          : `Charge projetée pour la semaine du ${key} (~${Math.round(projectedLoad)} TSS) dépasse largement la charge récente tolérée par l'athlète.`,
        evidenceRefs: planWeek
          ? [`planWeeks[weekStart=${key}].targetLoad`]
          : ['trainingLoad.weeklyLoad', 'ACWR_THRESHOLDS.OVERLOAD_MODERATE'],
      });
    }
  }

  return findings;
};
