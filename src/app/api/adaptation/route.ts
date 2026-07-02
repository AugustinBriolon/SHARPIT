import { NextRequest, NextResponse } from 'next/server';
import { adaptationEngine } from '@/lib/engines/adaptation-engine';

export const dynamic = 'force-dynamic';

/**
 * Adaptation Intelligence API
 *
 * GET /api/adaptation?trainingDayId=<YYYY-MM-DD>&athleteId=<id>&refresh=true
 *
 * Returns the complete adaptation assessment for a training day:
 *   - adaptationIndex (0–100 or null)
 *   - adaptationStatus (POSITIVELY_ADAPTING → DETRAINING)
 *   - adaptationTrend (IMPROVING / STABLE / DECLINING)
 *   - dimension breakdown (loadProgression, neuromuscularEfficiency, autonomicAdaptation, recoveryQuality)
 *   - flags (plateauRisk, overreachingWithoutAdaptationDetected)
 *   - verdict (INCREASE_LOAD / SUSTAIN / CONSOLIDATE / REDUCE_LOAD / RECOVERY_PRIORITY)
 *   - recommendation (type, keyEvidence as I18nItem[])
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
      const cached = await adaptationEngine.getLatest(athleteId, trainingDayId);
      if (cached) return NextResponse.json(formatResult(cached));
    }

    const result = await adaptationEngine.run(athleteId, trainingDayId);
    return NextResponse.json(formatResult(result));
  } catch (error) {
    console.error('[api/adaptation]', error);
    return NextResponse.json(
      { error: 'Adaptation inference failed. Please try again.' },
      { status: 500 },
    );
  }
}

function formatResult(
  result: import('@/core/inference/adaptation-orchestrator').AdaptationInferenceResult,
) {
  const { output, athleteId, trainingDayId, computedAt, decisionRecordId } = result;
  const { adaptationState, recommendation, signals, decision } = output;

  return {
    athleteId,
    trainingDayId,
    computedAt: computedAt.toISOString(),
    decisionRecordId,

    adaptationIndex: adaptationState.adaptationIndex,
    adaptationStatus: adaptationState.adaptationStatus,
    adaptationTrend: adaptationState.adaptationTrend,
    confidence: adaptationState.confidence,
    dataCompleteness: adaptationState.dataCompleteness,

    dimensions: {
      loadProgression: adaptationState.dimensions.loadProgression,
      neuromuscularEfficiency: adaptationState.dimensions.neuromuscularEfficiency,
      autonomicAdaptation: adaptationState.dimensions.autonomicAdaptation,
      recoveryQuality: adaptationState.dimensions.recoveryQuality,
    },

    limitingFactor: adaptationState.limitingFactor,
    estimatedAdaptationPeak: adaptationState.estimatedAdaptationPeak,
    plateauRisk: adaptationState.plateauRisk,
    overreachingWithoutAdaptationDetected: adaptationState.overreachingWithoutAdaptationDetected,

    signals: {
      adaptationStatus: signals.adaptationStatus,
      adaptationTrend: signals.adaptationTrend,
      adaptationIndex: signals.adaptationIndex,
      plateauRisk: signals.plateauRisk,
      overreachingWithoutAdaptationDetected: signals.overreachingWithoutAdaptationDetected,
      availableDimensionCount: signals.availableDimensionCount,
      historyLength: signals.historyLength,
    },

    decision: {
      verdict: decision.verdict,
      loadMultiplier: decision.loadMultiplier,
      rationale: decision.rationale,
    },

    recommendation: {
      type: recommendation.type,
      keyEvidence: recommendation.keyEvidence,
    },
  };
}
