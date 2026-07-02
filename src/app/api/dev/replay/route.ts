import { NextRequest, NextResponse } from 'next/server';
import { getDevTools, isDevToolsEnabled } from '@/lib/dev-tools';

export const dynamic = 'force-dynamic';

/**
 * Replay Engine API
 *
 * POST /api/dev/replay
 *
 * Body (JSON):
 * {
 *   athleteId: string,
 *   since?: "YYYY-MM-DD",       // default: 90 days ago
 *   until?: "YYYY-MM-DD",       // default: today
 *   mode?: "dry-run" | "write"  // default: "dry-run"
 * }
 *
 * Response:
 *   Full ReplayResult including per-day checksums and summary.
 *
 * Protected by DEV_TOOLS_ENABLED environment flag.
 *
 * ⚠️  mode="write" replaces production feature sets. Use with caution.
 */
export async function POST(request: NextRequest) {
  if (!isDevToolsEnabled) {
    return NextResponse.json({ error: 'Developer tools are not enabled.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { athleteId, since, until, mode } = body as Record<string, string>;

  if (!athleteId) {
    return NextResponse.json({ error: 'athleteId is required.' }, { status: 400 });
  }

  if (mode && mode !== 'dry-run' && mode !== 'write') {
    return NextResponse.json({ error: 'mode must be "dry-run" or "write".' }, { status: 400 });
  }

  try {
    const { replayEngine } = getDevTools();

    const result = await replayEngine.replay({
      athleteId,
      since: since ? new Date(`${since}T00:00:00Z`) : undefined,
      until: until ? new Date(`${until}T23:59:59Z`) : undefined,
      mode: (mode as 'dry-run' | 'write') ?? 'dry-run',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[dev/replay]', error);
    return NextResponse.json({ error: 'Replay failed.' }, { status: 500 });
  }
}

/**
 * GET /api/dev/replay?athleteId=<id>&run1=<checksum_key>&run2=<checksum_key>
 *
 * Compare two replay checksums.
 * (Advanced usage — compare replays saved externally.)
 *
 * For in-process comparison, use ReplayEngine.compareChecksums() directly.
 */
export async function GET(request: NextRequest) {
  if (!isDevToolsEnabled) {
    return NextResponse.json({ error: 'Developer tools are not enabled.' }, { status: 404 });
  }

  return NextResponse.json({
    usage: 'POST /api/dev/replay with { athleteId, since?, until?, mode? }',
    modes: {
      'dry-run': 'Compute features without persisting (default, safe)',
      write: 'Compute and persist to production repository (destructive)',
    },
    example: {
      athleteId: 'default',
      since: '2026-06-01',
      until: '2026-07-01',
      mode: 'dry-run',
    },
  });
}
