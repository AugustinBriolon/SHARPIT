import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { parseDataDaysRequest } from '@/lib/presentation/data-days';
import { loadDataDays } from '@/lib/presentation/data-days-server';

export async function GET(request: NextRequest) {
  const parsed = parseDataDaysRequest(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const days = await loadDataDays(athleteId, parsed.request);
    return NextResponse.json({ days });
  } catch (error) {
    console.error('[api/presentation/data-days]', error);
    return NextResponse.json(
      { error: 'Impossible de charger les jours disponibles' },
      { status: 500 },
    );
  }
}
