import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { DecisionData, TodayState } from '@/hooks/use-today';
import { isForwardAdvicePhase } from '@/lib/daily-phase/resolve';
import { isAdviceActionableFromDecision } from '@/lib/decision/projection';
import { resolve } from '@/lib/french';

/** Minimum decision confidence before any training advice is emitted. */
export const MIN_ADVICE_CONFIDENCE = 0.6;

export type TruthfulnessOverlay = {
  adviceActionable: boolean;
  todaysDecision: AthleteSnapshot['todaysDecision'];
  recommendation: AthleteSnapshot['recommendation'];
  limitingFactor: AthleteSnapshot['limitingFactor'];
  confidence: AthleteSnapshot['confidence'];
  insufficientDataMessage: string | null;
  effortUnavailableMessage: string | null;
  confidenceLabel: string | null;
};

function graphContributionMissing(
  graph: DecisionData['evidenceGraph'] | undefined,
  key: 'recoveryContribution' | 'fatigueContribution' | 'adaptationContribution',
  label: string,
): string | null {
  if (!graph || graph[key] <= 0) {
    return label;
  }
  return null;
}

function missingSignals(decision: DecisionData | null): string[] {
  if (!decision) {
    return ['synthèse du jour'];
  }
  const missing = [
    graphContributionMissing(decision.evidenceGraph, 'recoveryContribution', 'récupération'),
    graphContributionMissing(decision.evidenceGraph, 'fatigueContribution', 'charge / fatigue'),
    graphContributionMissing(decision.evidenceGraph, 'adaptationContribution', 'adaptation'),
  ].filter((value): value is string => (value !== undefined && value !== null));
  if (missing.length === 3) {
    return ['synthèse du jour'];
  }
  return missing;
}

function baselinePendingMessage(recovery: TodayState['recovery']): string | null {
  if (recovery?.readinessCategory !== 'BASELINE_PENDING') {
    return null;
  }
  return 'SHARPIT établit encore ta baseline physiologique. Quelques jours de données suffisent pour un premier bilan fiable.';
}

function domainHintMessage(domainMessages: Partial<Record<string, string>>): string | null {
  return (
    domainMessages.sleep ??
    domainMessages.recovery ??
    domainMessages.reasoning ??
    domainMessages.training ??
    null
  );
}

export function buildInsufficientDataMessage(
  todayState: TodayState,
  domainMessages: Partial<Record<string, string>>,
): string {
  const { decision, recovery } = todayState;

  const baselineMessage = baselinePendingMessage(recovery);
  if (baselineMessage) {
    return baselineMessage;
  }

  const domainHint = domainHintMessage(domainMessages);
  if (domainHint) {
    return `${domainHint} Dès que les données arrivent, ton bilan se met à jour automatiquement.`;
  }

  const missing = missingSignals(decision);
  if (missing.length > 0 && missing[0] !== 'synthèse du jour') {
    return `Données manquantes : ${missing.join(', ')}. Synchronise ton appareil ou complète ton check-in du matin — SHARPIT mettra à jour ton bilan dès réception.`;
  }

  if (decision?.dataCompleteness === 'INSUFFICIENT') {
    return 'Les signaux disponibles ne permettent pas encore une recommandation d’entraînement fiable. SHARPIT attend davantage de données physiologiques.';
  }

  return 'Les signaux disponibles ne permettent pas encore une recommandation d’entraînement fiable. SHARPIT se mettra à jour dès que tes données de sommeil et de récupération seront complètes.';
}

export function confidenceLabelFor(confidence: number | null): string | null {
  if ((confidence === undefined || confidence === null)) {
    return null;
  }
  if (confidence >= 0.75) {
    return 'Estimation fiable';
  }
  if (confidence >= MIN_ADVICE_CONFIDENCE) {
    return 'Estimation modérée';
  }
  return 'Estimation partielle — données incomplètes';
}

export function effortUnavailableMessage(
  dailyStrain: TodayState['dailyStrain'],
  domainMessages: Partial<Record<string, string>>,
): string | null {
  if (dailyStrain?.available && (dailyStrain.strainScore !== undefined && dailyStrain.strainScore !== null)) {
    return null;
  }
  return domainMessages.training ?? "La charge d'entraînement du jour n'a pas encore été mesurée.";
}

function resolveSnapshotRecommendation(
  gateForwardAdvice: boolean,
  actionable: boolean,
  recommendation: AthleteSnapshot['recommendation'],
): AthleteSnapshot['recommendation'] {
  if (!gateForwardAdvice) {
    return recommendation;
  }
  if (actionable) {
    return recommendation;
  }
  return null;
}

function buildTruthfulnessTodayState(
  snapshot: Omit<
    AthleteSnapshot,
    'adviceActionable' | 'insufficientDataMessage' | 'effortUnavailableMessage' | 'confidenceLabel'
  >,
): TodayState {
  return {
    decision: snapshot.decision,
    reasoning: snapshot.reasoning,
    recovery: snapshot.recovery,
    fatigue: snapshot.fatigue,
    adaptation: snapshot.adaptation,
    physicalHealth: snapshot.physicalHealth,
    environment: snapshot.environment ?? null,
    dailyStrain: snapshot.dailyStrain,
  };
}

function buildTruthfulnessMessages(
  snapshot: Omit<
    AthleteSnapshot,
    'adviceActionable' | 'insufficientDataMessage' | 'effortUnavailableMessage' | 'confidenceLabel'
  >,
  actionable: boolean,
): Pick<
  TruthfulnessOverlay,
  'insufficientDataMessage' | 'effortUnavailableMessage' | 'confidenceLabel'
> & {
  primaryProductMessage: AthleteSnapshot['primaryProductMessage'];
} {
  const insufficientDataMessage = actionable
    ? null
    : buildInsufficientDataMessage(buildTruthfulnessTodayState(snapshot), snapshot.domainMessages);
  const primaryProductMessage =
    snapshot.primaryProductMessage ?? (actionable ? null : insufficientDataMessage);

  return {
    insufficientDataMessage,
    effortUnavailableMessage: effortUnavailableMessage(
      snapshot.dailyStrain,
      snapshot.domainMessages,
    ),
    confidenceLabel: confidenceLabelFor(snapshot.confidence),
    primaryProductMessage,
  };
}

export function applyTruthfulnessOverlay(
  snapshot: Omit<
    AthleteSnapshot,
    'adviceActionable' | 'insufficientDataMessage' | 'effortUnavailableMessage' | 'confidenceLabel'
  >,
): TruthfulnessOverlay & Pick<AthleteSnapshot, 'primaryProductMessage'> {
  const actionable = isAdviceActionableFromDecision(snapshot.decision);
  const gateForwardAdvice = isForwardAdvicePhase(snapshot.dailyPhase?.phase ?? 'MORNING');
  const limitingFactor = snapshot.limitingFactor?.description ? snapshot.limitingFactor : null;
  const messages = buildTruthfulnessMessages(snapshot, actionable);

  return {
    adviceActionable: actionable,
    todaysDecision: actionable && gateForwardAdvice ? snapshot.todaysDecision : null,
    recommendation: resolveSnapshotRecommendation(
      gateForwardAdvice,
      actionable,
      snapshot.recommendation,
    ),
    limitingFactor,
    confidence: snapshot.confidence,
    ...messages,
  };
}

export function formatLimitingFactorMessage(
  limitingFactor: NonNullable<AthleteSnapshot['limitingFactor']>,
): string | null {
  if (!limitingFactor.description) {
    return null;
  }
  const text = resolve(limitingFactor.description);
  if (!text || text === limitingFactor.description.code) {
    return null;
  }
  return text;
}
