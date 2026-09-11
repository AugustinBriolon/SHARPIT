import { NextResponse, after, type NextRequest } from 'next/server';
import { ensureDemoSeedFresh } from '@/lib/demo/seed-demo-data';
import { DEMO_COOKIE } from '@/lib/demo/demo-session';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

/**
 * Public demo entry: set the cookie and redirect immediately so middleware
 * accepts `/`. Seed runs after the response (and again on first demo resolve
 * if still needed) — never block cookie delivery behind a long reseed.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set(DEMO_COOKIE, '1', {
    // Not httpOnly — useIsDemoMode() reads it client-side for UI-only
    // date-range fencing. See demo-cookie.ts for why that's safe.
    sameSite: 'lax',
    path: '/',
  });

  after(() => {
    void ensureDemoSeedFresh(prisma).catch((error) => {
      console.error('[demo] background seed failed', error);
    });
  });

  return response;
}
