/**
 * Client ledger of athlete-validated PlanAdapter applies — fuels Suivi d’avancées.
 * Presentation-only; Core frozen. Complements same-day adapt-applied-ack (#105).
 */

import { localDayKey } from '@/lib/plan/adapt-applied-ack';

const STORAGE_KEY = 'sharpit:coaching-advancement-ledger';
const CHANGE_EVENT = 'sharpit:coaching-advancement-ledger';
const MAX_ENTRIES = 12;

export type CoachingAdvancementEntry = {
  /** ISO timestamp of athlete validation. */
  appliedAt: string;
  /** Local calendar day `YYYY-MM-DD` when applied. */
  dayKey: string;
  goalLabel: string | null;
  changeCount: number;
};

function isEntryShape(value: unknown): value is CoachingAdvancementEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.appliedAt === 'string' &&
    typeof record.dayKey === 'string' &&
    (record.goalLabel === null || typeof record.goalLabel === 'string') &&
    typeof record.changeCount === 'number'
  );
}

function isLedgerShape(value: unknown): value is CoachingAdvancementEntry[] {
  return Array.isArray(value) && value.every(isEntryShape);
}

export function buildCoachingAdvancementEntry(input: {
  goalLabel: string | null;
  changeCount: number;
  /** Required — never default to `new Date()` (blocks Next prerender). */
  now: Date;
}): CoachingAdvancementEntry {
  return {
    appliedAt: input.now.toISOString(),
    dayKey: localDayKey(input.now),
    goalLabel: input.goalLabel?.trim() || null,
    changeCount: Math.max(0, input.changeCount),
  };
}

/** Newest-first; cap length. */
export function appendCoachingAdvancementEntry(
  entries: readonly CoachingAdvancementEntry[],
  entry: CoachingAdvancementEntry,
): CoachingAdvancementEntry[] {
  return [entry, ...entries].slice(0, MAX_ENTRIES);
}

/** Sum of adapted session counts on entries whose dayKey falls in `[fromDayKey, toDayKey]`. */
export function sumAdaptedSessionsInRange(
  entries: readonly CoachingAdvancementEntry[],
  fromDayKey: string,
  toDayKey: string,
): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.dayKey >= fromDayKey && entry.dayKey <= toDayKey) {
      total += entry.changeCount;
    }
  }
  return total;
}

/** Local Monday `YYYY-MM-DD` for the week containing `now` (weekStartsOn: 1). */
export function localWeekStartDayKey(now: Date): string {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  return localDayKey(monday);
}

export function adaptedSessionsThisWeek(
  entries: readonly CoachingAdvancementEntry[],
  now: Date,
): number {
  return sumAdaptedSessionsInRange(entries, localWeekStartDayKey(now), localDayKey(now));
}

export function readCoachingAdvancementLedger(): CoachingAdvancementEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return isLedgerShape(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Stable snapshot for `useSyncExternalStore`. */
export function getCoachingAdvancementLedgerSnapshot(): string {
  const entries = readCoachingAdvancementLedger();
  return entries.length > 0 ? JSON.stringify(entries) : '';
}

export function recordCoachingAdvancementEntry(input: {
  goalLabel: string | null;
  changeCount: number;
  now: Date;
}): CoachingAdvancementEntry {
  const entry = buildCoachingAdvancementEntry(input);
  if (typeof window !== 'undefined') {
    const next = appendCoachingAdvancementEntry(readCoachingAdvancementLedger(), entry);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return entry;
}

export function clearCoachingAdvancementLedger(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeCoachingAdvancementLedger(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

export function parseCoachingAdvancementLedgerSnapshot(
  snapshot: string,
): CoachingAdvancementEntry[] {
  if (!snapshot) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return isLedgerShape(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
