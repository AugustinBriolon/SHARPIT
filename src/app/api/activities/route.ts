import { NextRequest, NextResponse, after } from 'next/server';
import { ActivityType } from '@prisma/client';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import { enrichActivityObservedContext } from '@/lib/activity/detail/enrich-observed-context';
import { buildActivityCreateData } from '@/lib/activity/activity-service';
import { runActivityNarrativeAnalysis } from '@/lib/activity/narrative/activity-narrative';
import { syncManualActivityObservations } from '@/lib/manual-observation-sync';
import { createActivity, getActivitiesList } from '@/lib/queries';
import { prisma } from '@/lib/prisma';
import { updateRecordsForTypesSafe } from '@/lib/training/records';
import { createActivitySchema } from '@/lib/validators/activity';

export async function GET(request: NextRequest) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as ActivityType | null;
  const limit = searchParams.get('limit');
  const sinceDays = searchParams.get('sinceDays');

  try {
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
    // Observations do not mutate the returned activity JSON; kept awaited so ingest
    // finishes before Instant UX continues (downstream twin consistency).
    await syncManualActivityObservations(activity);

    const activityId = activity.id;
    const activityType = parsed.data.type;
    const shouldEnrich =
      sportSupportsOutdoorContext(activityType) &&
      parsed.data.observedLocationLat != null &&
      parsed.data.observedLocationLng != null;

    // Return the createActivity row immediately (Instant UX). Weather / observed
    // context / narrative / auto-link land via later invalidate+refetch once
    // after() work completes — do not block 201 on enrich.
    after(async () => {
      try {
        await updateRecordsForTypesSafe([activityType]);
      } catch (error) {
        console.error('[activities/POST] records', error);
      }

      if (shouldEnrich) {
        try {
          await enrichActivityObservedContext(prisma, activityId);
        } catch (error) {
          console.error('[activities/POST] enrich-context', error);
        }
      }

      try {
        await runActivityNarrativeAnalysis(activityId);
      } catch (error) {
        console.error('[activities/POST] narrative', error);
      }

      let plannedSessionIdsToAnalyze: string[] = [];
      try {
        const { autoLinkActivities } =
          await import('@/lib/planned-session/linking/session-linking');
        plannedSessionIdsToAnalyze = (await autoLinkActivities([activityId])).sessionIds;
      } catch (error) {
        console.error('[activities/POST] auto-link', error);
      }

      try {
        const { scheduleBackgroundTasks } = await import('@/lib/athlete-state/background');
        scheduleBackgroundTasks({
          activityIds: [activityId],
          regenerateBriefing: false,
          plannedSessionIdsToAnalyze,
        });
      } catch (error) {
        console.error('[activities/POST] background', error);
      }
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de créer la séance' }, { status: 500 });
  }
}
