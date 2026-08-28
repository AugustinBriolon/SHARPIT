import { NextRequest, NextResponse, after } from 'next/server';
import { buildActivityUpdateData } from '@/lib/activity/activity-service';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  removeManualActivityObservations,
  syncManualActivityObservations,
} from '@/lib/manual-observation-sync';
import { deleteActivity, getActivityById, updateActivity } from '@/lib/queries';
import { updateRecordsForTypesSafe } from '@/lib/training/records';
import { updateActivitySchema } from '@/lib/validators/activity';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    const activity = await getActivityById(athleteId, id);

    if (!activity) {
      return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger la séance' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    const body = await request.json();
    const parsed = updateActivitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await getActivityById(athleteId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
    }

    const newType = parsed.data.type ?? existing.type;
    const activity = await updateActivity(
      athleteId,
      id,
      buildActivityUpdateData({
        ...parsed.data,
        type: newType,
      }) as Parameters<typeof updateActivity>[2],
    );
    if (!activity) {
      return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
    }

    // Instant UX: return the updated row immediately; twin sync must not block PATCH.
    after(async () => {
      try {
        await syncManualActivityObservations(activity);
        await updateRecordsForTypesSafe(athleteId, [existing.type, newType]);
      } catch (error) {
        console.error('[activities/PATCH] background sync', error);
      }
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de mettre à jour la séance' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    const existing = await getActivityById(athleteId, id);
    await deleteActivity(athleteId, id);
    await removeManualActivityObservations(athleteId, id);
    if (existing) {
      await updateRecordsForTypesSafe(athleteId, [existing.type]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de supprimer la séance' }, { status: 500 });
  }
}
