import { NextRequest, NextResponse } from 'next/server';
import { getBodyCompositionMeasurements } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const days = Math.min(Number(request.nextUrl.searchParams.get('days') ?? 90), 365 * 3);
  const entries = await getBodyCompositionMeasurements(days);
  return NextResponse.json(entries);
}
