import { NextRequest, NextResponse } from 'next/server';
import { recoveryEngine } from '@/lib/engines/recovery-engine';

export const dynamic = 'force-dynamic';

/**
 * Recovery Intelligence API
 *
 * GET /api/recovery?trainingDayId=<YYYY-MM-DD>&athleteId=<id>&refresh=true
 *
 * Returns the complete recovery assessment for a training day:
 *   - readinessScore (0–100)
 *   - readinessCategory
 *   - dimension breakdown (autonomic, sleep, subjective, load)
 *   - recommendation (type, title, summary, evidence)
 *   - explanation (human-readable)
 *   - signals (autonomicBalance, overreachingRisk, illnessRisk, ...)
 *   - confidence
 *
 * Parameters:
 *   trainingDayId: YYYY-MM-DD (required) — the training day to assess
 *   athleteId: athlete ID (default: "default")
 *   refresh: "true" — force re-inference even if a fresh record exists
 *
 * Behaviour:
 *   - On first call for a day: runs the full pipeline and persists results
 *   - On subsequent calls: returns the cached Decision Record
 *   - With refresh=true: always re-runs inference (e.g. after new observations)
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
    // Return cached result when available (unless refresh requested)
    if (!forceRefresh) {
      const cached = await recoveryEngine.getLatest(athleteId, trainingDayId);
      if (cached) {
        return NextResponse.json(formatResult(cached));
      }
    }

    // Run full inference pipeline
    const result = await recoveryEngine.run(athleteId, trainingDayId);
    return NextResponse.json(formatResult(result));
  } catch (error) {
    console.error('[api/recovery]', error);
    return NextResponse.json(
      { error: 'Recovery inference failed. Please try again.' },
      { status: 500 },
    );
  }
}

function formatResult(result: import('@/core/inference/orchestrator').RecoveryInferenceResult) {
  const { output, athleteId, trainingDayId, computedAt, decisionRecordId } = result;
  const { recoveryState, recommendation, explanation, signals, decision } = output;

  return {
    athleteId,
    trainingDayId,
    computedAt: computedAt.toISOString(),
    decisionRecordId,

    // ── Recovery State ───────────────────────────────────────────────────────
    readinessScore: recoveryState.readinessScore,
    readinessCategory: recoveryState.readinessCategory,
    confidence: recoveryState.confidence,
    dataCompleteness: recoveryState.dataCompleteness,

    dimensions: {
      autonomic: recoveryState.dimensions.autonomic,
      sleep: recoveryState.dimensions.sleep,
      subjective: recoveryState.dimensions.subjective,
      loadContext: recoveryState.dimensions.loadContext,
    },

    primaryLimitingFactor: recoveryState.primaryLimitingFactor,
    estimatedTimeToFullRecovery: recoveryState.estimatedTimeToFullRecovery,

    // ── Signals ──────────────────────────────────────────────────────────────
    signals: {
      autonomicBalance: signals.autonomicBalance,
      sleepAdequacy: signals.sleepAdequacy,
      subjectiveWellness: signals.subjectiveWellness,
      loadStressContext: signals.loadStressContext,
      overreachingRisk: signals.overreachingRisk,
      illnessRisk: signals.illnessRisk,
      dissonanceDetected: signals.dissonanceDetected,
    },

    // ── Decision ─────────────────────────────────────────────────────────────
    decision: {
      verdict: decision.verdict,
      recommendedIntensity: decision.recommendedIntensity,
      rationale: decision.rationale,
    },

    // ── Recommendation ───────────────────────────────────────────────────────
    recommendation: {
      type: recommendation.type,
      title: recommendation.title,
      summary: recommendation.summary,
      keyEvidence: recommendation.keyEvidence,
      limitingFactor: recommendation.limitingFactor,
    },

    // ── Explanation ──────────────────────────────────────────────────────────
    explanation,
  };
}
