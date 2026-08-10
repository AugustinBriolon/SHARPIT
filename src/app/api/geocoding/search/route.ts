import { NextRequest, NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/geocoding/nominatim';

export async function GET(request: NextRequest) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  try {
    const places = await searchPlaces(q, 8);
    return NextResponse.json({ places });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Recherche de lieu indisponible' }, { status: 502 });
  }
}
