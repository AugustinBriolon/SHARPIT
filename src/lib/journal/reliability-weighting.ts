/**
 * Journal field weighting for Recovery v1 (Science Sport reliability V0).
 * Morning wellness only is weighted; other journal fields are noted but not weighted.
 */

export const WEIGHTED_MORNING_WELLNESS_FIELDS = [
  'mood',
  'energy',
  'soreness',
  'stress',
] as const;

export type WeightedMorningWellnessField = (typeof WEIGHTED_MORNING_WELLNESS_FIELDS)[number];

export const JOURNAL_WEIGHT_BADGE = {
  weighted: 'pris en compte',
  notedNotWeighted: 'Noté, pas encore pondéré',
} as const;

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

export function journalWeightBadgeLabel(fieldId: string): string {
  return isJournalFieldWeightedInRecoveryV1(fieldId)
    ? JOURNAL_WEIGHT_BADGE.weighted
    : JOURNAL_WEIGHT_BADGE.notedNotWeighted;
}
