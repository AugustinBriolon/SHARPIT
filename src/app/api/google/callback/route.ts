import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { emailFromIdToken, exchangeCodeForToken } from '@/lib/integrations/google/google';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { prisma } from '@/lib/prisma';
import { encryptSecret } from '@/lib/secret-box';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings', request.url);

  if (error) {
    settingsUrl.searchParams.set('google', 'denied');
    return NextResponse.redirect(settingsUrl);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('google_oauth_state')?.value;
  const storedRedirect = cookieStore.get('google_oauth_redirect')?.value;
  cookieStore.delete('google_oauth_state');
  cookieStore.delete('google_oauth_redirect');

  if (!code || !state || state !== storedState) {
    settingsUrl.searchParams.set('google', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const token = await exchangeCodeForToken(code, storedRedirect ?? undefined);

    if (!token.refresh_token) {
      // Sans refresh_token on ne peut pas garder l'accès : on force reconsentement.
      settingsUrl.searchParams.set('google', 'no_refresh');
      return NextResponse.redirect(settingsUrl);
    }

    const email = emailFromIdToken(token.id_token);
    const data = {
      email,
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: encryptSecret(token.refresh_token),
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      scope: token.scope ?? null,
    };

    await prisma.googleAccount.upsert({
      where: { athleteId },
      create: { athleteId, ...data },
      update: data,
    });

    settingsUrl.searchParams.set('google', 'connected');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[google/callback]', message, err);
    settingsUrl.searchParams.set('google', 'error');
    // En dev, on affiche le détail pour diagnostiquer (redirect_uri, etc.)
    if (process.env.NODE_ENV === 'development') {
      settingsUrl.searchParams.set('googleDetail', message.slice(0, 300));
    }
    return NextResponse.redirect(settingsUrl);
  }
}
