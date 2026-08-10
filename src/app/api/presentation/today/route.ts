import { NextRequest, NextResponse } from 'next/server';
import { buildTodayPresentationViewModel } from '@/lib/presentation/today';
import { ensureMorningRecalibration } from '@/lib/morning-recalibration/service';

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
    // Write side-effect stays on the route (ADR-007 incremental): ensure proposal
    // exists before read-only presentation projection.
    const morningRecalibration = await ensureMorningRecalibration(trainingDayId).catch((error) => {
      console.error('[api/presentation/today/morning-recalibration]', error);
      return null;
    });

    const viewModel = await buildTodayPresentationViewModel(trainingDayId, {
      morningRecalibration,
    });
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/today]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Today' }, { status: 500 });
  }
}
