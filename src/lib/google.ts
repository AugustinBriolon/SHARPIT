/**
 * Accès Google Calendar via l'API REST (sans dépendance lourde, comme Strava).
 *
 * - OAuth 2.0 "Web application" (access_type=offline pour obtenir un refresh_token)
 * - Lecture des calendriers + free/busy (pour caser les séances dans l'agenda)
 * - CRUD d'événements dans le calendrier cible (ex: calendrier "SPORT")
 */

const GOOGLE_OAUTH_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/**
 * Scope unique "calendar" (lecture + écriture) : couvre la liste des
 * calendriers, le free/busy et le CRUD d'événements. `openid email` permet
 * d'afficher le compte connecté.
 */
export const GOOGLE_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar'].join(
  ' ',
);

export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** URL de callback OAuth, déduite du host courant si GOOGLE_REDIRECT_URI est absent. */
export function getGoogleRedirectUri(origin?: string) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  if (origin) {
    return `${origin}/api/google/callback`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/google/callback`;
  }
  return 'http://localhost:3000/api/google/callback';
}

function getGoogleConfig(origin?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET doivent être définis dans .env');
  }
  return { clientId, clientSecret, redirectUri: getGoogleRedirectUri(origin) };
}

export function buildAuthorizeUrl(state: string, origin?: string) {
  const { clientId, redirectUri } = getGoogleConfig(origin);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${GOOGLE_OAUTH_AUTH}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
  id_token?: string;
}

/** Extrait l'email du compte depuis l'id_token (JWT) sans appel réseau supplémentaire. */
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const [, payload] = idToken.split('.');
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const data = JSON.parse(json) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function exchangeCodeForToken(
  code: string,
  origin?: string,
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig(origin);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    let detail = body;
    try {
      const json = JSON.parse(body) as { error?: string; error_description?: string };
      detail = [json.error, json.error_description].filter(Boolean).join(' — ');
    } catch {
      // corps non-JSON
    }
    throw new Error(
      `Échange du code Google échoué (${response.status})${detail ? ` : ${detail}` : ''} [redirect_uri=${redirectUri}]`,
    );
  }
  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) {
    throw new Error(`Rafraîchissement du token Google échoué (${response.status})`);
  }
  return response.json();
}

// ---- API Calendar ----

async function calendarFetch(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Google Calendar API ${path} → ${response.status} ${text}`.trim());
  }
  if (response.status === 204) return null;
  return response.json();
}

export interface GoogleCalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string;
}

export async function listCalendars(accessToken: string): Promise<GoogleCalendarListItem[]> {
  const data = await calendarFetch(
    accessToken,
    '/users/me/calendarList?minAccessRole=reader&maxResults=250',
  );
  return (data?.items ?? []) as GoogleCalendarListItem[];
}

export interface BusyInterval {
  start: string;
  end: string;
}

/** Renvoie les intervalles occupés, agrégés sur les calendriers demandés. */
export async function getFreeBusy(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
  calendarIds: string[],
): Promise<BusyInterval[]> {
  if (calendarIds.length === 0) return [];
  const data = await calendarFetch(accessToken, '/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: calendarIds.map((id) => ({ id })),
    }),
  });
  const calendars = (data?.calendars ?? {}) as Record<string, { busy?: BusyInterval[] }>;
  const busy: BusyInterval[] = [];
  for (const cal of Object.values(calendars)) {
    if (cal.busy) busy.push(...cal.busy);
  }
  return busy.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export interface GoogleEventInput {
  summary: string;
  description?: string | null;
  startDateTime: string; // ISO local sans Z, ex "2026-07-01T07:00:00"
  endDateTime: string;
  timeZone: string;
}

export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  htmlLink?: string;
}

function eventBody(input: GoogleEventInput) {
  return {
    summary: input.summary,
    description: input.description ?? undefined,
    start: { dateTime: input.startDateTime, timeZone: input.timeZone },
    end: { dateTime: input.endDateTime, timeZone: input.timeZone },
  };
}

export async function createEvent(
  accessToken: string,
  calendarId: string,
  input: GoogleEventInput,
): Promise<GoogleEvent> {
  return calendarFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(eventBody(input)),
  });
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  input: GoogleEventInput,
): Promise<GoogleEvent> {
  return calendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PATCH', body: JSON.stringify(eventBody(input)) },
  );
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

export async function listEvents(
  accessToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const data = await calendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
  );
  return (data?.items ?? []) as GoogleEvent[];
}
