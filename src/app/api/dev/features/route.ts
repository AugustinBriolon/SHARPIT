import { NextRequest, NextResponse } from 'next/server';
import { getDevTools, isDevToolsEnabled } from '@/lib/dev/dev-tools';
import type { FeatureCategory } from '@/core/features/types';

const VALID_CATEGORIES: FeatureCategory[] = ['SESSION', 'LOAD', 'RECOVERY', 'BODY', 'CONDITION'];

async function handleDayView(
  featureExplorer: ReturnType<typeof getDevTools>['featureExplorer'],
  athleteId: string,
  trainingDayId: string,
) {
  const view = await featureExplorer.getDayView(athleteId, trainingDayId);
  return NextResponse.json(view);
}

async function handleCategoryHistory(input: {
  featureExplorer: ReturnType<typeof getDevTools>['featureExplorer'];
  athleteId: string;
  category: FeatureCategory;
  days: string | null;
  trainingDayId: string | null;
}) {
  const { featureExplorer, athleteId, category, days, trainingDayId } = input;
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Use one of: ${VALID_CATEGORIES.join(', ')}` },
      { status: 400 },
    );
  }
  const history = await featureExplorer.getHistory(athleteId, category, {
    days: days ? Number(days) : 30,
    toTrainingDayId: trainingDayId ?? undefined,
  });
  return NextResponse.json(history);
}

async function handleRangeSummary(
  featureExplorer: ReturnType<typeof getDevTools>['featureExplorer'],
  athleteId: string,
  from: string,
  to: string,
) {
  const rangeSummary = await featureExplorer.getRangeSummary(athleteId, from, to);
  return NextResponse.json(rangeSummary);
}

async function resolveFeatureExplorerRequest(input: {
  featureExplorer: ReturnType<typeof getDevTools>['featureExplorer'];
  athleteId: string;
  trainingDayId: string | null;
  category: FeatureCategory | null;
  days: string | null;
  from: string | null;
  to: string | null;
  summary: boolean;
}) {
  const { featureExplorer, athleteId, trainingDayId, category, days, from, to, summary } = input;
  if (trainingDayId && !category) {
    return handleDayView(featureExplorer, athleteId, trainingDayId);
  }
  if (category) {
    return handleCategoryHistory({
      featureExplorer,
      athleteId,
      category,
      days,
      trainingDayId,
    });
  }
  if (from && to && summary) {
    return handleRangeSummary(featureExplorer, athleteId, from, to);
  }
  return NextResponse.json(
    {
      error: 'Provide one of: ?trainingDayId, ?category, or ?from=...&to=...&summary=true',
    },
    { status: 400 },
  );
}

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
  if (!athleteId) {
    return NextResponse.json({ error: 'athleteId is required.' }, { status: 400 });
  }

  try {
    const { featureExplorer } = getDevTools();
    return resolveFeatureExplorerRequest({
      featureExplorer,
      athleteId,
      trainingDayId: searchParams.get('trainingDayId'),
      category: searchParams.get('category') as FeatureCategory | null,
      days: searchParams.get('days'),
      from: searchParams.get('from'),
      to: searchParams.get('to'),
      summary: searchParams.get('summary') === 'true',
    });
  } catch (error) {
    console.error('[dev/features]', error);
    return NextResponse.json({ error: 'Feature exploration failed.' }, { status: 500 });
  }
}
