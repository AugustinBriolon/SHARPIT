import { NextRequest, NextResponse } from 'next/server';
import { ActivityType } from '@prisma/client';
import { buildActivityCreateData } from '@/lib/activity-service';
import { runActivityNarrativeAnalysis } from '@/lib/activity-narrative';
import { syncManualActivityObservations } from '@/lib/manual-observation-sync';
import { createActivity, getActivitiesList } from '@/lib/queries';
import { updateRecordsForTypesSafe } from '@/lib/records';
import { createActivitySchema } from '@/lib/validators/activity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ActivityType | null;
    const limit = searchParams.get('limit');
    const sinceDays = searchParams.get('sinceDays');

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
