import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeCodeForToken } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings', request.url);

  if (error) {
    settingsUrl.searchParams.set('strava', 'denied');
    return NextResponse.redirect(settingsUrl);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('strava_oauth_state')?.value;
  cookieStore.delete('strava_oauth_state');

  if (!code || !state || state !== storedState) {
    settingsUrl.searchParams.set('strava', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const token = await exchangeCodeForToken(code);
    const { athlete } = token;

    if (!athlete) {
      settingsUrl.searchParams.set('strava', 'no_athlete');
      return NextResponse.redirect(settingsUrl);
    }

    const data = {
      athleteId: String(athlete.id),
      firstName: athlete.firstname ?? null,
      lastName: athlete.lastname ?? null,
      avatarUrl: athlete.profile ?? null,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(token.expires_at * 1000),
    };

    await prisma.stravaAccount.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    });

    settingsUrl.searchParams.set('strava', 'connected');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error(err);
    settingsUrl.searchParams.set('strava', 'error');
    return NextResponse.redirect(settingsUrl);
  }
}
