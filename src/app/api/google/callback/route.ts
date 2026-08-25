import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { emailFromIdToken, exchangeCodeForToken } from '@/lib/integrations/google/google';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { redirectAfterIntegrationConnect } from '@/lib/integrations/oauth-return';
import { prisma } from '@/lib/prisma';
import { encryptSecret } from '@/lib/secret-box';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return redirectAfterIntegrationConnect(request, 'google', 'denied');
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('google_oauth_state')?.value;
  const storedRedirect = cookieStore.get('google_oauth_redirect')?.value;
  cookieStore.delete('google_oauth_state');
  cookieStore.delete('google_oauth_redirect');

  if (!code || !state || state !== storedState) {
    return redirectAfterIntegrationConnect(request, 'google', 'invalid_state');
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const token = await exchangeCodeForToken(code, storedRedirect ?? undefined);

    if (!token.refresh_token) {
      return redirectAfterIntegrationConnect(request, 'google', 'no_refresh');
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

    return redirectAfterIntegrationConnect(request, 'google', 'connected');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[google/callback]', message, err);
    const extra =
      process.env.NODE_ENV === 'development' ? { googleDetail: message.slice(0, 300) } : undefined;
    return redirectAfterIntegrationConnect(request, 'google', 'error', extra);
  }
}
