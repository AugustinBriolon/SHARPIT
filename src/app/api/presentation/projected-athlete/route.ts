import { NextRequest, NextResponse } from 'next/server';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { buildProjectedAthletePresentationViewModel } from '@/lib/presentation/projected-athlete';

export const dynamic = 'force-dynamic';

const VALID_HORIZONS = new Set<number>([1, 3, 7, 14]);

function isValidTrainingDayId(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const horizonParam = searchParams.get('horizon');
  const trainingDayId = searchParams.get('trainingDayId');

  const horizonDays = horizonParam ? Number.parseInt(horizonParam, 10) : 7;
  if (!VALID_HORIZONS.has(horizonDays)) {
    return NextResponse.json({ error: 'horizon doit être 1, 3, 7 ou 14' }, { status: 400 });
  }

  if (trainingDayId && !isValidTrainingDayId(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId doit être au format YYYY-MM-DD' },
      { status: 400 },
    );
  }

  try {
    const viewModel = await buildProjectedAthletePresentationViewModel({
      horizonDays: horizonDays as ProjectionHorizonDays,
      anchorTrainingDayId: trainingDayId ?? undefined,
    });
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/projected-athlete]', error);
    return NextResponse.json(
      { error: 'Impossible de produire la projection athlète' },
      { status: 500 },
    );
  }
}
