/**
 * Integration connect / disconnect / source-prefs client fetchers.
 * SSO Garmin keeps a named wrapper (special browser ticket contract).
 */

import type { DataClassId } from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';
import { sendJson } from '@/lib/query/send-json';
import { fetchJson } from './shared';

export async function fetchIntegrationSourcePrefs(): Promise<IntegrationSourcePrefs | null> {
  try {
    const data = await fetchJson<{ prefs: IntegrationSourcePrefs }>(
      '/api/integrations/source-prefs',
    );
    return data.prefs;
  } catch {
    return null;
  }
}

export async function patchIntegrationSourcePrefs(body: {
  action: 'enable' | 'disable' | 'setPrimary';
  dataClass: DataClassId;
  provider: IntegrationId;
}): Promise<IntegrationSourcePrefs | null> {
  try {
    const data = (await sendJson('/api/integrations/source-prefs', 'PATCH', body)) as {
      prefs: IntegrationSourcePrefs;
    };
    return data.prefs;
  } catch {
    return null;
  }
}

/** Hub prefs PATCH that surfaces API errors (settings UI). */
export async function patchIntegrationSourcePrefsStrict(body: unknown): Promise<{
  prefs: IntegrationSourcePrefs;
}> {
  return sendJson('/api/integrations/source-prefs', 'PATCH', body) as Promise<{
    prefs: IntegrationSourcePrefs;
  }>;
}

export type RenphoConnectResult = {
  success?: boolean;
  sync?: { imported: number; updated: number; days?: number };
};

export async function connectRenpho(body: {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
  dataClass?: DataClassId | null;
}): Promise<RenphoConnectResult> {
  return sendJson('/api/renpho/connect', 'POST', body) as Promise<RenphoConnectResult>;
}

export async function connectMyFitnessPal(body: {
  sessionToken: FormDataEntryValue | null;
  dataClass?: DataClassId | null;
}): Promise<void> {
  await sendJson('/api/myfitnesspal/connect', 'POST', body);
}

export async function importGarminTokens(tokenStore: string): Promise<void> {
  await sendJson('/api/garmin/import-tokens', 'POST', { tokenStore });
}

/**
 * Soft-ok disconnect: pre-P5 `fetch` ignored `!ok` and still refreshed.
 * Call sites use try/finally without catch — swallow sendJson throws.
 */
async function softDisconnect(url: string): Promise<void> {
  try {
    await sendJson(url, 'POST');
  } catch {
    // ignore — UI still refreshes connection status
  }
}

export async function disconnectGarmin(): Promise<void> {
  await softDisconnect('/api/garmin/disconnect');
}

export async function disconnectStrava(): Promise<void> {
  await softDisconnect('/api/strava/disconnect');
}

export async function disconnectMyFitnessPal(): Promise<void> {
  await softDisconnect('/api/myfitnesspal/disconnect');
}

export async function disconnectRenpho(): Promise<void> {
  await softDisconnect('/api/renpho/disconnect');
}

export async function disconnectWithings(): Promise<void> {
  await softDisconnect('/api/withings/disconnect');
}

export async function disconnectGoogle(): Promise<void> {
  await softDisconnect('/api/google/disconnect');
}

export async function selectGoogleCalendar(body: unknown): Promise<void> {
  await sendJson('/api/google/select-calendar', 'POST', body);
}

export type GarminSsoTicketResult =
  { ok: true; redirectTo: string } | { ok: false; status: string | undefined };

/** Browser SSO ticket exchange — keep fetch here (not in components). */
export async function exchangeGarminSsoTicket(ticket: string): Promise<GarminSsoTicketResult> {
  const response = await fetch('/api/garmin/sso-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket }),
  });
  const data = (await response.json().catch(() => null)) as {
    redirectTo?: string;
    status?: string;
  } | null;
  if (!response.ok || !data?.redirectTo) {
    return { ok: false, status: data?.status };
  }
  return { ok: true, redirectTo: data.redirectTo };
}

export type GarminWorkoutFromActivityResult = {
  workoutName?: string;
  mappedCount?: number;
  skipped?: Array<{ exercise: string }>;
  scheduledDate?: string | null;
};

export async function createGarminWorkoutFromActivity(
  body: unknown,
): Promise<GarminWorkoutFromActivityResult> {
  return sendJson(
    '/api/garmin/workouts/from-activity',
    'POST',
    body,
  ) as Promise<GarminWorkoutFromActivityResult>;
}
