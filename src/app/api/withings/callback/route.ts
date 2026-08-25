import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  publicOriginFromRequest,
  redirectAfterIntegrationConnect,
} from '@/lib/integrations/oauth-return';
import { exchangeWithingsCode, getWithingsRedirectUri } from '@/lib/integrations/withings/withings';
import { syncWithingsHealth } from '@/lib/integrations/withings/withings-sync';
import { encryptSecret } from '@/lib/secret-box';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return redirectAfterIntegrationConnect(request, 'withings', 'denied');
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('withings_oauth_state')?.value;
  const storedRedirectUri = cookieStore.get('withings_oauth_redirect')?.value;
  cookieStore.delete('withings_oauth_state');
  cookieStore.delete('withings_oauth_redirect');

  if (!code || !state || state !== storedState) {
    return redirectAfterIntegrationConnect(request, 'withings', 'invalid_state');
  }

  const redirectUri = storedRedirectUri ?? getWithingsRedirectUri(publicOriginFromRequest(request));

  try {
    const athleteId = await getCurrentAthleteId();
    const token = await exchangeWithingsCode(code, redirectUri);

    await prisma.withingsAccount.upsert({
      where: { athleteId },
      create: {
        athleteId,
        withingsUserId: String(token.userid),
        accessTokenEnc: encryptSecret(token.access_token),
        refreshTokenEnc: encryptSecret(token.refresh_token),
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        displayName: `Withings #${token.userid}`,
      },
      update: {
        withingsUserId: String(token.userid),
        accessTokenEnc: encryptSecret(token.access_token),
        refreshTokenEnc: encryptSecret(token.refresh_token),
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
      },
    });

    try {
      await syncWithingsHealth(athleteId, { days: 90 });
    } catch (syncErr) {
      console.error('[withings/callback] sync initial:', syncErr);
    }

    return redirectAfterIntegrationConnect(request, 'withings', 'connected');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[withings/callback]', message, err);
    return redirectAfterIntegrationConnect(request, 'withings', 'error', {
      withingsDetail: message.slice(0, 300),
    });
  }
}
