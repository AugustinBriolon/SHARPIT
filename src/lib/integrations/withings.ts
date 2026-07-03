const WITHINGS_OAUTH_AUTHORIZE = 'https://account.withings.com/oauth2_user/authorize2';
const WITHINGS_OAUTH_TOKEN = 'https://wbsapi.withings.net/v2/oauth2';
const WITHINGS_MEASURE = 'https://wbsapi.withings.net/measure';
const WITHINGS_HEART = 'https://wbsapi.withings.net/v2/heart';

export const WITHINGS_SCOPE = 'user.info,user.metrics';

export function getWithingsRedirectUri(origin?: string) {
  if (process.env.WITHINGS_REDIRECT_URI) {
    return process.env.WITHINGS_REDIRECT_URI;
  }
  if (origin) {
    return `${origin}/api/withings/callback`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/withings/callback`;
  }
  return 'http://localhost:3000/api/withings/callback';
}

export function getWithingsConfig(origin?: string) {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET;
  const redirectUri = getWithingsRedirectUri(origin);

  if (!clientId || !clientSecret) {
    throw new Error('WITHINGS_CLIENT_ID et WITHINGS_CLIENT_SECRET doivent être définis dans .env');
  }

  return { clientId, clientSecret, redirectUri };
}

export function isWithingsConfigured() {
  return Boolean(process.env.WITHINGS_CLIENT_ID && process.env.WITHINGS_CLIENT_SECRET);
}

export function buildWithingsAuthorizeUrl(state: string, origin?: string) {
  const { clientId, redirectUri } = getWithingsConfig(origin);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    state,
    scope: WITHINGS_SCOPE,
    redirect_uri: redirectUri,
  });
  return `${WITHINGS_OAUTH_AUTHORIZE}?${params.toString()}`;
}

export interface WithingsTokenBody {
  userid: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
}

interface WithingsApiResponse<T> {
  status: number;
  body?: T;
  error?: string;
}

async function withingsFormPost<T>(
  url: string,
  params: Record<string, string>,
  accessToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: new URLSearchParams(params),
  });

  const json = (await response.json()) as WithingsApiResponse<T>;
  if (!response.ok || json.status !== 0 || !json.body) {
    throw new Error(
      json.error ?? `Withings API error (HTTP ${response.status}, status ${json.status})`,
    );
  }
  return json.body;
}

export async function exchangeWithingsCode(
  code: string,
  redirectUri?: string,
): Promise<WithingsTokenBody> {
  const { clientId, clientSecret } = getWithingsConfig();
  const resolvedRedirectUri = redirectUri ?? getWithingsRedirectUri();
  return withingsFormPost<WithingsTokenBody>(WITHINGS_OAUTH_TOKEN, {
    action: 'requesttoken',
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: resolvedRedirectUri,
  });
}

export async function refreshWithingsToken(refreshToken: string): Promise<WithingsTokenBody> {
  const { clientId, clientSecret } = getWithingsConfig();
  return withingsFormPost<WithingsTokenBody>(WITHINGS_OAUTH_TOKEN, {
    action: 'requesttoken',
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

export interface WithingsRawMeasure {
  value: number;
  type: number;
  unit: number;
  fm?: number;
}

export interface WithingsMeasureGroup {
  grpid: number;
  date: number;
  created: number;
  modified: number;
  category: number;
  measures: WithingsRawMeasure[];
}

import {
  mergeWithingsMeasureGroups,
  parseWithingsMeasureGroup,
  WITHINGS_BODY_SCAN_MEASTYPES,
  type WithingsHeartRecord,
  type WithingsParsedMeasurement,
} from '@/lib/integrations/withings-measures';

export type {
  WithingsParsedMeasurement,
  WithingsExtras,
} from '@/lib/integrations/withings-measures';
export {
  decodeWithingsValue,
  enrichMeasurementsWithHeartEcg,
  parseWithingsMeasureGroup,
  WITHINGS_BODY_SCAN_MEASTYPES,
} from '@/lib/integrations/withings-measures';
export type { WithingsHeartRecord } from '@/lib/integrations/withings-measures';

export async function fetchWithingsMeasurements(
  accessToken: string,
  options?: { startdate?: number; enddate?: number; lastupdate?: number },
): Promise<WithingsParsedMeasurement[]> {
  const params: Record<string, string> = {
    action: 'getmeas',
    category: '1',
    meastypes: WITHINGS_BODY_SCAN_MEASTYPES,
  };

  if (options?.lastupdate != null) {
    params.lastupdate = String(options.lastupdate);
  } else {
    if (options?.startdate != null) params.startdate = String(options.startdate);
    if (options?.enddate != null) params.enddate = String(options.enddate);
  }

  const all: WithingsParsedMeasurement[] = [];
  let offset = 0;

  for (;;) {
    if (offset > 0) params.offset = String(offset);

    const body = await withingsFormPost<{
      updatetime: number;
      measuregrps: WithingsMeasureGroup[];
      more?: number;
      offset?: number;
    }>(WITHINGS_MEASURE, params, accessToken);

    const mergedGroups = mergeWithingsMeasureGroups(body.measuregrps ?? []);
    for (const group of mergedGroups) {
      all.push(parseWithingsMeasureGroup(group));
    }

    const { more, offset: nextOffset } = body;
    if (more !== 1 || nextOffset == null) break;
    offset = nextOffset;
  }

  return all.sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime());
}

export async function fetchWithingsHeartList(
  accessToken: string,
  options?: { startdate?: number; enddate?: number },
): Promise<WithingsHeartRecord[]> {
  const params: Record<string, string> = { action: 'list' };
  if (options?.startdate != null) params.startdate = String(options.startdate);
  if (options?.enddate != null) params.enddate = String(options.enddate);

  const all: WithingsHeartRecord[] = [];
  let offset = 0;

  for (;;) {
    if (offset > 0) params.offset = String(offset);

    const body = await withingsFormPost<{
      series: WithingsHeartRecord[];
      more?: number;
      offset?: number;
    }>(WITHINGS_HEART, params, accessToken);

    all.push(...(body.series ?? []));

    const { more, offset: nextOffset } = body;
    if (more !== 1 || nextOffset == null) break;
    offset = nextOffset;
  }

  return all;
}
