/**
 * Decision Memory — outcome wording.
 *
 * Turns a structured OutcomeEvaluation into 1-3 plain, athlete-facing sentences.
 * States facts (planned vs. actual, recovery trajectory, symptom count) and lets the
 * athlete judge — never a compliance verdict ("bien exécuté", "respecté"), never a
 * simplistic score. INCONCLUSIVE is always stated explicitly, never silently hidden.
 */

import { SESSION_VERDICT_LABELS } from '@/lib/planned-session/session-analysis-display';
import type { OutcomeEvaluation, ExecutionMatch, ShortTermRecoveryResponse } from './types';

const INCONCLUSIVE_WORDING = 'Preuves encore insuffisantes pour conclure.';

function describeExecutionMatch(match: ExecutionMatch): string | null {
  const plannedMin = match.plannedDurationMin;
  const actualMin =
    match.actualDurationSec != null ? Math.round(match.actualDurationSec / 60) : null;
  const parts: string[] = [];
  if (plannedMin != null && actualMin != null) {
    parts.push(`${actualMin} min réalisées (${plannedMin} min prévues)`);
  }
  if (match.plannedLoad != null && match.actualLoad != null) {
    parts.push(
      `${Math.round(match.actualLoad)} TSS réalisés (${Math.round(match.plannedLoad)} TSS prévus)`,
    );
  }
  if (parts.length === 0) return null;
  const verdictLabel = match.verdict ? SESSION_VERDICT_LABELS[match.verdict] : null;
  const suffix = verdictLabel ? ` — ${verdictLabel}` : '';
  return `${parts.join(', ')}${suffix}.`;
}

function describeRecoveryResponse(response: ShortTermRecoveryResponse): string | null {
  const readings = response.readinessValues.filter((v): v is number => v != null);
  if (readings.length < 2) return null;
  const [first] = readings;
  const last = readings[readings.length - 1];
  const delta = last - first;
  if (delta > 5) return 'Readiness en hausse sur les jours suivants.';
  if (delta < -5) return 'Readiness en baisse sur les jours suivants.';
  return 'Readiness stable sur les jours suivants — récupération dans la fenêtre attendue.';
}

export function describeOutcome(evaluation: OutcomeEvaluation): string[] {
  if (evaluation.outcomeStatus === 'INCONCLUSIVE') {
    return [INCONCLUSIVE_WORDING];
  }

  const lines: string[] = [];

  const executionLine = evaluation.executionMatch
    ? describeExecutionMatch(evaluation.executionMatch)
    : null;
  if (executionLine) lines.push(executionLine);

  const recoveryLine = evaluation.shortTermRecoveryResponse
    ? describeRecoveryResponse(evaluation.shortTermRecoveryResponse)
    : null;
  if (recoveryLine) lines.push(recoveryLine);

  if (evaluation.safetySignal && evaluation.safetySignal.newOrWorseningSymptomCount > 0) {
    const count = evaluation.safetySignal.newOrWorseningSymptomCount;
    lines.push(
      count === 1
        ? '1 signal physique nouveau ou aggravé signalé dans les jours suivants.'
        : `${count} signaux physiques nouveaux ou aggravés signalés dans les jours suivants.`,
    );
  }

  return lines.length > 0 ? lines : [INCONCLUSIVE_WORDING];
}
