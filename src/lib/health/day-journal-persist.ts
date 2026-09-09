/**
 * Debounced journal → DB writes.
 * UI + localStorage stay Instant; network coalesces to the latest entry per day.
 */

import {
  type DayJournalEntry,
  persistDayJournalEntryToServer,
  readDayJournalStore,
  upsertDayJournalEntry,
  writeDayJournalStore,
} from '@/lib/health/day-journal';

export const DAY_JOURNAL_PERSIST_DEBOUNCE_MS = 600;

export type DayJournalPersistFn = (
  entry: DayJournalEntry,
  signal?: AbortSignal,
) => Promise<DayJournalEntry | null>;

type PendingPersist = {
  entry: DayJournalEntry;
  timer: ReturnType<typeof setTimeout> | null;
  abort: AbortController | null;
  inFlight: Promise<void> | null;
};

const pendingByDay = new Map<string, PendingPersist>();

let lifecycleInstalled = false;
let persistImpl: DayJournalPersistFn = (entry, signal) =>
  persistDayJournalEntryToServer(entry, signal);

/** Test seam. */
export function setDayJournalPersistImplForTests(next: DayJournalPersistFn | null): void {
  persistImpl = next ?? ((entry, signal) => persistDayJournalEntryToServer(entry, signal));
}

/** Test seam. */
export function resetDayJournalPersistForTests(): void {
  for (const pending of pendingByDay.values()) {
    if (pending.timer) {
      clearTimeout(pending.timer);
    }
    pending.abort?.abort();
  }
  pendingByDay.clear();
  persistImpl = (entry, signal) => persistDayJournalEntryToServer(entry, signal);
  lifecycleInstalled = false;
}

export function writeDayJournalEntryLocal(entry: DayJournalEntry): DayJournalEntry {
  const withStamp: DayJournalEntry = {
    ...entry,
    updatedAt: new Date().toISOString(),
  };
  writeDayJournalStore(upsertDayJournalEntry(readDayJournalStore(), withStamp));
  return withStamp;
}

async function runPersist(trainingDayId: string): Promise<void> {
  const pending = pendingByDay.get(trainingDayId);
  if (!pending) {
    return;
  }
  if (pending.timer) {
    clearTimeout(pending.timer);
    pending.timer = null;
  }
  pending.abort?.abort();
  const abort = new AbortController();
  pending.abort = abort;
  const entrySnapshot = pending.entry;

  const work = (async () => {
    try {
      const remote = await persistImpl(entrySnapshot, abort.signal);
      if (abort.signal.aborted) {
        return;
      }
      if (remote) {
        writeDayJournalStore(upsertDayJournalEntry(readDayJournalStore(), remote));
      }
    } catch {
      // Keep local cache; a later schedule/flush will retry.
    }
  })().finally(() => {
    const current = pendingByDay.get(trainingDayId);
    if (!current || current.inFlight !== work) {
      return;
    }
    current.inFlight = null;
    current.abort = null;
    // Another edit landed while we were in flight — keep the map entry.
    if (!current.timer && current.entry === entrySnapshot) {
      pendingByDay.delete(trainingDayId);
    }
  });

  pending.inFlight = work;
  await work;

  // If entry changed during flight, schedule was responsible; if only timer cleared
  // and entry differs, flush again immediately.
  const after = pendingByDay.get(trainingDayId);
  if (after && !after.timer && !after.inFlight && after.entry !== entrySnapshot) {
    await runPersist(trainingDayId);
  }
}

/**
 * Optimistic local write + debounced server PUT (latest entry wins per day).
 */
export function scheduleDayJournalPersist(
  entry: DayJournalEntry,
  debounceMs: number = DAY_JOURNAL_PERSIST_DEBOUNCE_MS,
): DayJournalEntry {
  const local = writeDayJournalEntryLocal(entry);
  installDayJournalPersistLifecycle();

  const pending = pendingByDay.get(local.trainingDayId) ?? {
    entry: local,
    timer: null,
    abort: null,
    inFlight: null,
  };
  pending.entry = local;
  if (pending.timer) {
    clearTimeout(pending.timer);
  }
  pendingByDay.set(local.trainingDayId, pending);

  pending.timer = setTimeout(() => {
    void runPersist(local.trainingDayId);
  }, debounceMs);

  return local;
}

/** Flush one day (or all pending). Call on leave / hide. */
export async function flushDayJournalPersist(trainingDayId?: string): Promise<void> {
  const ids = trainingDayId ? [trainingDayId] : [...pendingByDay.keys()];
  for (const id of ids) {
    const pending = pendingByDay.get(id);
    if (!pending) {
      continue;
    }
    if (pending.timer) {
      clearTimeout(pending.timer);
      pending.timer = null;
    }
    if (pending.inFlight) {
      await pending.inFlight;
    }
    if (pendingByDay.has(id)) {
      await runPersist(id);
    }
  }
}

export function installDayJournalPersistLifecycle(): void {
  if (typeof window === 'undefined' || lifecycleInstalled) {
    return;
  }
  lifecycleInstalled = true;

  const flushAll = () => {
    void flushDayJournalPersist();
  };

  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAll();
    }
  });
}
