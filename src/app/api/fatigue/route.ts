import { NextRequest, NextResponse } from 'next/server';
import { fatigueEngine } from '@/lib/fatigue-engine';

export const dynamic = 'force-dynamic';

/**
 * Fatigue Intelligence API
 *
 * GET /api/fatigue?trainingDayId=<YYYY-MM-DD>&athleteId=<id>&refresh=true
 *
 * Returns the complete fatigue assessment for a training day:
 *   - fatigueIndex (0–100)
 *   - fatigueLevel (FRESH → OVERREACHING_RISK)
 *   - fatigueType (dominant mechanism)
 *   - dimension breakdown (load, neuromuscular, metabolic, cumulative, psychological)
 *   - trajectory (RESOLVING / STABLE / ACCUMULATING / ACCELERATING)
 *   - trainingCapacity (FULL / REDUCED / LIGHT_ONLY / REST_ONLY)
 *   - recommendation (type, title, summary, evidence)
 *   - explanation (human-readable)
 *   - confidence
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingDayId = searchParams.get('trainingDayId');
  const athleteId = searchParams.get('athleteId') ?? 'default';
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (!trainingDayId || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
    return NextResponse.json(
      { error: 'trainingDayId is required and must be in YYYY-MM-DD format.' },
      { status: 400 },
    );
  }

  try {
    if (!forceRefresh) {
      const cached = await fatigueEngine.getLatest(athleteId, trainingDayId);
      if (cached) return NextResponse.json(formatResult(cached));
    }

    const result = await fatigueEngine.run(athleteId, trainingDayId);
    return NextResponse.json(formatResult(result));
  } catch (error) {
    console.error('[api/fatigue]', error);
    return NextResponse.json(
      { error: 'Fatigue inference failed. Please try again.' },
      { status: 500 },
    );
  }
}

function formatResult(
  result: import('@/core/inference/fatigue-orchestrator').FatigueInferenceResult,
) {
  const { output, athleteId, trainingDayId, computedAt, decisionRecordId } = result;
  const { fatigueState, recommendation, explanation, signals, decision } = output;

  return {
    athleteId,
    trainingDayId,
    computedAt: computedAt.toISOString(),
    decisionRecordId,

    fatigueIndex: fatigueState.fatigueIndex,
    fatigueLevel: fatigueState.fatigueLevel,
    fatigueType: fatigueState.fatigueType,
    confidence: fatigueState.confidence,
    dataCompleteness: fatigueState.dataCompleteness,

    dimensions: {
      load: fatigueState.dimensions.load,
      neuromuscular: fatigueState.dimensions.neuromuscular,
      metabolic: fatigueState.dimensions.metabolic,
      cumulative: fatigueState.dimensions.cumulative,
      psychological: fatigueState.dimensions.psychological,
    },

    trajectory: fatigueState.trajectory,
    consecutiveAccumulationDays: fatigueState.consecutiveAccumulationDays,
    dominantDimension: fatigueState.dominantDimension,
    primaryLimitingFactor: fatigueState.primaryLimitingFactor,
    trainingCapacity: fatigueState.trainingCapacity,
    estimatedTimeToFresh: fatigueState.estimatedTimeToFresh,
    performanceImpairmentEstimate: fatigueState.performanceImpairmentEstimate,

    signals: {
      fatigueLevel: signals.fatigueLevel,
      fatigueType: signals.fatigueType,
      fatigueTrajectory: signals.fatigueTrajectory,
      functionalOverreachingRisk: signals.functionalOverreachingRisk,
      isAccumulating: signals.isAccumulating,
      trainingCapacity: signals.trainingCapacity,
    },

    decision: {
      verdict: decision.verdict,
      trainingCapacity: decision.trainingCapacity,
      rationale: decision.rationale,
    },

    recommendation: {
      type: recommendation.type,
      title: recommendation.title,
      summary: recommendation.summary,
      keyEvidence: recommendation.keyEvidence,
      limitingFactor: recommendation.limitingFactor,
    },

    explanation,
  };
}
