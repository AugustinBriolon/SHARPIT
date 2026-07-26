/**
 * Resolve which goal should be stamped on sessions created from coach plan flows.
 * Prefers the active TrainingPlan.goalId when it is still a selectable dated goal.
 */
export function resolveDefaultPlanGoalId(
  planGoalId: string | null | undefined,
  selectableGoalIds: readonly string[],
): string | null {
  if (!planGoalId) return null;
  return selectableGoalIds.includes(planGoalId) ? planGoalId : null;
}
