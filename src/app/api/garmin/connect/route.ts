import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { onProviderSyncCompleted } from '@/lib/athlete-state/orchestrator';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { syncGarminActivities } from '@/lib/integrations/garmin/garmin-activity-sync';
import { connectGarmin, syncGarminHealth } from '@/lib/integrations/garmin/garmin-sync';
import { GarminLoginError } from '@/lib/integrations/garmin/garmin';
import { sanitizeDataClass } from '@/lib/integrations/oauth-return';
import {
  enableProviderForAllCoveredClasses,
  enableProviderForClass,
} from '@/lib/integrations/source-prefs';
import { persistSourcePrefsMutation } from '@/lib/integrations/source-prefs-store';
import { updateRecordsForTypes } from '@/lib/training/records';

export const maxDuration = 300;

export const garminConnectSchema = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
  dataClass: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = garminConnectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const athleteId = await getCurrentAthleteId();
    const profile = await connectGarmin(athleteId, parsed.data.username, parsed.data.password);

    const dataClass = sanitizeDataClass(parsed.data.dataClass);
    await persistSourcePrefsMutation(athleteId, (prefs) =>
      dataClass
        ? enableProviderForClass(prefs, dataClass, 'garmin')
        : enableProviderForAllCoveredClasses(prefs, 'garmin'),
    );

    // First pull right after connect — health + activities land without a manual sync.
    after(async () => {
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
      } catch (error) {
        console.error('[api/garmin/connect] background sync failed:', error);
      }
    });

    return NextResponse.json({ success: true, profile, syncStarted: true });
  } catch (error) {
    console.error('[api/garmin/connect]', error);
    const status = error instanceof GarminLoginError && error.reason === 'rate_limited' ? 429 : 401;
    return NextResponse.json({ error: garminConnectErrorMessage(error) }, { status });
  }
}

function garminConnectErrorMessage(error: unknown): string {
  if (error instanceof GarminLoginError) {
    switch (error.reason) {
      case 'rate_limited':
        return "Garmin limite temporairement les connexions (trop de requêtes sur son service, indépendamment de ton compte). Réessaie dans quelques heures — tes identifiants sont corrects, ce n'est pas la cause.";
      case 'account_locked':
        return 'Ton compte Garmin est verrouillé. Ouvre connect.garmin.com dans un navigateur pour le déverrouiller, puis réessaie ici.';
      case 'update_phone':
        return 'Garmin te demande de mettre à jour ton numéro de téléphone. Connecte-toi sur connect.garmin.com pour compléter cette étape, puis réessaie ici.';
      case 'blocked_or_mfa':
        return 'Connexion Garmin refusée. Si le MFA est activé, désactive-le temporairement. Si tes identifiants sont corrects et que ça persiste, Garmin bloque probablement cette connexion automatisée — réessaie plus tard.';
      case 'invalid_credentials':
      case 'unknown':
      default:
        return 'Connexion Garmin échouée. Vérifie tes identifiants.';
    }
  }
  return 'Connexion Garmin échouée.';
}
