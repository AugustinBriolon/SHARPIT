/**
 * Journal screen section helpers — keep UI split aligned with catalog `window`.
 */

import {
  isDayContextFactorId,
  isPriorNightFactor,
} from '@sharpit/app/lib/journal/day-context-factors';

/**
 * Content blocks inside JournalLoadedContent (after toolbar), top → bottom.
 * Checklist auto + Nutrition sit in `derived_panels`, then Nuit dernière, then Signaux.
 */
export const JOURNAL_LOADED_CONTENT_ORDER = [
  'day_metrics',
  'derived_panels',
  'prior_night',
  'day_signals',
] as const;

export type JournalLoadedContentSection = (typeof JOURNAL_LOADED_CONTENT_ORDER)[number];

/**
 * Split enabled factor IDs into Nuit dernière vs Signaux du jour.
 * Driven by catalog `window` via `isPriorNightFactor` — not a hardcoded ID list.
 * Custom trackables always land in Signaux.
 */
export function splitJournalFactorIdsForScreen(factorIds: readonly string[]): {
  priorNightIds: string[];
  dayFactorIds: string[];
} {
  const priorNightIds: string[] = [];
  const dayFactorIds: string[] = [];
  for (const id of factorIds) {
    if (isDayContextFactorId(id) && isPriorNightFactor(id)) {
      priorNightIds.push(id);
    } else {
      dayFactorIds.push(id);
    }
  }
  return { priorNightIds, dayFactorIds };
}
