/**
 * DecisionState → product projection helpers.
 *
 * Single read path for surfaces that must not re-arbitrate physiological models.
 * @see docs/models/DECISION_ENGINE.md
 */

import type {
  DecisionData,
  EngineRecommendation,
  LimitingFactor,
  TodayState,
  TopAction,
} from '@/hooks/use-today';
import type { DailyPhaseWhyFocus } from '@/lib/daily-phase/types';
import { resolve, resolveCode } from '@/lib/french';
import { TWIN_DRILL_DOWN } from '@/lib/today-twin-navigation';
import type { OverallVerdict } from '@/lib/today-mapping';

/** Minimum decision confidence before any training advice is emitted. */
export const MIN_DECISION_ADVICE_CONFIDENCE = 0.6;

export function decisionVerdict(decision: DecisionData | null | undefined): OverallVerdict {
  return (decision?.primaryDecision?.verdict ??
    decision?.overallVerdict ??
    'INSUFFICIENT_DATA') as OverallVerdict;
}

export function decisionTopAction(decision: DecisionData | null | undefined): TopAction | null {
  return decision?.topAction ?? null;
}

export function limitingFactorFromDecision(
  decision: DecisionData | null | undefined,
): LimitingFactor | null {
  if (!decision?.limitingFactor.description) return null;
  const { limitingFactor } = decision;
  const { domain, system, description, actionable } = limitingFactor;
  let resolvedSystem: LimitingFactor['system'] = null;
  if (domain !== 'PHYSICAL_HEALTH' && domain !== 'ENVIRONMENT') {
    resolvedSystem = system === 'PHYSICAL_HEALTH' ? null : system;
  }
  return {
    system: resolvedSystem,
    description,
    actionable,
  };
}

export function isAdviceActionableFromDecision(decision: DecisionData | null | undefined): boolean {
  if (!decision) return false;
  if (decisionVerdict(decision) === 'INSUFFICIENT_DATA') return false;
  if (!decision.topAction) return false;
  if (decision.dataCompleteness === 'INSUFFICIENT') return false;
  if (decision.priority.confidenceGated) return false;
  if (decision.confidence == null || decision.confidence < MIN_DECISION_ADVICE_CONFIDENCE) {
    return false;
  }
  return true;
}

export function resolveRecommendationFromDecision(
  decision: DecisionData | null | undefined,
  todayState: TodayState,
): EngineRecommendation | null {
  if (!decision || decision.priority.confidenceGated) return null;

  switch (decision.priority.attentionDomain) {
    case 'RECOVERY':
      return todayState.recovery?.recommendation ?? null;
    case 'FATIGUE':
      return todayState.fatigue?.recommendation ?? null;
    case 'ADAPTATION':
      return todayState.adaptation?.recommendation ?? null;
    case 'PHYSICAL_HEALTH': {
      const recommendation = todayState.physicalHealth?.recommendation;
      if (!recommendation) return null;
      return {
        type: 'physical-health',
        keyEvidence: [...recommendation.evidence],
        confidence: recommendation.confidence,
      };
    }
    case 'ENVIRONMENT':
    case 'BALANCED':
    default:
      return null;
  }
}

export function resolveConfidenceHrefFromDecision(
  decision: DecisionData | null | undefined,
): string {
  const domain = decision?.priority.attentionDomain ?? decision?.systemAttentionPriority;
  switch (domain) {
    case 'FATIGUE':
      return TWIN_DRILL_DOWN.effort;
    case 'ADAPTATION':
      return TWIN_DRILL_DOWN.adaptation;
    case 'PHYSICAL_HEALTH':
      return TWIN_DRILL_DOWN.physical;
    case 'ENVIRONMENT':
      return TWIN_DRILL_DOWN.recovery;
    case 'RECOVERY':
    case 'BALANCED':
    default:
      return TWIN_DRILL_DOWN.recovery;
  }
}

export function resolveLimitingFactorHrefFromDecision(
  decision: DecisionData | null | undefined,
): string | null {
  const domain = decision?.limitingFactor.domain;
  if (domain === 'PHYSICAL_HEALTH') return TWIN_DRILL_DOWN.physical;
  if (domain === 'ENVIRONMENT') return TWIN_DRILL_DOWN.recovery;

  const system = decision?.limitingFactor.system;
  switch (system) {
    case 'RECOVERY':
      return TWIN_DRILL_DOWN.recovery;
    case 'FATIGUE':
      return TWIN_DRILL_DOWN.effort;
    case 'ADAPTATION':
      return TWIN_DRILL_DOWN.adaptation;
    default:
      return null;
  }
}

export function buildWhyEvidenceFromDecision(
  decision: DecisionData | null | undefined,
  briefing: string | null | undefined,
  whyFocus: DailyPhaseWhyFocus = 'readiness',
): string[] {
  const lines: string[] = [];

  if (decision?.supportingEvidence?.length) {
    const prioritized = prioritizeDecisionEvidence(decision.supportingEvidence, whyFocus);
    for (const evidence of prioritized.slice(0, 2)) {
      lines.push(resolve(evidence.title));
      for (const item of evidence.evidenceItems.slice(0, 1)) {
        const text = resolve(item);
        if (text && text !== item.code) lines.push(text);
      }
    }
    if (lines.length > 0) return lines.slice(0, 3);
  }

  if (whyFocus === 'adaptation_recovery' || whyFocus === 'tomorrow_impact') {
    if (briefing) {
      const paragraphs = briefing
        .split('\n')
        .map((p) => p.replace(/\*\*/g, '').trim())
        .filter(Boolean);
      return paragraphs.slice(-2);
    }
  }

  if (briefing && (whyFocus === 'readiness' || whyFocus === 'session_prep')) {
    const paragraphs = briefing
      .split('\n')
      .map((p) => p.replace(/\*\*/g, '').trim())
      .filter(Boolean);
    return paragraphs.slice(0, 2);
  }

  const topAction = decisionTopAction(decision);
  if (topAction) {
    const rationale = resolveCode(topAction.rationaleCode);
    if (rationale && rationale !== topAction.rationaleCode) {
      lines.push(rationale);
    }
  }

  return lines;
}

function prioritizeDecisionEvidence(
  evidence: NonNullable<DecisionData['supportingEvidence']>,
  whyFocus: DailyPhaseWhyFocus,
) {
  const order: Record<DailyPhaseWhyFocus, string[]> = {
    readiness: ['RECOVERY', 'ENVIRONMENT', 'PHYSICAL_HEALTH'],
    session_prep: ['FATIGUE', 'RECOVERY', 'DAILY_STRAIN'],
    session_review: ['DAILY_STRAIN', 'FATIGUE', 'ADAPTATION'],
    adaptation_recovery: ['RECOVERY', 'FATIGUE', 'ADAPTATION'],
    tomorrow_impact: ['ADAPTATION', 'RECOVERY', 'ENVIRONMENT'],
  };
  const prefs = order[whyFocus];
  return [...evidence].sort((a, b) => {
    const ai = prefs.indexOf(a.domain);
    const bi = prefs.indexOf(b.domain);
    const rankDiff = (a.rank ?? 99) - (b.rank ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}
