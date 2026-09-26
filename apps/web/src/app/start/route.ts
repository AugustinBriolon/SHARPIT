import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { athleteEntryPath } from '@sharpit/server/lib/onboarding/entry';

/**
 * After sign-in / sign-up: resolves (or provisions, for a brand-new account) the
 * athlete, then sends them to their next screen in one redirect. An existing athlete
 * signing up again through an OAuth provider lands here too and simply goes to Today.
 */
export async function GET(request: NextRequest) {
  let destination = '/';
  try {
    destination = await athleteEntryPath(await getCurrentAthleteId());
  } catch (error) {
    console.error('[start]', { name: error instanceof Error ? error.name : 'Error' });
  }
  const response = NextResponse.redirect(new URL(destination, request.nextUrl.origin), 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
