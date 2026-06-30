import { NextRequest, NextResponse } from 'next/server';
import { getHealthEntries } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get('days'));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 365;
    const entries = await getHealthEntries(days);
    return NextResponse.json(entries);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger les données santé' }, { status: 500 });
  }
}
