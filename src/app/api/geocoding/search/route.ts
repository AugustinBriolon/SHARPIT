import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/geocoding/nominatim';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) {
      return NextResponse.json({ places: [] });
    }
    const places = await searchPlaces(q, 8);
    return NextResponse.json({ places });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Recherche de lieu indisponible' }, { status: 502 });
  }
}
