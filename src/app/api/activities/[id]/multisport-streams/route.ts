import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { getMultisportLegStreams } from '@/lib/streams/streams';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    const payload = await getMultisportLegStreams(athleteId, id);

    if (payload === null) {
      return NextResponse.json(
        { error: 'Streams multisport indisponibles pour le moment' },
        { status: 503 },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger les données multisport' },
      { status: 500 },
    );
  }
}
