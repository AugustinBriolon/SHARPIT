import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import {
  getMorningWellnessCheckin,
  hasMorningWellnessCheckin,
  submitMorningWellnessCheckin,
  todayTrainingDayId,
} from '@sharpit/server/lib/journal/wellness-checkin';
import { wellnessCheckinSchema } from '@sharpit/server/lib/validators/wellness-checkin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId') ?? todayTrainingDayId();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId doit être au format YYYY-MM-DD' },
      { status: 400 },
    );
  }

  const athleteId = await getCurrentAthleteId();
  const [completed, entry] = await Promise.all([
    hasMorningWellnessCheckin(athleteId, trainingDayId),
    getMorningWellnessCheckin(athleteId, trainingDayId),
  ]);
  return NextResponse.json({
    trainingDayId,
    completed,
    entry,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = wellnessCheckinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const trainingDayId =
      typeof body?.trainingDayId === 'string' ? body.trainingDayId : todayTrainingDayId();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
      return NextResponse.json(
        { error: 'trainingDayId doit être au format YYYY-MM-DD' },
        { status: 400 },
      );
    }

    const athleteId = await getCurrentAthleteId();
    const result = await submitMorningWellnessCheckin(athleteId, trainingDayId, parsed.data);
    return NextResponse.json(
      { trainingDayId, completed: true, alreadyCompleted: result.alreadyCompleted },
      { status: result.alreadyCompleted ? 200 : 201 },
    );
  } catch (error) {
    console.error('[api/wellness-checkin]', error);
    return NextResponse.json({ error: "Impossible d'enregistrer le ressenti" }, { status: 500 });
  }
}
