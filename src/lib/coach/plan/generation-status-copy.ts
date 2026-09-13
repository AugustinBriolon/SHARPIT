/**
 * Progressive status line while coach plan / adaptation generation runs.
 * One sentence at a time — no stacked spinners, no fake speed.
 */

export const COACH_GENERATION_STATUS_STEP_MS = 4_500;

/** Ordered what-is-being-consulted copy (French, athlete-facing). */
export const COACH_GENERATION_STATUS_STEPS = [
  'Le coach consulte ton profil et ton contexte…',
  'Il lit tes seuils et ta forme du moment…',
  'Il aligne la proposition sur ton objectif…',
  'Il s’appuie sur ton macro-plan…',
  'Il compose le calendrier de la semaine…',
  'Il finalise les séances — encore un instant…',
] as const;

export type CoachGenerationStatusInput = {
  elapsedMs: number;
  partialCount: number;
  /** Singular noun, e.g. "séance" or "ajustement". */
  itemNoun: string;
};

/**
 * Exactly one status string for the current wait.
 * When streamed items exist, prefer the drafting count over phase rotation.
 */
export function coachGenerationStatusCopy(input: CoachGenerationStatusInput): string {
  const count = Math.max(0, Math.floor(input.partialCount));
  if (count > 0) {
    return `${count} ${input.itemNoun}${count > 1 ? 's' : ''} en cours de rédaction…`;
  }

  const elapsed = Math.max(0, input.elapsedMs);
  const index =
    Math.floor(elapsed / COACH_GENERATION_STATUS_STEP_MS) % COACH_GENERATION_STATUS_STEPS.length;
  return COACH_GENERATION_STATUS_STEPS[index] ?? COACH_GENERATION_STATUS_STEPS[0];
}
