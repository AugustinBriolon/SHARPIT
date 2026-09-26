import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { onProviderSyncCompleted } from '@sharpit/server/lib/athlete-state/orchestrator';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { syncGarminActivities } from '@sharpit/server/lib/integrations/garmin/garmin-activity-sync';
import {
  importGarminDiTokenStore,
  syncGarminHealth,
} from '@sharpit/server/lib/integrations/garmin/garmin-sync';
import { GarminTokenStoreError } from '@sharpit/server/lib/integrations/garmin/garmin-tokenstore';
import { sanitizeDataClass } from '@sharpit/app/lib/integrations/oauth-public-origin';
import {
  enableProviderForAllCoveredClasses,
  enableProviderForClass,
} from '@sharpit/app/lib/integrations/source-prefs';
import { persistSourcePrefsMutation } from '@sharpit/server/lib/integrations/source-prefs-store';
import { updateRecordsForTypes } from '@sharpit/server/lib/training/records/records';
import { gateProviderConnect } from '@sharpit/server/lib/privacy/gate-provider-connect';

import { garminImportTokensSchema } from './schema';

/** Authenticated import of python-garminconnect ≥ 0.3 tokenstore JSON. */
export async function POST(request: NextRequest) {
  try {
    const consentBlock = await gateProviderConnect(request, 'garmin', 'json');
    if (consentBlock) {
      return consentBlock;
    }

    const body = await request.json();
    const parsed = garminImportTokensSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Colle le JSON garmin_tokens.json (di_token + di_refresh_token).' },
        { status: 400 },
      );
    }

    const athleteId = await getCurrentAthleteId();
    let store: unknown = parsed.data.tokenStore;
    if (typeof store === 'string') {
      try {
        store = JSON.parse(store) as unknown;
      } catch {
        return NextResponse.json({ error: 'JSON de jetons Garmin invalide.' }, { status: 400 });
      }
    }

    const profile = await importGarminDiTokenStore(athleteId, store);

    const dataClass = sanitizeDataClass(parsed.data.dataClass);
    await persistSourcePrefsMutation(athleteId, (prefs) =>
      dataClass
        ? enableProviderForClass(prefs, dataClass, 'garmin')
        : enableProviderForAllCoveredClasses(prefs, 'garmin'),
    );

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
        console.error('[api/garmin/import-tokens] background sync failed:', error);
      }
    });

    return NextResponse.json({ success: true, profile, syncStarted: true });
  } catch (error) {
    console.error('[api/garmin/import-tokens]', error);
    if (error instanceof GarminTokenStoreError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Import Garmin échoué.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
