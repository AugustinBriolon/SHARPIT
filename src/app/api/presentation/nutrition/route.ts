import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { buildNutritionViewModel } from '@/lib/presentation/nutrition';

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
    const viewModel = await buildNutritionViewModel(trainingDayId ?? fallbackDayId);
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/nutrition]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Nutrition' }, { status: 500 });
  }
}
