import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { isDevClerkBypass } from '@/lib/dev-auth';

// Routes accessibles sans session Clerk :
// - pages de connexion/inscription
// - le cron Vercel (protégé par CRON_SECRET, pas par une session)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/cron(.*)',
  '/~offline',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isDevClerkBypass()) return;
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
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
