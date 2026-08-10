import { NextRequest, NextResponse } from 'next/server';
import { parseISO } from 'date-fns';
import { getHealthEntries } from '@/lib/queries';

export async function GET(request: NextRequest) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get('days'));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 365;
  const dateParam = searchParams.get('date');
  const refDate = dateParam ? parseISO(dateParam) : new Date();

  try {
    const entries = await getHealthEntries(days, refDate);
    return NextResponse.json(entries);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger les données santé' }, { status: 500 });
  }
}
