import { NextRequest, NextResponse } from 'next/server';
import { buildAdaptationViewModel } from '@/lib/presentation/adaptation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId');

  if (!trainingDayId || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId est requis et doit être au format YYYY-MM-DD' },
      { status: 400 },
    );
  }

  try {
    const viewModel = await buildAdaptationViewModel(trainingDayId);
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/adaptation]', error);
    return NextResponse.json(
      { error: 'Impossible de produire la vue Adaptation' },
      { status: 500 },
    );
  }
}
