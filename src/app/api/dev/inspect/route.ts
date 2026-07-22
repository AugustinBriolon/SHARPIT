import { NextRequest, NextResponse } from 'next/server';
import { getDevTools, isDevToolsEnabled } from '@/lib/dev/dev-tools';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dev/inspect?observationId=<id>
 * GET /api/dev/inspect?athleteId=<id>&trainingDayId=<YYYY-MM-DD>
 *
 * Pipeline Inspector — traces the complete pipeline for an observation or training day.
 *
 * Response includes:
 *   - Raw normalized observation
 *   - Source and quality metadata
 *   - All generated FeatureSets with values, confidence, warnings
 *   - Missing inputs and fallback strategies used
 *
 * Protected by DEV_TOOLS_ENABLED environment flag.
 */
export async function GET(request: NextRequest) {
  if (!isDevToolsEnabled) {
    return NextResponse.json({ error: 'Developer tools are not enabled.' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const observationId = searchParams.get('observationId');
  const athleteId = searchParams.get('athleteId');
  const trainingDayId = searchParams.get('trainingDayId');

  if (!observationId && (!athleteId || !trainingDayId)) {
    return NextResponse.json(
      {
        error: 'Provide either ?observationId=<id> or ?athleteId=<id>&trainingDayId=<YYYY-MM-DD>',
      },
      { status: 400 },
    );
  }

  try {
    const { pipelineInspector } = getDevTools();

    if (observationId) {
      const trace = await pipelineInspector.inspectObservation(observationId);
      if (!trace) {
        return NextResponse.json(
          { error: `Observation not found: ${observationId}` },
          { status: 404 },
        );
      }
      return NextResponse.json(trace);
    }

    // Day trace
    const trace = await pipelineInspector.inspectDay(athleteId!, trainingDayId!);
    return NextResponse.json(trace);
  } catch (error) {
    console.error('[dev/inspect]', error);
    return NextResponse.json({ error: 'Pipeline inspection failed.' }, { status: 500 });
  }
}
