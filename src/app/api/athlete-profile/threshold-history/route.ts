import { NextResponse } from 'next/server';
import { getThresholdSnapshots } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshots = await getThresholdSnapshots();
    return NextResponse.json(snapshots);
  } catch (error) {
    console.error('[threshold-history]', error);
    return NextResponse.json({ error: "Impossible de charger l'historique" }, { status: 500 });
  }
}
