import { NextRequest, NextResponse, after } from 'next/server';
import { format } from 'date-fns';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { prepareNutritionCoachReading } from '@/lib/nutrition/analysis/nutrition-analysis';
import { buildNutritionViewModel } from '@/lib/presentation/nutrition/nutrition';

/** Generation runs in `after()`; the coach model answers in ~10–20 s. */
export const maxDuration = 60;

/** The reading is an extra — a failure there must never take the nutrition page down. */
async function prepareReadingSafely(athleteId: string, dayId: string) {
  try {
    return await prepareNutritionCoachReading(athleteId, dayId);
  } catch (error) {
    console.error('[api/presentation/nutrition] coach reading', error);
    return { view: null, generate: null };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId');
  const fallbackDayId = format(new Date(), 'yyyy-MM-dd');

  if (trainingDayId && !/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId doit être au format YYYY-MM-DD' },
      { status: 400 },
    );
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const dayId = trainingDayId ?? fallbackDayId;
    const [viewModel, reading] = await Promise.all([
      buildNutritionViewModel(athleteId, dayId),
      prepareReadingSafely(athleteId, dayId),
    ]);
    if (reading.generate) {
      after(reading.generate);
    }
    return NextResponse.json({
      viewModel: { ...viewModel, coachReading: viewModel.connected ? reading.view : null },
    });
  } catch (error) {
    console.error('[api/presentation/nutrition]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Nutrition' }, { status: 500 });
  }
}
