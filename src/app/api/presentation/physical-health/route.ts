import { NextRequest, NextResponse } from 'next/server';
import { buildPhysicalHealthPresentationViewModel } from '@/lib/presentation/physical-health';

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
    const viewModel = await buildPhysicalHealthPresentationViewModel(trainingDayId);
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/physical-health]', error);
    return NextResponse.json(
      { error: 'Impossible de produire la vue santé physique' },
      { status: 500 },
    );
  }
}
