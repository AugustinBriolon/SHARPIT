import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSignInTicket } from '@sharpit/server/lib/auth/sign-in-ticket';
import {
  GARMIN_HANDOFF_ORIGIN,
  garminHandoffEntryUrl,
} from '@sharpit/server/lib/integrations/garmin/garmin-connect-handoff';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** Production always hands off on the apex; a local server hands off on itself. */
function handoffOrigin(request: NextRequest): string {
  return process.env.NODE_ENV === 'production' ? GARMIN_HANDOFF_ORIGIN : request.nextUrl.origin;
}

/**
 * The page the iOS app opens in an in-app authentication session to connect Garmin
 * (ADR-047). It carries a one-time Clerk sign-in ticket for the Bearer's own user, so the
 * web session inside the sheet is the app's athlete — never whoever is signed in to Safari.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401, headers: NO_STORE });
  }

  try {
    const token = await createSignInTicket(userId);
    return NextResponse.json(
      { apiVersion: 1, url: garminHandoffEntryUrl(handoffOrigin(request), token) },
      { headers: NO_STORE },
    );
  } catch (error) {
    // Name only: the error may echo the request, and the ticket is a credential.
    console.error('[api/v1/garmin/handoff]', {
      name: error instanceof Error ? error.name : 'Error',
    });
    return NextResponse.json(
      { error: 'Connexion Garmin indisponible pour le moment.' },
      { status: 500, headers: NO_STORE },
    );
  }
}
