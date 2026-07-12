import { NextResponse } from 'next/server';
import { resolveHomeLocation } from '@/lib/geocoding/home-location';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const home = await resolveHomeLocation(prisma);
    return NextResponse.json({ home });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger le domicile' }, { status: 500 });
  }
}
