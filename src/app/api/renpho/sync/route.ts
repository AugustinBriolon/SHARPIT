import { NextRequest, NextResponse } from 'next/server';
import { syncRenphoHealth } from '@/lib/renpho-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    let days = 60;
    let full = false;
    try {
      const body = await request.json();
      if (body?.full) full = true;
      if (body?.days) days = Math.min(Number(body.days), 365 * 3);
    } catch {
      // pas de body
    }

    const result = await syncRenphoHealth(full ? { full: true } : { days });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation Renpho échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
