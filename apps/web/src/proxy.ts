import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { afterAuthPath } from '@sharpit/app/lib/auth/after-auth-redirect';
import { ENTRY_PATH } from '@sharpit/app/lib/onboarding/entry-path';
import { describeClerkConfigIssues, diagnoseClerkConfig } from '@sharpit/app/lib/auth/clerk-config';
import { recoverFromHandshakeFailure } from '@sharpit/app/lib/auth/handshake-recovery';
import { isDevClerkBypass } from '@sharpit/app/lib/dev/dev-auth';

// Routes accessibles sans session Clerk :
// - pages de connexion/inscription
// - l'entrée du mode démo, qui connecte le visiteur au compte démo partagé.
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Public promise funnel (teaser → signup). Outside auth app shell.
  '/welcome(.*)',
  '/privacy',
  '/terms',
  '/~offline',
  // iOS fetches apple-touch-startup-image without a session cookie.
  '/apple-splash(.*)',
  '/demo',
  // Apple's CDN fetches it without a session and refuses redirects (ADR-040).
  '/.well-known/apple-app-site-association',
  // End of the native Garmin handoff: reads only its query string, and must render
  // even if the web session expired mid-flow.
  '/connect/garmin/callback',
]);

// Signed-out-only pages: the teaser and the auth entry points themselves.
const isSignedOutOnlyPage = createRouteMatcher(['/welcome(.*)', '/sign-in', '/sign-up']);

/**
 * A signed-in athlete never sees the teaser or an empty sign-in: `/welcome` goes to
 * `/start` (their next screen), `/sign-in` and `/sign-up` go where Clerk was sending
 * them (`redirect_url`, e.g. back into the Garmin handoff) — same-origin only — else
 * `/start`. Server-side, so no
 * teaser flash and no client/server ping-pong.
 */
function redirectSignedIn(req: NextRequest): NextResponse | null {
  if (req.method !== 'GET' || !isSignedOutOnlyPage(req)) {
    return null;
  }
  const destination = req.nextUrl.pathname.startsWith('/welcome')
    ? ENTRY_PATH
    : afterAuthPath(req.nextUrl.searchParams.get('redirect_url'), req.nextUrl.origin);
  return NextResponse.redirect(new URL(destination, req.nextUrl.origin));
}

// Strangers hitting `/` (Today) land on the public teaser instead of the Clerk sign-in
// wall (and its demo callout). Signed-in athletes — the demo one included — keep Today at `/`.
function redirectStrangerFromToday(req: NextRequest): NextResponse | null {
  if (req.nextUrl.pathname === '/' && req.method === 'GET') {
    const welcome = req.nextUrl.clone();
    welcome.pathname = '/welcome';
    return NextResponse.redirect(welcome);
  }
  return null;
}

// Explicit so `auth.protect()` sends strangers to our pages (with `redirect_url` back to
// where they were — the Garmin handoff included), never to the hosted Account Portal.
const AUTH_ROUTES = { signInUrl: '/sign-in', signUpUrl: '/sign-up' };

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (isDevClerkBypass()) {
    return;
  }

  const { userId } = await auth();
  if (userId) {
    return redirectSignedIn(req);
  }

  const early = redirectStrangerFromToday(req);
  if (early) {
    return early;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
}, AUTH_ROUTES);

// Printed once per server instance, by rule name only — never a key.
const clerkConfigIssues = describeClerkConfigIssues(diagnoseClerkConfig());
if (clerkConfigIssues.length > 0 && !isDevClerkBypass()) {
  console.error('[auth] Clerk configuration', clerkConfigIssues);
}

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
    // Ignore les internes Next.js et les fichiers statiques (sauf si présents en query params)
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Routes Frontend API spécifiques à Clerk
    '/__clerk/(.*)',
  ],
};
