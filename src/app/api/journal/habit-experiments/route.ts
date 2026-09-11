import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  EXPERIMENT_WINDOW_DAYS,
  ONE_TEST_AT_A_TIME_MESSAGE,
  isExperimentFactorId,
} from '@/lib/journal/journal-habit-experiment';
import { loadJournalHabitExperiments } from '@/lib/journal/journal-habit-experiment-load';
import { toHabitExperimentView } from '@/lib/journal/journal-habit-experiment-view';
import { awaitRequest } from '@/lib/next/await-request';
import { prisma } from '@/lib/prisma';
import { addTrainingDays, trainingDayIdForNow } from '@/lib/training/training-day';

const startSchema = z.object({
  factorId: z.string().max(80).refine(isExperimentFactorId),
  intent: z.enum(['REMOVE', 'ADD']),
});

async function experimentsResponse(athleteId: string, today: string, status = 200) {
  const experiments = await loadJournalHabitExperiments(prisma, athleteId, today);
  return NextResponse.json({ experiments: experiments.map(toHabitExperimentView) }, { status });
}

export async function GET() {
  // Outside try: Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    return await experimentsResponse(athleteId, trainingDayIdForNow());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger tes tests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const parsed = startSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Test invalide' }, { status: 400 });
    }
    const today = trainingDayIdForNow();
    // DB gate (not evaluate-at-read): any open row in the live window blocks a second lever.
    const open = await prisma.journalHabitExperiment.findFirst({
      where: {
        athleteId,
        cancelledAt: null,
        startDayId: { gte: addTrainingDays(today, -(EXPERIMENT_WINDOW_DAYS + 2)) },
      },
      select: { id: true },
    });
    if (open) {
      return NextResponse.json({ error: ONE_TEST_AT_A_TIME_MESSAGE }, { status: 409 });
    }
    await prisma.journalHabitExperiment.create({
      data: {
        athleteId,
        factorId: parsed.data.factorId,
        intent: parsed.data.intent,
        startDayId: today,
      },
    });
    return await experimentsResponse(athleteId, today, 201);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de lancer le test' }, { status: 500 });
  }
}
