import { NextResponse, type NextRequest } from 'next/server';
import { ensureDemoSeedFresh } from '@/lib/demo/seed-demo-data';
import { DEMO_COOKIE } from '@/lib/demo/demo-session';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

/** Entry point for the public read-only demo: ensures fresh seeded data, sets the
 * demo cookie, and hands the visitor straight into the real app on the shared tenant. */
export async function GET(request: NextRequest) {
  await ensureDemoSeedFresh(prisma);

  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set(DEMO_COOKIE, '1', {
    // Not httpOnly — useIsDemoMode() reads it client-side for UI-only
    // date-range fencing. See demo-cookie.ts for why that's safe.
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
