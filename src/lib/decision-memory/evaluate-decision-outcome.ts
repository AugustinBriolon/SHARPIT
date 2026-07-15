import { buildOutcomeEvaluationContext } from './build-outcome-context';
import { evaluateOutcome } from './evaluate-outcome';
import { saveOutcome } from './repository';
import type { OutcomeEvaluation } from './types';

/** Builds context, evaluates, and persists the outcome for one decision. Returns null if the linked PlannedSession no longer exists (SUPERSEDED — nothing to evaluate). */
export async function evaluateAndSaveDecisionOutcome(
  decisionId: string,
  plannedSessionId: string,
  now: Date = new Date(),
): Promise<OutcomeEvaluation | null> {
  const context = await buildOutcomeEvaluationContext(plannedSessionId, now);
  if (!context) return null;
  const evaluation = evaluateOutcome(context);
  await saveOutcome(decisionId, evaluation);
  return evaluation;
}
