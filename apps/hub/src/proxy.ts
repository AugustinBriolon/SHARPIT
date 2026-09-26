import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { afterAuthPath } from '@sharpit/app/lib/auth/after-auth-redirect';
import { recoverFromHandshakeFailure } from '@sharpit/app/lib/auth/handshake-recovery';

/**
 * The apex needs a session for the Garmin handoff only (ADR-047): its entry, start and
 * authorize steps. Every other hub path is public, and every non-hub path is redirected to the
 * web by `next.config.ts`.
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

/**
 * Clerk runs only where a session is read: the handoff steps and the sign-in. The AASA (Apple's
 * CDN, no session, no redirect), the callback and the legal pages answer without it.
 */
export const config = {
  matcher: [
    '/connect/garmin',
    '/connect/garmin/start',
    '/connect/garmin/authorize',
    '/sign-in/:path*',
    '/__clerk/:path*',
  ],
};
