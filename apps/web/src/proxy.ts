import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { afterAuthPath } from '@/lib/auth/after-auth-redirect';
import { ENTRY_PATH } from '@/lib/onboarding/entry-path';
import { describeClerkConfigIssues, diagnoseClerkConfig } from '@/lib/auth/clerk-config';
import { recoverFromHandshakeFailure } from '@/lib/auth/handshake-recovery';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';
import { DEMO_COOKIE } from '@/lib/demo/demo-session';
import { checkRateLimit, rateLimiters, rateLimitResponseBody } from '@/lib/rate-limit';
import {
  apiHostError,
  isApiHostRequest,
  screenApiHostRequest,
  sealApiHostResponse,
} from '@/lib/hosts/api-host';

// Routes accessibles sans session Clerk :
// - pages de connexion/inscription
// - le cron Vercel (protégé par CRON_SECRET, pas par une session)
// - l'entrée et la sortie du mode démo, qui posent/effacent le cookie avant
//   toute session — listées explicitement (pas de wildcard `/api/demo(.*)`)
//   pour ne jamais exposer d'autre route sous /api/demo sans session.
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Public promise funnel (teaser → signup). Outside auth app shell.
  '/welcome(.*)',
  '/privacy',
  '/terms',
  '/api/cron(.*)',
  '/~offline',
  // iOS fetches apple-touch-startup-image without a session cookie.
  '/apple-splash(.*)',
  '/demo',
  '/api/demo/exit',
  // Apple's CDN fetches it without a session and refuses redirects (ADR-040).
  '/.well-known/apple-app-site-association',
  // App Store Server Notifications V2 — Apple calls it with no session; the route
  // trusts nothing before verifying the payload's signature (ADR-044).
  '/api/billing/apple/notifications',
  // End of the native Garmin handoff: reads only its query string, and must render
  // even if the web session expired mid-flow.
  '/connect/garmin/callback',
]);

// Callbacks OAuth : des GET qui écrivent en base au retour du fournisseur.
// Une simple règle « bloquer les écritures » sur la méthode ne les voit pas.
const isDemoMutatingCallback = createRouteMatcher([
  '/api/strava/callback(.*)',
  '/api/withings/callback(.*)',
  '/api/google/callback(.*)',
  '/api/garmin/sso-callback(.*)',
]);

function isDemoWriteBlocked(req: NextRequest): boolean {
  const isWrite = req.method !== 'GET' && req.method !== 'HEAD';
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return false;
  }
  return isWrite || isDemoMutatingCallback(req);
}

function hasDemoCookie(req: NextRequest): boolean {
  return req.cookies.get(DEMO_COOKIE)?.value === '1';
}

function demoSessionResponse(req: NextRequest): NextResponse | null {
  if (!hasDemoCookie(req) || !isDemoWriteBlocked(req)) {
    return null;
  }
  return NextResponse.json({ error: 'Mode démo : lecture seule' }, { status: 403 });
}

async function rateLimitApiUser(userId: string, pathname: string): Promise<NextResponse | null> {
  if (!pathname.startsWith('/api/')) {
    return null;
  }
  const result = await checkRateLimit(rateLimiters.apiGeneral, userId);
  if (result.ok) {
    return null;
  }
  return NextResponse.json(rateLimitResponseBody(result.retryAfterSeconds), { status: 429 });
}

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
// wall (and its demo callout). Signed-in athletes and demo visitors keep Today at `/`.
function redirectStrangerFromToday(req: NextRequest): NextResponse | null {
  if (req.nextUrl.pathname === '/' && req.method === 'GET') {
    const welcome = req.nextUrl.clone();
    welcome.pathname = '/welcome';
    return NextResponse.redirect(welcome);
  }
  return null;
}

function signedOutResponse(req: NextRequest): NextResponse | null {
  if (hasDemoCookie(req)) {
    return demoSessionResponse(req);
  }
  return redirectStrangerFromToday(req);
}

// Explicit so `auth.protect()` sends strangers to our pages (with `redirect_url` back to
// where they were — the Garmin handoff included), never to the hosted Account Portal.
const AUTH_ROUTES = { signInUrl: '/sign-in', signUpUrl: '/sign-up' };

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (isDevClerkBypass()) {
    return;
  }

  // A real session always wins over a stray demo cookie left over in the
  // same browser (e.g. a signed-in athlete who once visited /demo) — otherwise
  // their own writes would be misread as a demo session and blocked.
  const { userId } = await auth();
  if (userId) {
    // Flooding backstop for every authenticated API call — generous, catches raw
    // request-hammering regardless of which route.
    return redirectSignedIn(req) ?? rateLimitApiUser(userId, req.nextUrl.pathname);
  }

  const early = signedOutResponse(req);
  if (early) {
    return early;
  }

  // A demo visitor carries no Clerk session by design (ADR-026) — mutations
  // are already 403'd above, so reads are let through the real (app) route
  // tree instead of being bounced to /sign-in by auth.protect().
  if (!isPublicRoute(req) && !hasDemoCookie(req)) {
    await auth.protect();
  }
}, AUTH_ROUTES);

// `api.` authenticates by Bearer only: no page, no sign-in redirect, no handshake — a
// missing or rejected token is a 401 JSON, never Clerk's 404 rewrite.
const apiHostProxy = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (!userId) {
    return apiHostError(req, 401, 'Invalid or expired token');
  }
  return rateLimitApiUser(userId, req.nextUrl.pathname);
});

async function proxyApiHost(req: NextRequest, event: NextFetchEvent) {
  const screened = screenApiHostRequest(req);
  if (screened) {
    return screened;
  }
  const response = (await apiHostProxy(req, event)) ?? NextResponse.next();
  const sealable =
    response instanceof NextResponse ? response : new NextResponse(response.body, response);
  return sealApiHostResponse(req, sealable);
}

// Printed once per server instance, by rule name only — never a key.
const clerkConfigIssues = describeClerkConfigIssues(diagnoseClerkConfig());
if (clerkConfigIssues.length > 0 && !isDevClerkBypass()) {
  console.error('[auth] Clerk configuration', clerkConfigIssues);
}

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (isApiHostRequest(req)) {
    return proxyApiHost(req, event);
  }
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
    // Toujours exécuter pour les routes API
    '/(api|trpc)(.*)',
    // Routes Frontend API spécifiques à Clerk
    '/__clerk/(.*)',
  ],
};
