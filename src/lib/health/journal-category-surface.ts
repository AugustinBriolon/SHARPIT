/**
 * Journal category chromatic codes — soft icon wells + filter chips.
 * Same dosage as sport-identity: flat fill + readable ink. No purple (design law).
 */

import type { JournalFilterId, JournalTrackableCategory } from '@/lib/health/journal-trackables';

export type JournalCategoryTone = JournalTrackableCategory | 'personnalise';

/** Icon well (prefs list + factor rows). */
export const JOURNAL_CATEGORY_ICON: Record<JournalCategoryTone, string> = {
  automatique: 'bg-primary/15 text-primary',
  sante: 'bg-rose-500/15 text-rose-800 dark:bg-rose-400/20 dark:text-rose-200',
  medicament: 'bg-orange-500/15 text-orange-800 dark:bg-orange-400/20 dark:text-orange-200',
  nutrition: 'bg-amber-500/15 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100',
  complement: 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200',
  sommeil: 'bg-sky-500/15 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200',
  style_vie: 'bg-teal-500/15 text-teal-800 dark:bg-teal-400/20 dark:text-teal-200',
  comportement: 'bg-amber-800/15 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100',
  bien_etre: 'bg-lime-500/15 text-lime-900 dark:bg-lime-400/20 dark:text-lime-100',
  personnalise: 'bg-muted text-foreground',
};

/** Soft section header wash (analysis panels). */
export const JOURNAL_CATEGORY_HEADER: Record<JournalCategoryTone, string> = {
  automatique: 'bg-primary/6',
  sante: 'bg-rose-500/6 dark:bg-rose-400/10',
  medicament: 'bg-orange-500/6 dark:bg-orange-400/10',
  nutrition: 'bg-amber-500/6 dark:bg-amber-400/10',
  complement: 'bg-emerald-500/6 dark:bg-emerald-400/10',
  sommeil: 'bg-sky-500/6 dark:bg-sky-400/10',
  style_vie: 'bg-teal-500/6 dark:bg-teal-400/10',
  comportement: 'bg-amber-800/6 dark:bg-amber-500/10',
  bien_etre: 'bg-lime-500/6 dark:bg-lime-400/10',
  personnalise: 'bg-muted/40',
};

type FilterChipTone = { idle: string; active: string };

const MUTED_IDLE = 'bg-muted text-muted-foreground hover:text-foreground';

export const JOURNAL_FILTER_CHIP: Record<JournalFilterId, FilterChipTone> = {
  all: {
    idle: MUTED_IDLE,
    active: 'bg-foreground text-background',
  },
  automatique: {
    idle: 'bg-primary/10 text-primary hover:bg-primary/15',
    active: 'bg-primary text-primary-foreground',
  },
  sante: {
    idle: 'bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:text-rose-200',
    active: 'bg-rose-600 text-white dark:bg-rose-500',
  },
  medicament: {
    idle: 'bg-orange-500/10 text-orange-800 hover:bg-orange-500/15 dark:text-orange-200',
    active: 'bg-orange-600 text-white dark:bg-orange-500',
  },
  nutrition: {
    idle: 'bg-amber-500/10 text-amber-900 hover:bg-amber-500/15 dark:text-amber-100',
    active: 'bg-amber-600 text-white dark:bg-amber-500',
  },
  complement: {
    idle: 'bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-200',
    active: 'bg-emerald-600 text-white dark:bg-emerald-500',
  },
  sommeil: {
    idle: 'bg-sky-500/10 text-sky-900 hover:bg-sky-500/15 dark:text-sky-200',
    active: 'bg-sky-600 text-white dark:bg-sky-500',
  },
  style_vie: {
    idle: 'bg-teal-500/10 text-teal-800 hover:bg-teal-500/15 dark:text-teal-200',
    active: 'bg-teal-600 text-white dark:bg-teal-500',
  },
  comportement: {
    idle: 'bg-amber-800/10 text-amber-950 hover:bg-amber-800/15 dark:text-amber-100',
    active: 'bg-amber-900 text-white dark:bg-amber-600',
  },
  bien_etre: {
    idle: 'bg-lime-500/10 text-lime-900 hover:bg-lime-500/15 dark:text-lime-100',
    active: 'bg-lime-600 text-white dark:bg-lime-500 dark:text-lime-950',
  },
  personnalise: {
    idle: MUTED_IDLE,
    active: 'bg-foreground text-background',
  },
};

/** Day-metric wells keep a readable cue even when catalog category is bien_etre. */
export const JOURNAL_METRIC_ICON = {
  caffeine: 'bg-amber-500/15 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100',
  mood: 'bg-primary/15 text-primary',
  hydration: 'bg-sky-500/15 text-sky-900 dark:bg-sky-400/20 dark:text-sky-200',
} as const;

export function journalCategoryIcon(category: JournalCategoryTone | undefined): string {
  return JOURNAL_CATEGORY_ICON[category ?? 'personnalise'];
}
