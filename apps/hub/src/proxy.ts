import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { afterAuthPath } from '@sharpit/app/lib/auth/after-auth-redirect';
import { recoverFromHandshakeFailure } from '@sharpit/app/lib/auth/handshake-recovery';

/**
 * The apex needs a session for the Garmin handoff only (ADR-047): its entry, start and
 * authorize steps. The AASA, the callback, the legal pages and the sign-in stay public; every
 * other path is redirected to the web by `next.config.ts` before this runs.
 */
const needsSession = createRouteMatcher([
  '/connect/garmin',
  '/connect/garmin/start',
  '/connect/garmin/authorize',
]);

/**
 * A signed-in visitor on `/sign-in` goes where Clerk was sending them (`redirect_url`, the
 * handoff), same-origin only — never an empty sign-in form.
 */
function redirectSignedIn(req: NextRequest): NextResponse | null {
  if (req.method !== 'GET' || !req.nextUrl.pathname.startsWith('/sign-in')) {
    return null;
  }
  const destination = afterAuthPath(
    req.nextUrl.searchParams.get('redirect_url'),
    req.nextUrl.origin,
  );
  return NextResponse.redirect(new URL(destination, req.nextUrl.origin));
}

const clerkProxy = clerkMiddleware(
  async (auth, req) => {
    const { userId } = await auth();
    if (userId) {
      return redirectSignedIn(req);
    }
    if (needsSession(req)) {
      await auth.protect();
    }
  },
  // Strangers go to the apex's own sign-in, with `redirect_url` back into the handoff.
  { signInUrl: '/sign-in', signUpUrl: '/sign-up' },
);

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  try {
    return await clerkProxy(req, event);
  } catch (error) {
    const recovered = recoverFromHandshakeFailure(req, error);
    if (recovered) {
      return recovered;
    }
    throw error;
  }
}

export const config = {
  matcher: [
    // The AASA never goes through Clerk: Apple's CDN fetches it with no session, no redirect.
    '/((?!_next|\\.well-known|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)',
    '/__clerk/(.*)',
  ],
};
