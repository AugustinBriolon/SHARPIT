import { type NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';
import { DEMO_COOKIE } from '@/lib/demo/demo-session';
import { checkRateLimit, rateLimiters, rateLimitResponseBody } from '@/lib/rate-limit';

// Routes accessibles sans session Clerk :
// - pages de connexion/inscription
// - le cron Vercel (protégé par CRON_SECRET, pas par une session)
// - l'entrée et la sortie du mode démo, qui posent/effacent le cookie avant
//   toute session — listées explicitement (pas de wildcard `/api/demo(.*)`)
//   pour ne jamais exposer d'autre route sous /api/demo sans session.
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/cron(.*)',
  '/~offline',
  '/demo',
  '/api/demo/exit',
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

export default clerkMiddleware(async (auth, req) => {
  if (isDevClerkBypass()) {
    return;
  }

  // A real session always wins over a stray demo cookie left over in the
  // same browser (e.g. a signed-in athlete who once visited /demo) — otherwise
  // their own writes would be misread as a demo session and blocked.
  const { userId } = await auth();
  const isDemoVisitor = !userId && hasDemoCookie(req);
  if (!userId) {
    const blocked = demoSessionResponse(req);
    if (blocked) {
      return blocked;
    }
  }

  // A demo visitor carries no Clerk session by design (ADR-026) — mutations
  // are already 403'd above, so reads are let through the real (app) route
  // tree instead of being bounced to /sign-in by auth.protect().
  if (!isPublicRoute(req) && !isDemoVisitor) {
    await auth.protect();
  }

  // Flooding backstop for every authenticated API call — generous, catches
  // raw request-hammering regardless of which route. Skipped for demo
  // sessions (already fully read-only) and unauthenticated/public routes.
  if (!userId) {
    return;
  }
  return rateLimitApiUser(userId, req.nextUrl.pathname);
});

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
