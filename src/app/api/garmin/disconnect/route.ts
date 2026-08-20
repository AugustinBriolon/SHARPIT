import { NextResponse } from 'next/server';
import { disconnectGarmin } from '@/lib/integrations/garmin/garmin-sync';

export async function POST() {
  try {
    await disconnectGarmin();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Déconnexion échouée' }, { status: 500 });
  }
}
