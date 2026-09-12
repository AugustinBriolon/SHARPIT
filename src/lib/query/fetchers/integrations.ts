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

export async function connectRenpho(body: {
  email: FormDataEntryValue | null;
  password: FormDataEntryValue | null;
  dataClass?: DataClassId | null;
}): Promise<void> {
  await sendJson('/api/renpho/connect', 'POST', body);
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

export async function disconnectGarmin(): Promise<void> {
  await sendJson('/api/garmin/disconnect', 'POST');
}

export async function disconnectStrava(): Promise<void> {
  await sendJson('/api/strava/disconnect', 'POST');
}

export async function disconnectMyFitnessPal(): Promise<void> {
  await sendJson('/api/myfitnesspal/disconnect', 'POST');
}

export async function disconnectRenpho(): Promise<void> {
  await sendJson('/api/renpho/disconnect', 'POST');
}

export async function disconnectWithings(): Promise<void> {
  await sendJson('/api/withings/disconnect', 'POST');
}

export async function disconnectGoogle(): Promise<void> {
  await sendJson('/api/google/disconnect', 'POST');
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
