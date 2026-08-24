import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { resolveDefaultActivityLocation } from '@/lib/geocoding/default-activity-location';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const dateParam = request.nextUrl.searchParams.get('date');
  const onDate = dateParam ? new Date(dateParam) : new Date();

  try {
    const athleteId = await getCurrentAthleteId();
    const location = await resolveDefaultActivityLocation(
      prisma,
      athleteId,
      Number.isNaN(onDate.getTime()) ? new Date() : onDate,
    );
    return NextResponse.json({ home: location, source: location.source });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger le domicile' }, { status: 500 });
  }
}
