import { NextRequest, NextResponse } from 'next/server';
import { syncWithingsHealth } from '@/lib/integrations/withings-sync';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const full = Boolean((body as { full?: boolean }).full);
    const days =
      typeof (body as { days?: number }).days === 'number'
        ? (body as { days: number }).days
        : undefined;

    const result = await syncWithingsHealth(full ? { full: true } : { days: days ?? 90 });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synchronisation Withings échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
