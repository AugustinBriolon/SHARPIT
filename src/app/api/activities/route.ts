import { NextRequest, NextResponse } from 'next/server';
import { ActivityType } from '@prisma/client';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import { enrichActivityObservedContext } from '@/lib/activity/enrich-observed-context';
import { buildActivityCreateData } from '@/lib/activity-service';
import { runActivityNarrativeAnalysis } from '@/lib/activity-narrative';
import { syncManualActivityObservations } from '@/lib/manual-observation-sync';
import { createActivity, getActivitiesList } from '@/lib/queries';
import { prisma } from '@/lib/prisma';
import { updateRecordsForTypesSafe } from '@/lib/records';
import { createActivitySchema } from '@/lib/validators/activity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ActivityType | null;
    const limit = searchParams.get('limit');
    const sinceDays = searchParams.get('sinceDays');

    // Weather / narrative enrichment runs on athlete-state refresh & provider sync —
    // never as a side-effect of listing activities (avoids Neon work on every GET).

    const activities = await getActivitiesList({
      type: type && Object.values(ActivityType).includes(type) ? type : undefined,
      limit: limit ? Number(limit) : undefined,
      sinceDays: sinceDays ? Number(sinceDays) : undefined,
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger les séances' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createActivitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const activity = await createActivity(
      buildActivityCreateData(parsed.data) as Parameters<typeof createActivity>[0],
    );
    await syncManualActivityObservations(activity);

    await updateRecordsForTypesSafe([parsed.data.type]);

    if (
      sportSupportsOutdoorContext(parsed.data.type) &&
      parsed.data.observedLocationLat != null &&
      parsed.data.observedLocationLng != null
    ) {
      try {
        await enrichActivityObservedContext(prisma, activity.id);
        const refreshed = await prisma.activity.findUnique({ where: { id: activity.id } });
        if (refreshed) {
          return NextResponse.json(refreshed, { status: 201 });
        }
      } catch (error) {
        console.error('[activities/POST] enrich-context', error);
      }
    }

    try {
      await runActivityNarrativeAnalysis(activity.id);
    } catch (error) {
      console.error('[activities/POST] narrative', error);
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de créer la séance' }, { status: 500 });
  }
}
