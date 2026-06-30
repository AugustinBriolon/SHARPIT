import { NextResponse } from 'next/server';
import { syncFromGoogle } from '@/lib/google-sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await syncFromGoogle();
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
