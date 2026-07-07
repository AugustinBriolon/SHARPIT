import { NextRequest, NextResponse } from 'next/server';
import { getBodyCompositionMeasurements } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rawDays = request.nextUrl.searchParams.get('days');
  const parsedDays = rawDays != null ? Number(rawDays) : undefined;
  const days =
    parsedDays != null && Number.isFinite(parsedDays) && parsedDays > 0
      ? Math.min(parsedDays, 365 * 20)
      : undefined;
  const entries = await getBodyCompositionMeasurements(days);
  return NextResponse.json(entries);
}
