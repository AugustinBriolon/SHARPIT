import { NextRequest, NextResponse } from 'next/server';
import { buildActivityUpdateData } from '@/lib/activity-service';
import {
  removeManualActivityObservations,
  syncManualActivityObservations,
} from '@/lib/manual-observation-sync';
import { deleteActivity, getActivityById, updateActivity } from '@/lib/queries';
import { updateRecordsForTypesSafe } from '@/lib/records';
import { updateActivitySchema } from '@/lib/validators/activity';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const activity = await getActivityById(id);

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
    const body = await request.json();
    const parsed = updateActivitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await getActivityById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
    }

    const newType = parsed.data.type ?? existing.type;
    const activity = await updateActivity(
      id,
      buildActivityUpdateData({
        ...parsed.data,
        type: newType,
      }) as Parameters<typeof updateActivity>[1],
    );
    await syncManualActivityObservations(activity);

    // L'ancien et le nouveau type peuvent différer : on recalcule les deux.
    await updateRecordsForTypesSafe([existing.type, newType]);

    return NextResponse.json(activity);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de mettre à jour la séance' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await getActivityById(id);
    await deleteActivity(id);
    await removeManualActivityObservations(id);
    if (existing) await updateRecordsForTypesSafe([existing.type]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de supprimer la séance' }, { status: 500 });
  }
}
