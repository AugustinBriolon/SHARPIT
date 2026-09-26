import { type NextRequest, NextResponse } from 'next/server';

/**
 * `api.sharpit.app` is the JSON + Bearer host of the split (web. = thin UI, apex = AASA,
 * `/connect/*`, landing). While one deployment still serves every host, these guards keep
 * `api.` to its contract: JSON only, Clerk Bearer only, no cookies, no HTML, CORS for the
 * thin web only. Other hosts are untouched.
 */
export const API_HOST = 'api.sharpit.app';

/** The only browser origin allowed to call `api.` — never `*`. */
export const API_ALLOWED_ORIGIN = 'https://web.sharpit.app';

/** Vercel cron invocations, authenticated by `CRON_SECRET` in their route, never by Clerk. */
const CRON_PATH = /^\/api\/cron\/[a-z-]+$/;

/** What `api.` serves: the native contract, the coach SSE stream kept off `/api/v1`, and crons. */
const API_HOST_PATHS = [/^\/api\/v1\//, /^\/api\/coach\/chat$/, CRON_PATH];

export function isCronPath(pathname: string): boolean {
  return CRON_PATH.test(pathname);
}

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type';

export function isApiHostRequest(req: NextRequest): boolean {
  return req.nextUrl.hostname === API_HOST;
}

export function isApiHostPath(pathname: string): boolean {
  return API_HOST_PATHS.some((pattern) => pattern.test(pathname));
}

export function hasBearer(req: NextRequest): boolean {
  return /^Bearer\s+\S+/i.test(req.headers.get('authorization') ?? '');
}

function allowedOrigin(req: NextRequest): string | null {
  return req.headers.get('origin') === API_ALLOWED_ORIGIN ? API_ALLOWED_ORIGIN : null;
}

/**
 * Applied to every `api.` response the proxy produces or lets through: never stores an
 * authenticated answer, never sets a cookie, and names the one browser origin allowed.
 */
export function sealApiHostResponse(req: NextRequest, response: NextResponse): NextResponse {
  response.headers.delete('set-cookie');
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Origin, Authorization');
  const origin = allowedOrigin(req);
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    response.headers.delete('Access-Control-Allow-Origin');
  }
  return response;
}

export function apiHostError(
  req: NextRequest,
  status: 401 | 403 | 404,
  error: string,
): NextResponse {
  return sealApiHostResponse(req, NextResponse.json({ error }, { status }));
}

/** CORS preflight: answered here, never forwarded to a route. */
export function apiHostPreflight(req: NextRequest): NextResponse {
  if (!allowedOrigin(req)) {
    return apiHostError(req, 403, 'Origin not allowed');
  }
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  response.headers.set('Access-Control-Max-Age', '600');
  return sealApiHostResponse(req, response);
}

/**
 * Everything that can be answered before Clerk runs: unknown paths, preflights and
 * requests with no Bearer at all. Null means "authenticate it".
 */
export function screenApiHostRequest(req: NextRequest): NextResponse | null {
  if (!isApiHostPath(req.nextUrl.pathname)) {
    return apiHostError(req, 404, 'Not found');
  }
  if (req.method === 'OPTIONS') {
    return apiHostPreflight(req);
  }
  if (!hasBearer(req)) {
    return apiHostError(req, 401, 'Bearer token required');
  }
  return null;
}
