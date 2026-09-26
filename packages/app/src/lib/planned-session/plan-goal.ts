/**
 * Resolve which goal should be stamped on sessions created from coach plan flows.
 * Prefers the active TrainingPlan.goalId when it is still a selectable dated goal.
 *
 * Option B: PlannedSession.goalId means « cette séance sert la course / l'objectif ».
 * Presentation and plan-gate consume it; Core engines do not.
 */
export function resolveDefaultPlanGoalId(
  planGoalId: string | null | undefined,
  selectableGoalIds: readonly string[],
): string | null {
  if (!planGoalId) {
    return null;
  }
  return selectableGoalIds.includes(planGoalId) ? planGoalId : null;
}

/** Dated, non-achieved goals still in the future (or today) — selectable for stamping. */
export function selectableDatedGoalIds(
  goals: readonly { id: string; achieved: boolean; targetDate: Date | string | null }[],
  now: Date = new Date(),
): string[] {
  return goals
    .filter((g) => !g.achieved && g.targetDate && new Date(g.targetDate) >= now)
    .map((g) => g.id);
}
