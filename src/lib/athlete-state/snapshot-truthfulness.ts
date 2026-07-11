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

function missingSignals(decision: DecisionData | null): string[] {
  if (!decision) return ['synthèse du jour'];
  const missing: string[] = [];
  const graph = decision.evidenceGraph;
  if (!graph || graph.recoveryContribution <= 0) missing.push('récupération');
  if (!graph || graph.fatigueContribution <= 0) missing.push('charge / fatigue');
  if (!graph || graph.adaptationContribution <= 0) missing.push('adaptation');
  if (missing.length === 3) return ['synthèse du jour'];
  return missing;
}

export function buildInsufficientDataMessage(
  todayState: TodayState,
  domainMessages: Partial<Record<string, string>>,
): string {
  const { decision, recovery } = todayState;

  if (recovery?.readinessCategory === 'BASELINE_PENDING') {
    return 'SHARPIT établit encore ta baseline physiologique. Quelques jours de données suffisent pour un premier bilan fiable.';
  }

  const domainHint =
    domainMessages.sleep ??
    domainMessages.recovery ??
    domainMessages.reasoning ??
    domainMessages.training;

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
  if (confidence == null) return null;
  if (confidence >= 0.75) return 'Estimation fiable';
  if (confidence >= MIN_ADVICE_CONFIDENCE) return 'Estimation modérée';
  return 'Estimation partielle — données incomplètes';
}

export function effortUnavailableMessage(
  dailyStrain: TodayState['dailyStrain'],
  domainMessages: Partial<Record<string, string>>,
): string | null {
  if (dailyStrain?.available && dailyStrain.strainScore != null) return null;
  return domainMessages.training ?? "La charge d'entraînement du jour n'a pas encore été mesurée.";
}

function resolveSnapshotRecommendation(
  gateForwardAdvice: boolean,
  actionable: boolean,
  recommendation: AthleteSnapshot['recommendation'],
): AthleteSnapshot['recommendation'] {
  if (!gateForwardAdvice) return recommendation;
  if (actionable) return recommendation;
  return null;
}

export function applyTruthfulnessOverlay(
  snapshot: Omit<
    AthleteSnapshot,
    'adviceActionable' | 'insufficientDataMessage' | 'effortUnavailableMessage' | 'confidenceLabel'
  >,
): TruthfulnessOverlay & Pick<AthleteSnapshot, 'primaryProductMessage'> {
  const { confidence } = snapshot;
  const actionable = isAdviceActionableFromDecision(snapshot.decision);
  const insufficientDataMessage = actionable
    ? null
    : buildInsufficientDataMessage(
        {
          decision: snapshot.decision,
          reasoning: snapshot.reasoning,
          recovery: snapshot.recovery,
          fatigue: snapshot.fatigue,
          adaptation: snapshot.adaptation,
          physicalHealth: snapshot.physicalHealth,
          environment: snapshot.environment ?? null,
          dailyStrain: snapshot.dailyStrain,
        },
        snapshot.domainMessages,
      );

  const limitingFactor = snapshot.limitingFactor?.description ? snapshot.limitingFactor : null;

  const forwardPhase = isForwardAdvicePhase(snapshot.dailyPhase?.phase ?? 'MORNING');
  const gateForwardAdvice = forwardPhase;

  const primaryProductMessage =
    snapshot.primaryProductMessage ?? (actionable ? null : insufficientDataMessage);

  return {
    adviceActionable: actionable,
    todaysDecision: actionable && gateForwardAdvice ? snapshot.todaysDecision : null,
    recommendation: resolveSnapshotRecommendation(
      gateForwardAdvice,
      actionable,
      snapshot.recommendation,
    ),
    limitingFactor,
    confidence,
    insufficientDataMessage,
    effortUnavailableMessage: effortUnavailableMessage(
      snapshot.dailyStrain,
      snapshot.domainMessages,
    ),
    confidenceLabel: confidenceLabelFor(confidence),
    primaryProductMessage,
  };
}

export function formatLimitingFactorMessage(
  limitingFactor: NonNullable<AthleteSnapshot['limitingFactor']>,
): string | null {
  if (!limitingFactor.description) return null;
  const text = resolve(limitingFactor.description);
  if (!text || text === limitingFactor.description.code) return null;
  return text;
}
