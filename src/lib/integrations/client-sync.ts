import type { RecordChange } from '@/lib/training/records';

export type StravaSyncResult = {
  imported: number;
  skipped: number;
  fetched: number;
  recordChanges?: RecordChange[];
};

export type StravaBackfillResult = {
  processed: number;
  withData: number;
  remaining: number;
  stopped?: string;
  recordChanges?: RecordChange[];
};

export type GarminSyncResult = {
  updated: number;
  days: number;
  activities: {
    imported: number;
    merged: number;
    updated: number;
    skipped: number;
  };
  recordChanges?: RecordChange[];
};

export type RenphoSyncResult = {
  imported: number;
  updated: number;
  days: number;
};

export type WithingsSyncResult = {
  imported: number;
  updated: number;
  days: number;
};

export type GoogleSyncResult = {
  pushed: number;
  updated: number;
  unlinked: number;
};

export type IntegrationId = 'strava' | 'garmin' | 'withings' | 'renpho' | 'google';

async function parseJson<T>(response: Response, fallbackError: string): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? fallbackError);
  }
  return data as T;
}

export async function runStravaSync(): Promise<StravaSyncResult> {
  const response = await fetch('/api/strava/sync', { method: 'POST' });
  return parseJson(response, 'Synchronisation Strava échouée');
}

export async function runStravaBackfill(): Promise<StravaBackfillResult> {
  const response = await fetch('/api/strava/backfill', { method: 'POST' });
  return parseJson(response, 'Récupération Strava échouée');
}

export async function runGarminSync(options?: { full?: boolean }): Promise<GarminSyncResult> {
  const response = await fetch('/api/garmin/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options?.full ? { full: true } : {}),
  });
  return parseJson(response, 'Synchronisation Garmin échouée');
}

export async function runRenphoSync(options?: { full?: boolean }): Promise<RenphoSyncResult> {
  const response = await fetch('/api/renpho/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options?.full ? { full: true } : {}),
  });
  return parseJson(response, 'Synchronisation Renpho échouée');
}

export async function runWithingsSync(options?: { full?: boolean }): Promise<WithingsSyncResult> {
  const response = await fetch('/api/withings/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options?.full ? { full: true } : {}),
  });
  return parseJson(response, 'Synchronisation Withings échouée');
}

export async function runGoogleSync(): Promise<GoogleSyncResult> {
  const response = await fetch('/api/google/sync', { method: 'POST' });
  return parseJson(response, 'Synchronisation Google échouée');
}

export function stravaBackfillSummary(data: StravaBackfillResult): string {
  const base = `${data.processed} séance(s) traitée(s), ${data.withData} avec données détaillées.`;
  if (data.remaining <= 0) return `${base} Historique complet ✓`;
  if (data.stopped === 'rate_limited') {
    return `${base} Limite Strava atteinte, ${data.remaining} restante(s) — réessaie dans ~15 min.`;
  }
  return `${base} ${data.remaining} restante(s), relance pour continuer.`;
}
