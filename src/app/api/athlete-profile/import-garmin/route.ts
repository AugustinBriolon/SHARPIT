import { NextResponse } from 'next/server';
import { importGarminThresholds } from '@/lib/garmin-sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await importGarminThresholds();
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && error.message.includes('non connecté')
        ? 'Compte Garmin non connecté'
        : "Impossible d'importer les seuils depuis Garmin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
