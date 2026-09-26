/**
 * How far back charts and history surfaces should load by default (years).
 * Local preference until a profile field exists.
 */

export const DATA_HISTORY_YEARS = [1, 2, 3, 4, 5] as const;

export type DataHistoryYears = (typeof DATA_HISTORY_YEARS)[number];

export const DEFAULT_DATA_HISTORY_YEARS: DataHistoryYears = 2;

export const DATA_HISTORY_YEARS_STORAGE_KEY = 'sharpit.dataHistoryYears.v1';

export function parseDataHistoryYears(raw: unknown): DataHistoryYears {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if ((DATA_HISTORY_YEARS as readonly number[]).includes(n)) {
    return n as DataHistoryYears;
  }
  return DEFAULT_DATA_HISTORY_YEARS;
}

export function readDataHistoryYearsFromStorage(
  storage: Pick<Storage, 'getItem'> | null | undefined = typeof window === 'undefined'
    ? null
    : window.localStorage,
): DataHistoryYears {
  if (!storage) {
    return DEFAULT_DATA_HISTORY_YEARS;
  }
  try {
    const raw = storage.getItem(DATA_HISTORY_YEARS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DATA_HISTORY_YEARS;
    }
    return parseDataHistoryYears(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_DATA_HISTORY_YEARS;
  }
}

export function writeDataHistoryYearsToStorage(
  years: DataHistoryYears,
  storage: Pick<Storage, 'setItem'> | null | undefined = typeof window === 'undefined'
    ? null
    : window.localStorage,
): void {
  if (!storage) {
    return;
  }
  storage.setItem(DATA_HISTORY_YEARS_STORAGE_KEY, JSON.stringify(years));
}
