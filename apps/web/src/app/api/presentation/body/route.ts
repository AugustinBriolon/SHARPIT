import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { buildBodyPresentationViewModel } from '@sharpit/server/lib/presentation/body/body';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawDays = searchParams.get('days');

  let days: number | null | undefined = 90;
  if (rawDays === null) {
    days = 90;
  } else if (rawDays === 'all') {
    days = null;
  } else {
    const parsed = Number(rawDays);
    days = Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const viewModel = await buildBodyPresentationViewModel(athleteId, days);
    return NextResponse.json({ viewModel });
  } catch (error) {
    console.error('[api/presentation/body]', error);
    return NextResponse.json({ error: 'Impossible de produire la vue Corps' }, { status: 500 });
  }
}
