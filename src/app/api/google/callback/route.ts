import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { emailFromIdToken, exchangeCodeForToken } from '@/lib/google';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
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
  cookieStore.delete('google_oauth_state');

  if (!code || !state || state !== storedState) {
    settingsUrl.searchParams.set('google', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const token = await exchangeCodeForToken(code, origin);

    if (!token.refresh_token) {
      // Sans refresh_token on ne peut pas garder l'accès : on force reconsentement.
      settingsUrl.searchParams.set('google', 'no_refresh');
      return NextResponse.redirect(settingsUrl);
    }

    const email = emailFromIdToken(token.id_token);
    const data = {
      email,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      scope: token.scope ?? null,
    };

    await prisma.googleAccount.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
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
      settingsUrl.searchParams.set('google_detail', message.slice(0, 300));
    }
    return NextResponse.redirect(settingsUrl);
  }
}
