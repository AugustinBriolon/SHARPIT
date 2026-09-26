/**
 * Journal field weighting for Recovery v1 (Science Sport reliability V0).
 * Morning wellness only is weighted; other journal fields are archived quietly
 * (header callout explains the model — no per-line failure badges).
 */

export const WEIGHTED_MORNING_WELLNESS_FIELDS = ['mood', 'energy', 'soreness', 'stress'] as const;

export type WeightedMorningWellnessField = (typeof WEIGHTED_MORNING_WELLNESS_FIELDS)[number];

/** Positive badge — only on Recovery v1 weighted morning wellness fields. */
export const JOURNAL_WEIGHT_BADGE = {
  weighted: 'Pris en compte',
} as const;

/**
 * Single journal header callout (FR, no em dash).
 * Explains that only the 4 morning signals enter Recovery v1; the rest is archived.
 */
export const JOURNAL_RECOVERY_CALLOUT =
  'Recovery lit 4 signaux matin : le reste est archivé pour toi, pas encore dans le modèle';

/** Day-journal metric / factor ids that map to Recovery v1 subjective weights. */
const WEIGHTED_JOURNAL_IDS = new Set<string>([
  'mood',
  'energy',
  'soreness',
  'stress',
  'metric_mood',
  // Morning wellness dialog keys
  ...WEIGHTED_MORNING_WELLNESS_FIELDS,
]);

export function isJournalFieldWeightedInRecoveryV1(fieldId: string): boolean {
  return WEIGHTED_JOURNAL_IDS.has(fieldId);
}

/** Label for the green « Pris en compte » badge, or null when the row stays quiet. */
export function journalWeightBadgeLabel(fieldId: string): string | null {
  return isJournalFieldWeightedInRecoveryV1(fieldId) ? JOURNAL_WEIGHT_BADGE.weighted : null;
}
