import { NextResponse } from 'next/server';
import { disconnectMfp } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';

export async function POST() {
  try {
    await disconnectMfp();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Déconnexion échouée' }, { status: 500 });
  }
}
