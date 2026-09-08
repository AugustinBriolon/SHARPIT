/**
 * Local day-journal entries — subjective context for coaching reads.
 * Persistence is athlete-device local until a Core observation path exists.
 */

import {
  DAY_CONTEXT_FACTOR_IDS,
  type DayContextFactorId,
  isDayContextFactorId,
  isPriorNightFactor,
} from '@/lib/health/day-context-factors';

export type DayJournalFactorState = 'unset' | 'no' | 'yes';

export type DayJournalEntry = {
  trainingDayId: string;
  factors: Partial<Record<DayContextFactorId, DayJournalFactorState>>;
  moodLabel: string | null;
  hydrationMl: number | null;
  caffeineMg: number | null;
  updatedAt: string;
};

export const DAY_JOURNAL_STORAGE_KEY = 'sharpit.dayJournal.v1';

export type DayJournalStore = {
  version: 1;
  byDay: Record<string, DayJournalEntry>;
};

export function emptyDayJournalEntry(trainingDayId: string): DayJournalEntry {
  return {
    trainingDayId,
    factors: {},
    moodLabel: null,
    hydrationMl: null,
    caffeineMg: null,
    updatedAt: new Date().toISOString(),
  };
}

export function parseDayJournalStore(raw: unknown): DayJournalStore {
  if (!raw || typeof raw !== 'object') {
    return { version: 1, byDay: {} };
  }
  const record = raw as { version?: unknown; byDay?: unknown };
  if (record.version !== 1 || !record.byDay || typeof record.byDay !== 'object') {
    return { version: 1, byDay: {} };
  }
  const byDay: Record<string, DayJournalEntry> = {};
  for (const [dayId, value] of Object.entries(record.byDay as Record<string, unknown>)) {
    const parsed = parseDayJournalEntry(dayId, value);
    if (parsed) {
      byDay[dayId] = parsed;
    }
  }
  return { version: 1, byDay };
}

function isDayJournalFactorState(value: unknown): value is DayJournalFactorState {
  return value === 'unset' || value === 'no' || value === 'yes';
}

function parseDayJournalFactors(
  raw: unknown,
): Partial<Record<DayContextFactorId, DayJournalFactorState>> {
  const factors: Partial<Record<DayContextFactorId, DayJournalFactorState>> = {};
  if (!raw || typeof raw !== 'object') {
    return factors;
  }
  for (const [key, state] of Object.entries(raw as Record<string, unknown>)) {
    if (!isDayContextFactorId(key) || !isDayJournalFactorState(state)) {
      continue;
    }
    factors[key] = state;
  }
  return factors;
}

function parseOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function parseDayJournalUpdatedAt(value: unknown): string {
  return typeof value === 'string' ? value : new Date().toISOString();
}

function parseDayJournalEntry(dayId: string, raw: unknown): DayJournalEntry | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  return {
    trainingDayId: dayId,
    factors: parseDayJournalFactors(record.factors),
    moodLabel: parseOptionalString(record.moodLabel),
    hydrationMl: parseOptionalNumber(record.hydrationMl),
    caffeineMg: parseOptionalNumber(record.caffeineMg),
    updatedAt: parseDayJournalUpdatedAt(record.updatedAt),
  };
}

export function readDayJournalStore(
  storage: Pick<Storage, 'getItem'> | null | undefined = typeof window === 'undefined'
    ? null
    : window.localStorage,
): DayJournalStore {
  if (!storage) {
    return { version: 1, byDay: {} };
  }
  try {
    const raw = storage.getItem(DAY_JOURNAL_STORAGE_KEY);
    if (!raw) {
      return { version: 1, byDay: {} };
    }
    return parseDayJournalStore(JSON.parse(raw) as unknown);
  } catch {
    return { version: 1, byDay: {} };
  }
}

export function writeDayJournalStore(
  store: DayJournalStore,
  storage: Pick<Storage, 'setItem'> | null | undefined = typeof window === 'undefined'
    ? null
    : window.localStorage,
): void {
  if (!storage) {
    return;
  }
  storage.setItem(DAY_JOURNAL_STORAGE_KEY, JSON.stringify(store));
}

export function upsertDayJournalEntry(
  store: DayJournalStore,
  entry: DayJournalEntry,
): DayJournalStore {
  return {
    version: 1,
    byDay: {
      ...store.byDay,
      [entry.trainingDayId]: {
        ...entry,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export function cycleFactorState(
  current: DayJournalFactorState | undefined,
): DayJournalFactorState {
  if (!current || current === 'unset') {
    return 'yes';
  }
  if (current === 'yes') {
    return 'no';
  }
  return 'unset';
}

/** Factors shown as ternary toggles on the journal page (day signals only). */
export const JOURNAL_TOGGLE_FACTOR_IDS: readonly DayContextFactorId[] =
  DAY_CONTEXT_FACTOR_IDS.filter(
    (id) => id !== 'mood_low' && id !== 'hydration_low' && id !== 'coffee',
  );

export const JOURNAL_PRIOR_NIGHT_FACTOR_IDS: readonly DayContextFactorId[] =
  JOURNAL_TOGGLE_FACTOR_IDS.filter((id) => isPriorNightFactor(id));

export const JOURNAL_DAYTIME_FACTOR_IDS: readonly DayContextFactorId[] =
  JOURNAL_TOGGLE_FACTOR_IDS.filter((id) => !isPriorNightFactor(id));
