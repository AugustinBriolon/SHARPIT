/**
 * Plan coach offer — one intention, three ranked gestures.
 *
 * Twin « Adaptation » (/plan/adaptation) is a reading of body response to the
 * block. It is never a plan-mutation CTA. Mutation uses « Ajuster le planning ».
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
  readonly title: string;
  readonly role: string;
  /** Deep-link when the step navigates; null for in-place dialog (cadre). */
  readonly href: string | null;
};

export const PLAN_COACH_STEPS: readonly PlanCoachStep[] = [
  {
    id: 'cadre',
    title: 'Cadre jusqu’à la course',
    role: 'Phases et charge cible jusqu’à l’objectif · pas les séances',
    href: null,
  },
  {
    id: 'remplir',
    title: 'Remplir ma semaine',
    role: 'Proposer les prochaines séances concrètes',
    href: '/plan/semaine?create=1',
  },
  {
    id: 'ajuster',
    title: 'Ajuster le planning',
    role: 'Réarranger ce qui est déjà prévu',
    href: '/plan/semaine?adapt=1',
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
