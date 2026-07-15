import type { OutcomeEvaluation, OutcomeEvaluationInput } from './types';

const MIN_RECOVERY_DAYS_WITH_DATA = 2;
const RECOVERY_WINDOW_DAYS = 3;
/** Evidence categories the confidence score is a fraction of — execution, subjective, recovery, safety. */
const EVIDENCE_CATEGORIES = 4;

const SNAPSHOT_UPSERT_LIMITATION =
  "Recovery-window snapshots reflect each day's current AthleteSnapshotRecord, which is " +
  'upserted on regeneration — not a guaranteed point-in-time record of what the snapshot ' +
  'showed within the 24-72h window itself.';

const ABSENCE_NOT_PROOF_LIMITATION =
  'No physical-health observations were recorded in the window — absence of a recorded ' +
  'symptom is not proof that nothing happened.';

function evaluateExecutionMatch(
  input: OutcomeEvaluationInput,
): OutcomeEvaluation['executionMatch'] {
  if (!input.linkedActivity) return null;
  return {
    plannedDurationMin: input.plannedFields.durationMin,
    actualDurationSec: input.linkedActivity.duration,
    plannedLoad: input.plannedFields.load,
    actualLoad: input.linkedActivity.load,
    verdict: input.sessionAnalysis?.verdict ?? null,
    complianceScore: input.sessionAnalysis?.complianceScore ?? null,
  };
}

function evaluateSubjectiveResponse(
  input: OutcomeEvaluationInput,
): OutcomeEvaluation['subjectiveResponse'] {
  if (!input.linkedActivity) return null;
  if (input.linkedActivity.rpe == null && input.linkedActivity.feeling == null) return null;
  return { rpe: input.linkedActivity.rpe, feeling: input.linkedActivity.feeling };
}

function evaluateShortTermRecoveryResponse(
  input: OutcomeEvaluationInput,
): OutcomeEvaluation['shortTermRecoveryResponse'] {
  const daysWithData = input.recoverySnapshots.filter(
    (s) => s.readiness != null || s.fatigueIndex != null,
  );
  if (daysWithData.length < MIN_RECOVERY_DAYS_WITH_DATA) return null;
  return {
    daysObserved: daysWithData.length,
    readinessValues: daysWithData.map((d) => d.readiness),
    fatigueIndexValues: daysWithData.map((d) => d.fatigueIndex),
  };
}

function evaluateSafetySignal(input: OutcomeEvaluationInput): OutcomeEvaluation['safetySignal'] {
  if (input.conditionObservations.length === 0) return null;
  const symptomatic = input.conditionObservations.filter((o) => o.symptomPresent);
  return {
    newOrWorseningSymptomCount: symptomatic.length,
    observations: symptomatic.map((o) => ({
      observedAt: o.observedAt.toISOString(),
      severityReported: o.severityReported,
      comment: o.comment,
    })),
  };
}

/**
 * Deterministic, explainable retrospective evaluation — no opaque scoring, no causal claim
 * beyond what's directly observable. Never infers success from athlete compliance alone:
 * a deliberate override producing a good outcome is representable (execution deviates from
 * plan, recovery/safety signals can still be positive).
 */
export function evaluateOutcome(input: OutcomeEvaluationInput): OutcomeEvaluation {
  const limitations: string[] = [];

  const executionMatch = evaluateExecutionMatch(input);
  if (!executionMatch) {
    limitations.push(
      'No linked activity found within the window — execution could not be compared to plan.',
    );
  }

  const subjectiveResponse = evaluateSubjectiveResponse(input);
  if (!subjectiveResponse && input.linkedActivity) {
    limitations.push('No subjective feedback (RPE/feeling) recorded for the linked activity.');
  }

  const shortTermRecoveryResponse = evaluateShortTermRecoveryResponse(input);
  const daysWithData = input.recoverySnapshots.filter(
    (s) => s.readiness != null || s.fatigueIndex != null,
  ).length;
  if (!shortTermRecoveryResponse) {
    limitations.push(
      `Only ${daysWithData}/${RECOVERY_WINDOW_DAYS} days in the recovery window had a persisted snapshot — recovery response could not be assessed.`,
    );
  }
  limitations.push(SNAPSHOT_UPSERT_LIMITATION);

  const safetySignal = evaluateSafetySignal(input);
  if (!safetySignal) {
    limitations.push(ABSENCE_NOT_PROOF_LIMITATION);
  }

  // Minimum evidence to say anything at all: either we know how the session actually went,
  // or we know how the athlete's state moved afterward. Missing both → nothing to evaluate.
  const hasMinimumEvidence = executionMatch != null || shortTermRecoveryResponse != null;
  const outcomeStatus = hasMinimumEvidence ? 'EVALUATED' : 'INCONCLUSIVE';

  if (outcomeStatus === 'INCONCLUSIVE') {
    return {
      outcomeStatus,
      executionMatch: null,
      subjectiveResponse: null,
      shortTermRecoveryResponse: null,
      safetySignal: null,
      limitations,
      confidence: 0,
    };
  }

  const evidenceCount = [
    executionMatch,
    subjectiveResponse,
    shortTermRecoveryResponse,
    safetySignal,
  ].filter((e) => e != null).length;
  const confidence = Math.min(1, evidenceCount / EVIDENCE_CATEGORIES);

  return {
    outcomeStatus,
    executionMatch,
    subjectiveResponse,
    shortTermRecoveryResponse,
    safetySignal,
    limitations,
    confidence,
  };
}
