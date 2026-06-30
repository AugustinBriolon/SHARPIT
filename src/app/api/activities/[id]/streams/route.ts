import { NextRequest, NextResponse } from 'next/server';
import { getActivityStreams } from '@/lib/streams';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await getActivityStreams(id);

    if (payload == null) {
      return NextResponse.json({ error: 'Streams indisponibles pour le moment' }, { status: 503 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger les données détaillées' },
      { status: 500 },
    );
  }
}
