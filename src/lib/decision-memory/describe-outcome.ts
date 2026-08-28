/**
 * Decision Memory — outcome wording.
 *
 * Turns a structured OutcomeEvaluation into 1-3 plain, athlete-facing sentences.
 * States facts (planned vs. actual, recovery trajectory, symptom count) and lets the
 * athlete judge — never a compliance verdict ("bien exécuté", "respecté"), never a
 * simplistic score. INCONCLUSIVE is always stated explicitly, never silently hidden.
 */

import { SESSION_VERDICT_LABELS } from '@/lib/planned-session/display/session-analysis-display';
import { isSet } from '@/lib/util/value';
import type { OutcomeEvaluation, ExecutionMatch, ShortTermRecoveryResponse } from './types';

const INCONCLUSIVE_WORDING = 'Preuves encore insuffisantes pour conclure.';

function describeDurationMatch(match: ExecutionMatch): string | null {
  const plannedMin = match.plannedDurationMin;
  const actualMin = isSet(match.actualDurationSec)
    ? Math.round(match.actualDurationSec / 60)
    : null;
  if (
    plannedMin === undefined ||
    plannedMin === null ||
    actualMin === undefined ||
    actualMin === null
  ) {
    return null;
  }
  return `${actualMin} min réalisées (${plannedMin} min prévues)`;
}

function describeLoadMatch(match: ExecutionMatch): string | null {
  if (
    match.plannedLoad === undefined ||
    match.plannedLoad === null ||
    match.actualLoad === undefined ||
    match.actualLoad === null
  ) {
    return null;
  }
  return `${Math.round(match.actualLoad)} TSS réalisés (${Math.round(match.plannedLoad)} TSS prévus)`;
}

function describeExecutionMatch(match: ExecutionMatch): string | null {
  const parts = [describeDurationMatch(match), describeLoadMatch(match)].filter(
    (part): part is string => isSet(part),
  );
  if (parts.length === 0) {
    return null;
  }
  const verdictLabel = match.verdict ? SESSION_VERDICT_LABELS[match.verdict] : null;
  const suffix = verdictLabel ? ` — ${verdictLabel}` : '';
  return `${parts.join(', ')}${suffix}.`;
}

function describeRecoveryResponse(response: ShortTermRecoveryResponse): string | null {
  const readings = response.readinessValues.filter((v): v is number => isSet(v));
  if (readings.length < 2) {
    return null;
  }
  const [first] = readings;
  const last = readings[readings.length - 1];
  const delta = last - first;
  if (delta > 5) {
    return 'Readiness en hausse sur les jours suivants.';
  }
  if (delta < -5) {
    return 'Readiness en baisse sur les jours suivants.';
  }
  return 'Readiness stable sur les jours suivants — récupération dans la fenêtre attendue.';
}

function describeSafetySignalLine(safetySignal: OutcomeEvaluation['safetySignal']): string | null {
  if (!safetySignal || safetySignal.newOrWorseningSymptomCount <= 0) {
    return null;
  }
  const count = safetySignal.newOrWorseningSymptomCount;
  if (count === 1) {
    return '1 signal physique nouveau ou aggravé signalé dans les jours suivants.';
  }
  return `${count} signaux physiques nouveaux ou aggravés signalés dans les jours suivants.`;
}

export function describeOutcome(evaluation: OutcomeEvaluation): string[] {
  if (evaluation.outcomeStatus === 'INCONCLUSIVE') {
    return [INCONCLUSIVE_WORDING];
  }

  const lines = [
    evaluation.executionMatch ? describeExecutionMatch(evaluation.executionMatch) : null,
    evaluation.shortTermRecoveryResponse
      ? describeRecoveryResponse(evaluation.shortTermRecoveryResponse)
      : null,
    describeSafetySignalLine(evaluation.safetySignal),
  ].filter((line): line is string => isSet(line));

  return lines.length > 0 ? lines : [INCONCLUSIVE_WORDING];
}
