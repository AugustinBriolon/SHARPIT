import type { QueryClient } from '@tanstack/react-query';
import { isSet } from '@/lib/util/value';
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
  /** When true, `analysis` / `analyzedAt` (including null) overwrite existing values. */
  clearAnalysis?: boolean;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === undefined || value === null) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function coalesceField<T>(
  seedValue: T | null | undefined,
  baseValue: T | null | undefined,
): T | null {
  if (isSet(seedValue)) {
    return seedValue;
  }
  if (isSet(baseValue)) {
    return baseValue;
  }
  return seedValue ?? baseValue ?? null;
}

function resolveAnalysisFields(
  seed: PlannedSessionCacheSeed,
  base: ClientPlannedSession,
  seededAnalyzedAt: Date | null,
): Pick<ClientPlannedSession, 'analysis' | 'analyzedAt'> {
  if (seed.clearAnalysis) {
    return {
      analysis: seed.analysis ?? null,
      analyzedAt: seededAnalyzedAt,
    };
  }
  return {
    analysis: coalesceField(seed.analysis, base.analysis),
    analyzedAt: coalesceField(seededAnalyzedAt, base.analyzedAt ?? null),
  };
}

function mergeSeed(
  existing: ClientPlannedSession | undefined,
  seed: PlannedSessionCacheSeed,
): ClientPlannedSession {
  const base = existing ?? ({ id: seed.id } as ClientPlannedSession);
  const seededDate = toDate(seed.date);
  const seededAnalyzedAt = toDate(seed.analyzedAt);
  const activityId = coalesceField(seed.activityId, base.activityId);
  const { analysis, analyzedAt } = resolveAnalysisFields(seed, base, seededAnalyzedAt);

  return {
    ...base,
    id: seed.id,
    title: coalesceField(seed.title, base.title),
    description: coalesceField(seed.description, base.description),
    type: seed.type ?? base.type,
    date: seededDate ?? base.date ?? new Date(),
    durationMin: coalesceField(seed.durationMin, base.durationMin),
    intensity: coalesceField(seed.intensity, base.intensity),
    analysis,
    analyzedAt,
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
