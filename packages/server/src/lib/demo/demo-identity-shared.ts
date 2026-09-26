/**
 * The shared demo tenant is a real Clerk user (ADR-048 phase 3f): the visitor gets a Clerk
 * session, so `api.` sees a Bearer like for any athlete. No server-only import — the client's
 * `useIsDemoMode()` reads the signed-in user's `externalId` too.
 */
export const DEMO_EXTERNAL_ID = 'sharpit-demo';

/** Contact address of the demo Clerk user — never signed into with it; a sign-in ticket is. */
export const DEMO_EMAIL = 'demo@sharpit.app';

export const DEMO_READ_ONLY_ERROR = 'Mode démo : lecture seule';

const PROVIDER_CONNECT = /^\/api\/[a-z-]+\/connect$/;

/**
 * What the demo athlete may not do: any write under `/api/`, and starting a provider connect
 * (a GET, but it ends in a write on the callback).
 */
export function isDemoBlockedRequest(method: string, pathname: string): boolean {
  if (!pathname.startsWith('/api/')) {
    return false;
  }
  const isWrite = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  return isWrite || PROVIDER_CONNECT.test(pathname);
}
