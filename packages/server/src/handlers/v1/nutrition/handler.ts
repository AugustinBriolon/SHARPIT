import { NextRequest, NextResponse, after } from 'next/server';
import { hasProAccess } from '@sharpit/app/lib/access/tier';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { prisma } from '@sharpit/db/client';
import { prepareNutritionCoachReading } from '@sharpit/server/lib/nutrition/analysis/nutrition-analysis';
import { buildNutritionViewModel } from '@sharpit/server/lib/presentation/nutrition/nutrition';
import { projectV1Nutrition } from '@sharpit/server/lib/presentation/v1/nutrition';

/** The reading is an extra — a failure there must never take the day down. */
async function prepareReadingSafely(athleteId: string, dayId: string) {
  try {
    return await prepareNutritionCoachReading(athleteId, dayId);
  } catch (error) {
    console.error('[api/v1/nutrition] coach reading', error);
    return { view: null, generate: null };
  }
}

async function isProAthlete(athleteId: string): Promise<boolean> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { tier: true },
  });
  return hasProAccess(profile?.tier ?? 'FREE');
}

/**
 * The day's food log for native clients (ADR-040): intake against goals, meals and entries,
 * the coach's reading, and a week of calories for the day picker. SharpIt Pro only — the
 * gate is here, whatever screen reaches the route.
 */
export async function GET(request: NextRequest) {
  const trainingDayId = new URL(request.url).searchParams.get('trainingDayId');

  if (!trainingDayId || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId est requis et doit être au format YYYY-MM-DD' },
      { status: 400 },
    );
  }

  try {
    const athleteId = await getCurrentAthleteId();
    if (!(await isProAthlete(athleteId))) {
      return NextResponse.json({ error: 'pro_required' }, { status: 403 });
    }
    const [viewModel, reading] = await Promise.all([
      buildNutritionViewModel(athleteId, trainingDayId),
      prepareReadingSafely(athleteId, trainingDayId),
    ]);
    if (reading.generate) {
      after(reading.generate);
    }
    return NextResponse.json(
      projectV1Nutrition(
        { ...viewModel, coachReading: viewModel.connected ? reading.view : null },
        trainingDayId,
      ),
    );
  } catch (error) {
    console.error('[api/v1/nutrition]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Nutrition' }, { status: 500 });
  }
}
