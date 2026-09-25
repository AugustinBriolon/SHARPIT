import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { onProviderSyncCompleted } from '@/lib/athlete-state/orchestrator';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { syncGarminActivities } from '@/lib/integrations/garmin/garmin-activity-sync';
import { GarminMobileAuthError } from '@/lib/integrations/garmin/garmin-mobile-auth';
import { encryptGarminToken, syncGarminHealth } from '@/lib/integrations/garmin/garmin-sync';
import {
  GarminLoginError,
  loginWithCredentials,
  type GarminTokens,
} from '@/lib/integrations/garmin/garmin';
import { enableProviderForAllCoveredClasses } from '@/lib/integrations/source-prefs';
import { persistSourcePrefsMutation } from '@/lib/integrations/source-prefs-store';
import { gateProviderConnect } from '@/lib/privacy/gate-provider-connect';
import { prisma } from '@/lib/prisma';
import { updateRecordsForTypes } from '@/lib/training/records/records';

export const maxDuration = 120;

const garminConnectSchema = z.object({
  username: z.string().min(1, 'E-mail requis').max(250),
  password: z.string().min(1, 'Mot de passe requis').max(250),
});

async function persistConnectedAccount(
  athleteId: string,
  tokens: GarminTokens,
  displayName: string | null,
  fullName: string | null,
): Promise<void> {
  const oauth1TokenEnc = encryptGarminToken(tokens.oauth1);
  const oauth2TokenEnc = encryptGarminToken(tokens.oauth2);

  await prisma.garminAccount.upsert({
    where: { athleteId },
    create: { athleteId, displayName, fullName, oauth1TokenEnc, oauth2TokenEnc },
    update: { displayName, fullName, oauth1TokenEnc, oauth2TokenEnc },
  });

  await persistSourcePrefsMutation(athleteId, (prefs) =>
    enableProviderForAllCoveredClasses(prefs, 'garmin'),
  );
}

async function runInitialSync(athleteId: string): Promise<void> {
  try {
    const [health, activities] = await Promise.all([
      syncGarminHealth(athleteId, {}),
      syncGarminActivities(athleteId, {}),
    ]);
    if (activities.changedTypes.length > 0) {
      await updateRecordsForTypes(athleteId, activities.changedTypes);
    }
    await onProviderSyncCompleted(
      athleteId,
      [
        {
          provider: 'garmin',
          imported: activities.imported,
          updated: activities.updated + activities.merged,
          observationCount: health.updated,
          activityIds: activities.importedActivityIds,
        },
      ],
      undefined,
      { skipRecordUpdate: activities.changedTypes.length > 0 },
    );
  } catch (syncError) {
    console.error('[api/v1/garmin/connect] background sync error:', syncError);
  }
}

function handleMobileAuthError(error: GarminMobileAuthError): NextResponse {
  switch (error.kind) {
    case 'invalid_credentials':
      return NextResponse.json(
        { error: 'Identifiants Garmin incorrects. Vérifie ton e-mail et ton mot de passe.' },
        { status: 401 },
      );
    case 'mfa_required':
      return NextResponse.json(
        {
          error:
            'La double authentification (MFA) est activée sur ton compte Garmin. Désactive le MFA temporairement ou utilise le web.',
        },
        { status: 400 },
      );
    case 'rate_limited':
      return NextResponse.json(
        { error: 'Trop de tentatives auprès de Garmin. Réessaie dans quelques minutes.' },
        { status: 429 },
      );
    default:
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function handleConnectError(error: unknown): NextResponse {
  console.error('[api/v1/garmin/connect] connection failed:', error);
  if (error instanceof GarminMobileAuthError) {
    return handleMobileAuthError(error);
  }
  if (error instanceof GarminLoginError && error.reason === 'invalid_credentials') {
    return NextResponse.json(
      { error: 'Identifiants Garmin incorrects. Vérifie ton e-mail et ton mot de passe.' },
      { status: 401 },
    );
  }
  const message = error instanceof Error ? error.message : 'Connexion à Garmin impossible.';
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Native in-app Garmin connect endpoint (ADR-040 canonical v1 contract).
 * Authenticated by Clerk Bearer token from the iOS app.
 */
export async function POST(request: NextRequest) {
  try {
    const consentBlock = await gateProviderConnect(request, 'garmin', 'json');
    if (consentBlock) {
      return consentBlock;
    }

    const body = await request.json().catch(() => ({}));
    const parsed = garminConnectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Adresse e-mail et mot de passe Garmin requis.' },
        { status: 400 },
      );
    }

    const athleteId = await getCurrentAthleteId();
    const { tokens, profile } = await loginWithCredentials(
      parsed.data.username,
      parsed.data.password,
    );

    const displayName = profile.displayName ?? profile.fullName ?? 'Garmin';
    await persistConnectedAccount(athleteId, tokens, displayName, profile.fullName ?? null);
    try {
      after(() => void runInitialSync(athleteId));
    } catch {
      void runInitialSync(athleteId);
    }

    return NextResponse.json({ success: true, displayName });
  } catch (error) {
    return handleConnectError(error);
  }
}
