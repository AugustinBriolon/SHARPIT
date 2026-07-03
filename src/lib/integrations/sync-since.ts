import { differenceInCalendarDays, startOfDay, subDays } from 'date-fns';

/** Début de fenêtre : minuit local du jour de `lastSyncAt`, ou fallback si jamais sync. */
export function syncSinceFromLastSync(
  lastSyncAt: Date | null | undefined,
  fallbackDays: number,
): Date {
  if (lastSyncAt) {
    return startOfDay(lastSyncAt);
  }
  return subDays(startOfDay(new Date()), fallbackDays);
}

/** Nombre de jours calendaires couverts (since → aujourd'hui inclus). */
export function syncWindowDays(since: Date): number {
  return Math.max(1, differenceInCalendarDays(startOfDay(new Date()), startOfDay(since)) + 1);
}
