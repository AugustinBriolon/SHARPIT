/**
 * Plan coach offer — one intention, three ranked gestures.
 *
 * Twin « Adaptation » (/plan/adaptation) is a reading of body response to the
 * block. It is never a plan-mutation CTA. Mutation uses « Ajuster le planning ».
 *
 * Anti-pattern: do not navigate to another route solely to open a dialog the
 * current surface can host. On the Plan hub, open Macro / Generator / Adapter
 * in place. Query deep-links (`generate` / `adapt`) are for cross-destination
 * entry only (Today, weekly brief empty state → /plan/semaine).
 */

export const PLAN_COACH_INTENTION = 'Coacher mon objectif';

export const PLAN_COACH_INTENTION_BLURB =
  'Une intention : construire et tenir le programme vers ta course.';

/** Twin Adaptation drill-down — evidence, not PlanAdapter. */
export const TWIN_ADAPTATION_READING = {
  title: 'Adaptation',
  blurb: 'Réponse du corps au bloc · lecture Twin, pas un ajustement de planning',
} as const;

export type PlanCoachStepId = 'cadre' | 'remplir' | 'ajuster';

export type PlanCoachAccent = PlanCoachStepId | null;

export type PlanCoachStep = {
  readonly id: PlanCoachStepId;
  readonly band: string;
  readonly title: string;
  readonly role: string;
  /**
   * Cross-destination deep-link only. Null when the gesture has no semaine URL
   * (cadre opens MacroPlanDialog in place). Never use from the Plan hub CTA —
   * open the dialog on the current surface.
   */
  readonly deepLink: string | null;
};

/** Week planning route — Remplir opens PlanGenerator (`generate=1`). */
export const PLAN_COACH_GENERATE_HREF = '/plan/semaine?generate=1';

/** Week planning route — Ajuster opens PlanAdapter (`adapt=1`). */
export const PLAN_COACH_ADAPT_HREF = '/plan/semaine?adapt=1';

export const PLAN_COACH_STEPS: readonly PlanCoachStep[] = [
  {
    id: 'cadre',
    band: 'Cadre',
    title: 'Plan macro',
    role: 'Phases et charge cible jusqu’à l’objectif · pas les séances',
    deepLink: null,
  },
  {
    id: 'remplir',
    band: 'Séances',
    title: 'Remplir ma semaine',
    role: 'Proposer les prochaines séances concrètes',
    deepLink: PLAN_COACH_GENERATE_HREF,
  },
  {
    id: 'ajuster',
    band: 'Ajuster',
    title: 'Ajuster le planning',
    role: 'Réarranger ce qui est déjà prévu',
    deepLink: PLAN_COACH_ADAPT_HREF,
  },
] as const;

/**
 * Which coaching gesture to emphasise on the Plan hub.
 *
 * Cadre first when the goal has no macro structure; Remplir when the frame
 * exists but the week has no remaining sessions; Ajuster once sessions exist.
 */
export function resolvePlanCoachAccent(input: {
  hasDatedGoal: boolean;
  hasActiveMacro: boolean;
  hasRemainingSessions: boolean;
}): PlanCoachAccent {
  if (!input.hasDatedGoal) {
    return null;
  }
  if (!input.hasActiveMacro) {
    return 'cadre';
  }
  if (!input.hasRemainingSessions) {
    return 'remplir';
  }
  return 'ajuster';
}
