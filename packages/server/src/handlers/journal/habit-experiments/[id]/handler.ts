import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { loadJournalHabitExperiments } from '@sharpit/server/lib/journal/journal-habit-experiment-load';
import { toHabitExperimentView } from '@sharpit/app/lib/journal/journal-habit-experiment-view';
import { awaitRequest } from '@sharpit/app/lib/next/await-request';
import { prisma } from '@sharpit/db/client';
import { trainingDayIdForNow } from '@sharpit/core/training/training-day';

type RouteContext = { params: Promise<{ id: string }> };

const stopSchema = z.object({ cancelled: z.literal(true) });

/** Stop a running test: it becomes « abandonné ». A reviewed test is history and stays as read. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  await awaitRequest();

  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    if (!stopSchema.safeParse(await request.json()).success) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
    }
    const today = trainingDayIdForNow();
    const current = await loadJournalHabitExperiments(prisma, athleteId, today);
    if (!current.some((experiment) => experiment.id === id && experiment.status === 'running')) {
      return NextResponse.json({ error: 'Aucun test en cours à arrêter' }, { status: 404 });
    }
    await prisma.journalHabitExperiment.updateMany({
      where: { id, athleteId, cancelledAt: null },
      data: { cancelledAt: new Date() },
    });
    const experiments = await loadJournalHabitExperiments(prisma, athleteId, today);
    return NextResponse.json({ experiments: experiments.map(toHabitExperimentView) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible d’arrêter le test' }, { status: 500 });
  }
}
