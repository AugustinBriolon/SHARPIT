import { ENTRY_PATH } from '@sharpit/server/lib/onboarding/entry-path';

/** Pages only a signed-out visitor should see; a signed-in athlete belongs on Today. */
const SIGNED_OUT_ONLY = ['/welcome', '/sign-in', '/sign-up'];

function isSignedOutOnlyPath(pathname: string): boolean {
  return SIGNED_OUT_ONLY.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Where a signed-in athlete goes after auth: the same-origin `redirect_url` Clerk carried
 * (e.g. back into the Garmin handoff), else `/start` — which picks consent, onboarding
 * or Today. Never an external URL, never a signed-out page.
 */
export function afterAuthPath(redirectUrl: string | null | undefined, origin: string): string {
  if (!redirectUrl) {
    return ENTRY_PATH;
  }
  try {
    const target = new URL(redirectUrl, origin);
    if (target.origin !== new URL(origin).origin || isSignedOutOnlyPath(target.pathname)) {
      return ENTRY_PATH;
    }
    return `${target.pathname}${target.search}`;
  } catch {
    return ENTRY_PATH;
  }
}
