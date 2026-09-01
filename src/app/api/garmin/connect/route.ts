import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GarminLoginError } from '@/lib/integrations/garmin/garmin';

export const maxDuration = 60;

/** Password SSO via Node fetch is a dead end (Garmin auth 2026). Honest 501 only. */
export const garminConnectSchema = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
  dataClass: z.string().optional().nullable(),
});

export const SSO_DISABLED_MESSAGE =
  'La connexion Garmin email/mot de passe via le serveur Sharpit ne fonctionne plus (auth Garmin 2026). Sur ta machine : pip install -r scripts/requirements-garmin.txt && python3 scripts/garmin-login.py — puis colle le JSON (di_token / di_refresh_token) ici, ou lance yarn garmin:import-tokens.';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = garminConnectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    return NextResponse.json(
      { error: SSO_DISABLED_MESSAGE, code: 'garmin_sso_disabled' },
      { status: 501 },
    );
  } catch (error) {
    console.error('[api/garmin/connect]', error);
    return NextResponse.json({ error: garminConnectErrorMessage(error) }, { status: 401 });
  }
}

function garminConnectErrorMessage(error: unknown): string {
  if (error instanceof GarminLoginError && error.reason === 'invalid_credentials') {
    return 'Connexion Garmin échouée. Vérifie tes identifiants.';
  }
  return SSO_DISABLED_MESSAGE;
}

export { garminConnectErrorMessage };
