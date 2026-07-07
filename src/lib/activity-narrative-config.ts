import { startOfDay } from 'date-fns';

/** Première date incluse pour l'analyse narrative (inclusive, fuseau local). */
export const NARRATIVE_ANALYSIS_SINCE = startOfDay(new Date(2026, 5, 29));

export function isEligibleForActivityNarrative(date: Date): boolean {
  return startOfDay(date).getTime() >= NARRATIVE_ANALYSIS_SINCE.getTime();
}
