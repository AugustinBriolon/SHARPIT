import { NextResponse } from 'next/server';
import { ensureMorningRecalibration } from '@/lib/morning-recalibration/service';
import { todayTrainingDayId } from '@/lib/health/wellness-checkin';

/** Evaluate / return today's morning session recalibration proposal (idempotent). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { trainingDayId?: string };
    const trainingDayId = body.trainingDayId ?? todayTrainingDayId();
    const { presentation: proposal } = await ensureMorningRecalibration(trainingDayId);
    return NextResponse.json({ proposal });
  } catch (error) {
    console.error('[morning-recalibration]', error);
    return NextResponse.json({ error: 'Impossible d’évaluer l’ajustement' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId') ?? todayTrainingDayId();

  try {
    const { presentation: proposal } = await ensureMorningRecalibration(trainingDayId);
    return NextResponse.json({ proposal });
  } catch (error) {
    console.error('[morning-recalibration]', error);
    return NextResponse.json({ error: 'Impossible d’évaluer l’ajustement' }, { status: 500 });
  }
}
