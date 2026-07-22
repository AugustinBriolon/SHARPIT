import { NextResponse } from 'next/server';
import { getDevTools, isDevToolsEnabled } from '@/lib/dev/dev-tools';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dev/metrics
 *
 * Returns a snapshot of Feature Engine internal metrics.
 * Includes extraction counts, latency stats, replay durations.
 *
 * Protected by DEV_TOOLS_ENABLED environment flag.
 */
export async function GET() {
  if (!isDevToolsEnabled) {
    return NextResponse.json({ error: 'Developer tools are not enabled.' }, { status: 404 });
  }

  try {
    const { metrics } = getDevTools();
    const snapshot = metrics.snapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('[dev/metrics]', error);
    return NextResponse.json({ error: 'Failed to collect metrics.' }, { status: 500 });
  }
}

/**
 * DELETE /api/dev/metrics
 *
 * Resets all in-memory metric counters.
 */
export async function DELETE() {
  if (!isDevToolsEnabled) {
    return NextResponse.json({ error: 'Developer tools are not enabled.' }, { status: 404 });
  }

  try {
    const { metrics } = getDevTools();
    metrics.reset();
    return NextResponse.json({ reset: true, resetAt: new Date().toISOString() });
  } catch (error) {
    console.error('[dev/metrics]', error);
    return NextResponse.json({ error: 'Failed to reset metrics.' }, { status: 500 });
  }
}
