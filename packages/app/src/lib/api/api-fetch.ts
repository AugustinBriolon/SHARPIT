/**
 * Every call the web UI makes to Sharpit's route handlers (ADR-048 phase 3).
 *
 * `NEXT_PUBLIC_API_ORIGIN` (production: `https://api.sharpit.app`, local: the api app): `/api/…`
 * goes to that origin with the Clerk session token as a Bearer — `api.` reads no cookie. Unset
 * (tests), the path stays relative.
 */

type ClerkSession = { getToken(): Promise<string | null> };
type ClerkGlobal = { loaded?: boolean; session?: ClerkSession | null };

const CLERK_WAIT_STEP_MS = 50;
const CLERK_WAIT_MAX_MS = 5000;

function apiOrigin(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN ?? '';
}

function clerkGlobal(): ClerkGlobal | undefined {
  return (globalThis as { Clerk?: ClerkGlobal }).Clerk;
}

/** A call made while Clerk is still loading waits for the session instead of going without. */
async function loadedClerk(): Promise<ClerkGlobal | undefined> {
  for (let waited = 0; waited < CLERK_WAIT_MAX_MS; waited += CLERK_WAIT_STEP_MS) {
    const clerk = clerkGlobal();
    if (clerk?.loaded) {
      return clerk;
    }
    await new Promise((resolve) => setTimeout(resolve, CLERK_WAIT_STEP_MS));
  }
  return clerkGlobal();
}

async function sessionToken(): Promise<string | null> {
  const clerk = await loadedClerk();
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
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
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
