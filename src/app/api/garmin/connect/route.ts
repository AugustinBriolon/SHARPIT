import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { onProviderSyncCompleted } from '@/lib/athlete-state/orchestrator';
import { syncGarminActivities } from '@/lib/integrations/garmin/garmin-activity-sync';
import { connectGarmin, syncGarminHealth } from '@/lib/integrations/garmin/garmin-sync';
import { updateRecordsForTypes } from '@/lib/training/records';

export const maxDuration = 300;

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const profile = await connectGarmin(parsed.data.username, parsed.data.password);

    // First pull right after connect — health + activities land without a manual sync.
    after(async () => {
      try {
        const [health, activities] = await Promise.all([
          syncGarminHealth({}),
          syncGarminActivities({}),
        ]);
        if (activities.changedTypes.length > 0) {
          await updateRecordsForTypes(activities.changedTypes);
        }
        await onProviderSyncCompleted(
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
    console.error(error);
    const message =
      error instanceof Error
        ? 'Connexion Garmin échouée. Vérifie tes identifiants (et désactive le MFA si activé).'
        : 'Connexion Garmin échouée.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
