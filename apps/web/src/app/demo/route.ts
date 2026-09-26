import { NextResponse, type NextRequest } from 'next/server';
import { createSignInTicket, ticketSignInUrl } from '@sharpit/server/lib/auth/sign-in-ticket';
import { ensureDemoClerkUser } from '@sharpit/server/lib/demo/demo-identity';

/**
 * Public demo entry (ADR-048 phase 3f): signs the visitor in to the shared, read-only demo
 * account with a one-time Clerk ticket, then opens Today. A Clerk session like any other, so the
 * web calls `api.` with a Bearer. The demo data is (re)seeded by `api.` on the first read.
 */
export async function GET(request: NextRequest) {
  try {
    const ticket = await createSignInTicket(await ensureDemoClerkUser());
    return NextResponse.redirect(ticketSignInUrl(request.nextUrl.origin, ticket, '/'));
  } catch (error) {
    console.error('[demo] sign-in ticket failed', {
      name: error instanceof Error ? error.name : 'Error',
    });
    return NextResponse.redirect(new URL('/sign-in', request.nextUrl.origin));
  }
}
