import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_COOKIE } from '@/lib/demo/demo-session';

/** Entry point for the public read-only demo: sets the demo cookie and hands
 * the visitor straight into the real app on the shared, seeded demo tenant. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set(DEMO_COOKIE, '1', {
    // Not httpOnly — useIsDemoMode() reads it client-side for UI-only
    // date-range fencing. See demo-cookie.ts for why that's safe.
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
