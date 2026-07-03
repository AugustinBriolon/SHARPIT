import { NextRequest, NextResponse } from 'next/server';
import { reasoningEngine } from '@/lib/engines/reasoning-engine';

export const dynamic = 'force-dynamic';

/**
 * Reasoning Engine API
 *
 * GET /api/reasoning?trainingDayId=<YYYY-MM-DD>&athleteId=<id>&refresh=true
 *
 * Returns cross-model physiological synthesis:
 *   - overallVerdict (TRAIN_HARD → INSUFFICIENT_DATA)
 *   - physiologicalConsistency (ALIGNED / PARTIALLY_ALIGNED / CONFLICTING)
 *   - consistencyScore (0–100)
 *   - keyFindings (top 5, severity-sorted)
 *   - limitingFactor
 *   - opportunities (top 2 by expectedBenefit)
 *   - conflicts
 *   - topAction
 *   - evidenceGraph (contribution weights per model)
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
      const cached = await reasoningEngine.getLatest(athleteId, trainingDayId);
      // Don't serve stale INSUFFICIENT_DATA from cache — always re-run so the engine
      // picks up recovery/fatigue/adaptation states that may have been written after
      // the first (parallel) request.
      // Also reject pre-i18n cache: old records have topAction.{verb,focus} instead
      // of topAction.{verbCode,focusCode} — serving them renders empty UI.
      const cachedHasI18nTopAction = cached?.output.reasoningState.topAction?.verbCode != null;
      if (
        cached &&
        cached.output.reasoningState.overallVerdict !== 'INSUFFICIENT_DATA' &&
        cachedHasI18nTopAction
      ) {
        return NextResponse.json(formatResult(cached));
      }
    }

    const result = await reasoningEngine.run(athleteId, trainingDayId);
    return NextResponse.json(formatResult(result));
  } catch (error) {
    console.error('[api/reasoning]', error);
    return NextResponse.json(
      { error: 'Reasoning inference failed. Please try again.' },
      { status: 500 },
    );
  }
}

function formatResult(
  result: import('@/core/inference/reasoning-orchestrator').ReasoningInferenceResult,
) {
  const { output, athleteId, trainingDayId, computedAt, decisionRecordId } = result;
  const { reasoningState, signals } = output;

  return {
    athleteId,
    trainingDayId,
    computedAt: computedAt.toISOString(),
    decisionRecordId,

    overallVerdict: reasoningState.overallVerdict,
    systemAttentionPriority: reasoningState.systemAttentionPriority,
    physiologicalConsistency: reasoningState.physiologicalConsistency,
    consistencyScore: reasoningState.consistencyScore,
    confidence: reasoningState.confidence,
    dataCompleteness: reasoningState.dataCompleteness,

    keyFindings: reasoningState.keyFindings,
    limitingFactor: reasoningState.limitingFactor,
    opportunities: reasoningState.opportunities,
    conflicts: reasoningState.conflicts,
    topAction: reasoningState.topAction,
    evidenceGraph: reasoningState.evidenceGraph,

    signals: {
      availableModelCount: signals.availableModelCount,
      modelDirections: signals.modelDirections,
      consistencyScore: signals.consistencyScore,
      conflictCount: signals.conflictCount,
      opportunityCount: signals.opportunityCount,
      keyFindingCount: signals.keyFindingCount,
      hasRecoveryState: signals.hasRecoveryState,
      hasFatigueState: signals.hasFatigueState,
      hasAdaptationState: signals.hasAdaptationState,
    },
  };
}
