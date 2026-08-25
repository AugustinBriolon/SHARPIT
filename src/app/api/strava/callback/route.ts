import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { redirectAfterIntegrationConnect } from '@/lib/integrations/oauth-return';
import { exchangeCodeForToken } from '@/lib/integrations/strava/strava';
import { encryptSecret } from '@/lib/secret-box';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return redirectAfterIntegrationConnect(request, 'strava', 'denied');
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('strava_oauth_state')?.value;
  cookieStore.delete('strava_oauth_state');

  if (!code || !state || state !== storedState) {
    return redirectAfterIntegrationConnect(request, 'strava', 'invalid_state');
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const token = await exchangeCodeForToken(code);
    const { athlete } = token;

    if (!athlete) {
      return redirectAfterIntegrationConnect(request, 'strava', 'no_athlete');
    }

    const data = {
      stravaAthleteId: String(athlete.id),
      firstName: athlete.firstname ?? null,
      lastName: athlete.lastname ?? null,
      avatarUrl: athlete.profile ?? null,
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: encryptSecret(token.refresh_token),
      expiresAt: new Date(token.expires_at * 1000),
    };

    await prisma.stravaAccount.upsert({
      where: { athleteId },
      create: { athleteId, ...data },
      update: data,
    });

    return redirectAfterIntegrationConnect(request, 'strava', 'connected');
  } catch (err) {
    console.error(err);
    return redirectAfterIntegrationConnect(request, 'strava', 'error');
  }
}
