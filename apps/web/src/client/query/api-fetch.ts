/**
 * Every call the web UI makes to Sharpit's route handlers (ADR-048 phase 3).
 *
 * `NEXT_PUBLIC_API_ORIGIN` set (production: `https://api.sharpit.app`): `/api/…` goes to that
 * origin with the Clerk session token as a Bearer — `api.` reads no cookie. Unset, or with no
 * Clerk session (the anonymous demo): the same-origin route, as before. Unsetting the variable
 * is the rollback.
 */

type ClerkSession = { getToken(): Promise<string | null> };

function apiOrigin(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN ?? '';
}

async function sessionToken(): Promise<string | null> {
  const clerk = (globalThis as { Clerk?: { session?: ClerkSession | null } }).Clerk;
  try {
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

/** The URL and request options that reach `path` (`/api/…`) where it is served. */
export async function apiRequest(
  path: string,
  init: RequestInit = {},
): Promise<{ url: string; init: RequestInit }> {
  const origin = apiOrigin();
  if (!origin || !path.startsWith('/api/')) {
    return { url: path, init };
  }
  const token = await sessionToken();
  if (!token) {
    return { url: path, init };
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { url: `${origin}${path}`, init: { ...init, headers, credentials: 'omit' } };
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const request = await apiRequest(path, init);
  return fetch(request.url, request.init);
}

/**
 * Starts a provider connect (`/api/<provider>/connect?…`): asks where to go, then navigates
 * there. A plain link cannot carry the Bearer `api.` needs.
 */
export async function navigateToConnect(path: string): Promise<void> {
  const response = await apiFetch(path, { headers: { Accept: 'application/json' } });
  const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!body?.url) {
    throw new Error(body?.error ?? 'Connexion impossible pour le moment.');
  }
  window.location.assign(body.url);
}
