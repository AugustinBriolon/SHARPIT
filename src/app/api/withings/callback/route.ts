import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeWithingsCode } from '@/lib/integrations/withings';
import { syncWithingsHealth } from '@/lib/integrations/withings-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings', request.url);

  if (error) {
    settingsUrl.searchParams.set('withings', 'denied');
    return NextResponse.redirect(settingsUrl);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('withings_oauth_state')?.value;
  cookieStore.delete('withings_oauth_state');

  if (!code || !state || state !== storedState) {
    settingsUrl.searchParams.set('withings', 'invalid_state');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const token = await exchangeWithingsCode(code);

    await prisma.withingsAccount.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        withingsUserId: String(token.userid),
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        displayName: `Withings #${token.userid}`,
      },
      update: {
        withingsUserId: String(token.userid),
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
      },
    });

    try {
      await syncWithingsHealth({ days: 90 });
    } catch (syncErr) {
      console.error('[withings/callback] sync initial:', syncErr);
    }

    settingsUrl.searchParams.set('withings', 'connected');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error(err);
    settingsUrl.searchParams.set('withings', 'error');
    return NextResponse.redirect(settingsUrl);
  }
}
