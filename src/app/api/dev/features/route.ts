import { NextRequest, NextResponse } from 'next/server';
import { getDevTools, isDevToolsEnabled } from '@/lib/dev/dev-tools';
import type { FeatureCategory } from '@/core/features/types';

export const dynamic = 'force-dynamic';

/**
 * Feature Explorer API
 *
 * GET /api/dev/features?athleteId=<id>&trainingDayId=<YYYY-MM-DD>
 *   → Full feature set view for one training day.
 *
 * GET /api/dev/features?athleteId=<id>&category=<CATEGORY>&days=<N>
 *   → Historical trend for a feature category over N days (default: 30).
 *
 * GET /api/dev/features?athleteId=<id>&from=<YYYY-MM-DD>&to=<YYYY-MM-DD>&summary=true
 *   → Summary counts across a date range.
 *
 * Protected by DEV_TOOLS_ENABLED environment flag.
 */
export async function GET(request: NextRequest) {
  if (!isDevToolsEnabled) {
    return NextResponse.json({ error: 'Developer tools are not enabled.' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get('athleteId');
  const trainingDayId = searchParams.get('trainingDayId');
  const category = searchParams.get('category') as FeatureCategory | null;
  const days = searchParams.get('days');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const summary = searchParams.get('summary') === 'true';

  if (!athleteId) {
    return NextResponse.json({ error: 'athleteId is required.' }, { status: 400 });
  }

  try {
    const { featureExplorer } = getDevTools();

    // Mode 1: Single day view
    if (trainingDayId && !category) {
      const view = await featureExplorer.getDayView(athleteId, trainingDayId);
      return NextResponse.json(view);
    }

    // Mode 2: Historical trend for a category
    if (category) {
      const validCategories: FeatureCategory[] = [
        'SESSION',
        'LOAD',
        'RECOVERY',
        'BODY',
        'CONDITION',
      ];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category. Use one of: ${validCategories.join(', ')}` },
          { status: 400 },
        );
      }

      const history = await featureExplorer.getHistory(athleteId, category, {
        days: days ? Number(days) : 30,
        toTrainingDayId: trainingDayId ?? undefined,
      });
      return NextResponse.json(history);
    }

    // Mode 3: Range summary
    if (from && to && summary) {
      const rangeSummary = await featureExplorer.getRangeSummary(athleteId, from, to);
      return NextResponse.json(rangeSummary);
    }

    return NextResponse.json(
      {
        error: 'Provide one of: ?trainingDayId, ?category, or ?from=...&to=...&summary=true',
      },
      { status: 400 },
    );
  } catch (error) {
    console.error('[dev/features]', error);
    return NextResponse.json({ error: 'Feature exploration failed.' }, { status: 500 });
  }
}
