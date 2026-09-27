import { NextRequest, NextResponse, after } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { isProAthlete } from '@sharpit/server/lib/access/is-pro-athlete';
import { prepareNutritionCoachReading } from '@sharpit/server/lib/nutrition/analysis/nutrition-analysis';
import { buildNutritionViewModel } from '@sharpit/server/lib/presentation/nutrition/nutrition';
import {
  projectV1Nutrition,
  V1_NUTRITION_HISTORY_DAYS,
  type V1NutritionCoachReading,
  type V1NutritionHistoryRow,
} from '@sharpit/server/lib/presentation/v1/nutrition';
import { prisma } from '@sharpit/db/client';

/** The reading is an extra — a failure there must never take the day down. */
async function prepareReadingSafely(athleteId: string, dayId: string) {
  try {
    return await prepareNutritionCoachReading(athleteId, dayId);
  } catch (error) {
    console.error('[api/v1/nutrition] coach reading', error);
    return { view: null, generate: null };
  }
}

/** The 14 days the regularity reads, as the food log stored them (stored at UTC midnight). */
async function loadHistoryRows(
  athleteId: string,
  trainingDayId: string,
): Promise<V1NutritionHistoryRow[]> {
  const end = new Date(`${trainingDayId}T00:00:00.000Z`);
  const start = new Date(end.getTime() - (V1_NUTRITION_HISTORY_DAYS - 1) * 24 * 60 * 60 * 1000);
  const rows = await prisma.dailyNutrition.findMany({
    where: { athleteId, date: { gte: start, lte: end } },
    select: { date: true, calories: true, goalCalories: true, exerciseCalories: true },
  });
  return rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    calories: row.calories,
    goalCalories: row.goalCalories,
    exerciseCalories: row.exerciseCalories,
  }));
}

/** No log, no reading; below Pro, the reading is announced rather than served. */
function coachReadingFor(
  connected: boolean,
  reading: Awaited<ReturnType<typeof prepareReadingSafely>> | null,
): V1NutritionCoachReading {
  if (!connected) {
    return null;
  }
  return reading ? reading.view : { state: 'pro_required' };
}

/**
 * The day's food log for native clients (ADR-040): intake against goals, meals and entries,
 * the coach's reading, and a week of calories for the day picker. The log is the athlete's
 * own data and open to all; the coach's reading is what SHARPIT adds, so it is SharpIt Pro
 * — below Pro it is neither generated nor served, only announced as `pro_required`.
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
    const isPro = await isProAthlete(athleteId);
    const [viewModel, reading, historyRows] = await Promise.all([
      buildNutritionViewModel(athleteId, trainingDayId),
      isPro ? prepareReadingSafely(athleteId, trainingDayId) : null,
      loadHistoryRows(athleteId, trainingDayId),
    ]);
    if (reading?.generate) {
      after(reading.generate);
    }
    return NextResponse.json(
      projectV1Nutrition(
        viewModel,
        trainingDayId,
        coachReadingFor(viewModel.connected, reading),
        historyRows,
      ),
    );
  } catch (error) {
    console.error('[api/v1/nutrition]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Nutrition' }, { status: 500 });
  }
}
