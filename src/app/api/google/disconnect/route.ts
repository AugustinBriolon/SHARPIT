import { NextResponse } from 'next/server';
import { disconnectGoogle } from '@/lib/google-sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await disconnectGoogle();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Déconnexion échouée' }, { status: 500 });
  }
}
