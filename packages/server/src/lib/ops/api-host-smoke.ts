import { API_ALLOWED_ORIGIN } from '@sharpit/app/lib/hosts/api-host';
import {
  expectContentType,
  expectStatus,
  runSmokeChecks,
  type SmokeCheck,
  type SmokeOptions,
  type SmokeResponse,
  type SmokeResult,
} from '@sharpit/server/lib/ops/must-private-smoke';

/**
 * Live smoke for `api.sharpit.app` (step 4 of the host split): JSON + Bearer only, no page,
 * no cookie, no cached authenticated answer, CORS for the thin web only.
 */

function expectApiHeaders(response: SmokeResponse): string | null {
  if (response.headers.get('set-cookie')) {
    return 'sets a cookie';
  }
  if (response.headers.get('access-control-allow-origin') === '*') {
    return 'allows any origin (*)';
  }
  return (response.headers.get('cache-control') ?? '').includes('no-store')
    ? null
    : 'Cache-Control is not no-store';
}

function jsonError(status: number) {
  return (response: SmokeResponse): string | null =>
    expectStatus(response, status) ??
    expectContentType(response, 'application/json') ??
    expectApiHeaders(response);
}

function verifyPreflight(response: SmokeResponse): string | null {
  const origin = response.headers.get('access-control-allow-origin');
  return (
    expectStatus(response, 204) ??
    (origin === API_ALLOWED_ORIGIN ? null : `allowed origin is "${origin ?? ''}"`)
  );
}

function verifyCallbackLanding(response: SmokeResponse): string | null {
  const location = response.headers.get('location') ?? '';
  return (
    expectStatus(response, 307) ??
    (location.startsWith(`${API_ALLOWED_ORIGIN}/`) ? null : `lands on "${location}"`) ??
    expectApiHeaders(response)
  );
}

export function apiHostChecks(trainingDayId: string): SmokeCheck[] {
  const today = `/api/v1/today?trainingDayId=${trainingDayId}`;
  return [
    { name: 'No Bearer → 401 JSON', path: today, verify: jsonError(401) },
    { name: 'No page on api. → 404 JSON', path: '/', verify: jsonError(404) },
    {
      name: 'No AASA on api. → 404 JSON',
      path: '/.well-known/apple-app-site-association',
      verify: jsonError(404),
    },
    {
      name: 'Preflight from the thin web is allowed',
      path: today,
      method: 'OPTIONS',
      headers: {
        Origin: API_ALLOWED_ORIGIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization',
      },
      verify: verifyPreflight,
    },
    {
      name: 'Preflight from another origin is refused',
      path: today,
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' },
      verify: jsonError(403),
    },
    {
      name: 'A web route without Bearer → 401 JSON',
      path: `/api/presentation/today?trainingDayId=${trainingDayId}`,
      verify: jsonError(401),
    },
    {
      name: 'A provider callback with no state lands on the web, no Bearer asked',
      path: '/api/withings/callback',
      verify: verifyCallbackLanding,
    },
    {
      name: 'Today reads with a Clerk Bearer, uncached, no cookie',
      path: today,
      authenticated: true,
      verify: (response) =>
        expectStatus(response, 200) ??
        expectContentType(response, 'application/json') ??
        expectApiHeaders(response),
    },
  ];
}

export function runApiHostSmoke(
  origin: string,
  options: SmokeOptions & { trainingDayId: string },
): Promise<SmokeResult[]> {
  return runSmokeChecks(origin, apiHostChecks(options.trainingDayId), options);
}
