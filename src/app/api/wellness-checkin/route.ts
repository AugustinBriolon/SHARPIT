import { NextRequest, NextResponse } from 'next/server';
import {
  hasMorningWellnessCheckin,
  submitMorningWellnessCheckin,
  todayTrainingDayId,
} from '@/lib/health/wellness-checkin';
import { wellnessCheckinSchema } from '@/lib/validators/wellness-checkin';

export const dynamic = 'force-dynamic';

const ATHLETE_ID = 'default';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId') ?? todayTrainingDayId();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId doit être au format YYYY-MM-DD' },
      { status: 400 },
    );
  }

  const completed = await hasMorningWellnessCheckin(ATHLETE_ID, trainingDayId);
  return NextResponse.json({ trainingDayId, completed });
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

    const result = await submitMorningWellnessCheckin(trainingDayId, parsed.data);
    return NextResponse.json(
      { trainingDayId, completed: true, alreadyCompleted: result.alreadyCompleted },
      { status: result.alreadyCompleted ? 200 : 201 },
    );
  } catch (error) {
    console.error('[api/wellness-checkin]', error);
    return NextResponse.json({ error: "Impossible d'enregistrer le ressenti" }, { status: 500 });
  }
}
