import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyDayJournalEntry } from './day-journal';
import {
  DAY_JOURNAL_PERSIST_DEBOUNCE_MS,
  flushDayJournalPersist,
  resetDayJournalPersistForTests,
  scheduleDayJournalPersist,
  setDayJournalPersistImplForTests,
} from './day-journal-persist';

describe('day-journal-persist', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDayJournalPersistForTests();
  });

  afterEach(() => {
    resetDayJournalPersistForTests();
    vi.useRealTimers();
  });

  it('coalesces rapid edits into a single server write', async () => {
    const persist = vi.fn(async (entry: ReturnType<typeof emptyDayJournalEntry>) => entry);
    setDayJournalPersistImplForTests(persist);

    const base = emptyDayJournalEntry('2026-09-09');
    scheduleDayJournalPersist({ ...base, caffeineMg: 40 });
    scheduleDayJournalPersist({ ...base, caffeineMg: 80 });
    scheduleDayJournalPersist({ ...base, caffeineMg: 120 });

    expect(persist).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DAY_JOURNAL_PERSIST_DEBOUNCE_MS);
    await Promise.resolve();

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0]?.[0]?.caffeineMg).toBe(120);
  });

  it('flushes immediately on explicit flush', async () => {
    const persist = vi.fn(async (entry: ReturnType<typeof emptyDayJournalEntry>) => entry);
    setDayJournalPersistImplForTests(persist);

    const base = emptyDayJournalEntry('2026-09-09');
    scheduleDayJournalPersist({ ...base, hydrationMl: 500 });
    expect(persist).not.toHaveBeenCalled();

    await flushDayJournalPersist('2026-09-09');
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0]?.[0]?.hydrationMl).toBe(500);
  });
});
