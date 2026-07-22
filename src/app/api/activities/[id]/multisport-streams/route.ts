import { NextRequest, NextResponse } from 'next/server';
import { getMultisportLegStreams } from '@/lib/streams/streams';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await getMultisportLegStreams(id);

    if (payload == null) {
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
