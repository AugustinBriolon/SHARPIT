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

function readOAuthParams(searchParams: URLSearchParams) {
  return {
    code: searchParams.get('code'),
    state: searchParams.get('state'),
    error: searchParams.get('error'),
  };
}

async function persistWithingsAccount(
  athleteId: string,
  token: Awaited<ReturnType<typeof exchangeWithingsCode>>,
) {
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
}

async function runInitialWithingsSync(athleteId: string) {
  try {
    await syncWithingsHealth(athleteId, { days: 90 });
  } catch (syncErr) {
    console.error('[withings/callback] sync initial:', syncErr);
  }
}

function isOAuthStateInvalid(code: string | null, state: string | null, storedState?: string) {
  return !code || !state || state !== storedState;
}

async function completeWithingsOAuth(request: NextRequest, code: string, redirectUri: string) {
  const athleteId = await getCurrentAthleteId();
  const token = await exchangeWithingsCode(code, redirectUri);
  await persistWithingsAccount(athleteId, token);
  await runInitialWithingsSync(athleteId);
  return redirectAfterIntegrationConnect(request, 'withings', 'connected');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { code, state, error } = readOAuthParams(searchParams);

  if (error) {
    return redirectAfterIntegrationConnect(request, 'withings', 'denied');
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('withings_oauth_state')?.value;
  const storedRedirectUri = cookieStore.get('withings_oauth_redirect')?.value;
  cookieStore.delete('withings_oauth_state');
  cookieStore.delete('withings_oauth_redirect');

  if (isOAuthStateInvalid(code, state, storedState)) {
    return redirectAfterIntegrationConnect(request, 'withings', 'invalid_state');
  }

  const redirectUri = storedRedirectUri ?? getWithingsRedirectUri(publicOriginFromRequest(request));

  try {
    return await completeWithingsOAuth(request, code!, redirectUri);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[withings/callback]', message, err);
    return redirectAfterIntegrationConnect(request, 'withings', 'error', {
      withingsDetail: message.slice(0, 300),
    });
  }
}
