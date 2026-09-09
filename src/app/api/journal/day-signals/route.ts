import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { buildJournalDaySignals } from '@/lib/health/journal-day-signals';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const trainingDayId = request.nextUrl.searchParams.get('day');
    if (!trainingDayId || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
      return NextResponse.json({ error: 'Paramètre day requis (YYYY-MM-DD)' }, { status: 400 });
    }
    const signals = await buildJournalDaySignals(prisma, athleteId, trainingDayId);
    return NextResponse.json(signals);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger les signaux du journal' },
      { status: 500 },
    );
  }
}
