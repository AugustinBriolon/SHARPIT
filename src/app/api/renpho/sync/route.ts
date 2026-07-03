import { NextRequest, NextResponse } from 'next/server';
import { syncRenphoHealth } from '@/lib/integrations/renpho-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    let full = false;
    try {
      const body = await request.json();
      if (body?.full) full = true;
    } catch {
      // pas de body → sync incrémentale depuis dernière sync
    }

    const result = await syncRenphoHealth(full ? { full: true } : {});
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation Renpho échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
