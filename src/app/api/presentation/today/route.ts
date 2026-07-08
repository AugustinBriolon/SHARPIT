import { NextRequest, NextResponse } from 'next/server';
import { buildTodayPresentationViewModel } from '@/lib/presentation/today';

export const dynamic = 'force-dynamic';

function isValidTrainingDayId(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId');

  if (!trainingDayId || !isValidTrainingDayId(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId est requis et doit être au format YYYY-MM-DD' },
      { status: 400 },
    );
  }

  try {
    const viewModel = await buildTodayPresentationViewModel(trainingDayId);
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/today]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Today' }, { status: 500 });
  }
}
