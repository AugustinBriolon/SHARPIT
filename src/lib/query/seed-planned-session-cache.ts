import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { ClientPlannedSession } from '@/lib/query/types';

/**
 * Lightweight fields we may already have (e.g. activity detail chip) when the
 * planned-sessions list cache is cold or incomplete.
 */
export type PlannedSessionCacheSeed = {
  id: string;
  title?: string | null;
  description?: string | null;
  type?: ClientPlannedSession['type'];
  date?: Date | string;
  durationMin?: number | null;
  intensity?: ClientPlannedSession['intensity'];
  analysis?: ClientPlannedSession['analysis'];
  analyzedAt?: Date | string | null;
  activityId?: string | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function coalesceField<T>(
  seedValue: T | null | undefined,
  baseValue: T | null | undefined,
): T | null {
  if (seedValue !== undefined && seedValue !== null) {
    return seedValue;
  }
  if (baseValue !== undefined && baseValue !== null) {
    return baseValue;
  }
  return seedValue ?? baseValue ?? null;
}

function mergeSeed(
  existing: ClientPlannedSession | undefined,
  seed: PlannedSessionCacheSeed,
): ClientPlannedSession {
  const base = existing ?? ({ id: seed.id } as ClientPlannedSession);
  const seededDate = toDate(seed.date);
  const seededAnalyzedAt = toDate(seed.analyzedAt);
  const activityId = coalesceField(seed.activityId, base.activityId);

  return {
    ...base,
    id: seed.id,
    title: coalesceField(seed.title, base.title),
    description: coalesceField(seed.description, base.description),
    type: seed.type ?? base.type,
    date: seededDate ?? base.date ?? new Date(),
    durationMin: coalesceField(seed.durationMin, base.durationMin),
    intensity: coalesceField(seed.intensity, base.intensity),
    analysis: coalesceField(seed.analysis, base.analysis),
    analyzedAt: coalesceField(seededAnalyzedAt, base.analyzedAt ?? null),
    activityId,
    // Opening from a completed activity means the session is already linked.
    completed: Boolean(activityId ?? base.activity ?? base.completed),
  } as ClientPlannedSession;
}

/** Instant-seed / patch plannedSessions so the modal can render description immediately. */
export function seedPlannedSessionIntoCache(
  queryClient: QueryClient,
  seed: PlannedSessionCacheSeed,
): void {
  queryClient.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, (prev) => {
    if (!prev) {
      return [mergeSeed(undefined, seed)];
    }
    const index = prev.findIndex((session) => session.id === seed.id);
    if (index < 0) {
      return [...prev, mergeSeed(undefined, seed)];
    }
    const next = prev.slice();
    next[index] = mergeSeed(prev[index], seed);
    return next;
  });
}
