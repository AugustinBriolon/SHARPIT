import type { RecordChange } from '@sharpit/app/lib/training/records/record-types';

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

export type IntegrationId =
  | 'strava'
  | 'garmin'
  | 'withings'
  | 'renpho'
  | 'google'
  | 'myfitnesspal'
  /** Linked from the iPhone app (no account to connect here); see ADR-043 and ADR-054. */
  | 'apple-health';

type ClerkSession = { getToken(): Promise<string | null> };
type ClerkGlobal = { loaded?: boolean; session?: ClerkSession | null };

const CLERK_WAIT_STEP_MS = 50;
const CLERK_WAIT_MAX_MS = 5000;

function resolveApiOrigin(): string {
  if (process.env.NEXT_PUBLIC_API_ORIGIN) {
    return process.env.NEXT_PUBLIC_API_ORIGIN;
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:3001';
  }
  return '';
}

function clerkGlobal(): ClerkGlobal | undefined {
  return (globalThis as { Clerk?: ClerkGlobal }).Clerk;
}

async function sessionToken(): Promise<string | null> {
  for (let waited = 0; waited < CLERK_WAIT_MAX_MS; waited += CLERK_WAIT_STEP_MS) {
    const clerk = clerkGlobal();
    if (clerk?.loaded) {
      try {
        return (await clerk.session?.getToken()) ?? null;
      } catch {
        return null;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, CLERK_WAIT_STEP_MS));
  }
  return null;
}

async function syncFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const origin = resolveApiOrigin();
  const token = await sessionToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const url = origin && path.startsWith('/api/') ? `${origin}${path}` : path;
  return fetch(url, { ...init, headers, credentials: 'omit' });
}

async function parseJson<T>(response: Response, fallbackError: string): Promise<T> {
  const text = await response.text().catch(() => '');
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML 404/500 page from Next.js)
    }
  }
  if (!response.ok) {
    const message =
      (data as { error?: string } | null)?.error ??
      (response.status ? `${fallbackError} (${response.status})` : fallbackError);
    throw new Error(message);
  }
  return data as T;
}

export async function runStravaSync(): Promise<StravaSyncResult> {
  const response = await syncFetch('/api/strava/sync', { method: 'POST' });
  return parseJson(response, 'Synchronisation Strava échouée');
}

export async function runStravaBackfill(): Promise<StravaBackfillResult> {
  const response = await syncFetch('/api/strava/backfill', { method: 'POST' });
  return parseJson(response, 'Récupération Strava échouée');
}

export async function runGarminSync(options?: { full?: boolean }): Promise<GarminSyncResult> {
  const response = await syncFetch('/api/garmin/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options?.full ? { full: true } : {}),
  });
  return parseJson(response, 'Synchronisation Garmin échouée');
}

export async function runRenphoSync(options?: { full?: boolean }): Promise<RenphoSyncResult> {
  const response = await syncFetch('/api/renpho/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options?.full ? { full: true } : {}),
  });
  return parseJson(response, 'Synchronisation Renpho échouée');
}

export async function runWithingsSync(options?: { full?: boolean }): Promise<WithingsSyncResult> {
  const response = await syncFetch('/api/withings/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options?.full ? { full: true } : {}),
  });
  return parseJson(response, 'Synchronisation Withings échouée');
}

export async function runGoogleSync(): Promise<GoogleSyncResult> {
  const response = await syncFetch('/api/google/sync', { method: 'POST' });
  return parseJson(response, 'Synchronisation Google échouée');
}

export type MfpSyncResult = { synced: number; errors: number };

export async function runMfpSync(): Promise<MfpSyncResult> {
  const response = await syncFetch('/api/myfitnesspal/sync', { method: 'POST' });
  return parseJson(response, 'Synchronisation MyFitnessPal échouée');
}

export function stravaBackfillSummary(data: StravaBackfillResult): string {
  const base = `${data.processed} séance(s) traitée(s), ${data.withData} avec données détaillées.`;
  if (data.remaining <= 0) {
    return `${base} Historique complet ✓`;
  }
  if (data.stopped === 'rate_limited') {
    return `${base} Limite Strava atteinte, ${data.remaining} restante(s) — réessaie dans ~15 min.`;
  }
  return `${base} ${data.remaining} restante(s), relance pour continuer.`;
}
