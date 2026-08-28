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
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import type { OverallVerdict } from '@/lib/today/today-mapping';

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
  if (!decision?.limitingFactor.description) {
    return null;
  }
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
  if (!decision) {
    return false;
  }
  if (decisionVerdict(decision) === 'INSUFFICIENT_DATA') {
    return false;
  }
  if (!decision.topAction) {
    return false;
  }
  if (decision.dataCompleteness === 'INSUFFICIENT') {
    return false;
  }
  if (decision.priority.confidenceGated) {
    return false;
  }
  if (decision.confidence === null || decision.confidence < MIN_DECISION_ADVICE_CONFIDENCE) {
    return false;
  }
  return true;
}

function physicalHealthRecommendation(
  todayState: TodayState,
): EngineRecommendation | null {
  const recommendation = todayState.physicalHealth?.recommendation;
  if (!recommendation) {
    return null;
  }
  return {
    type: 'physical-health',
    keyEvidence: [...recommendation.evidence],
    confidence: recommendation.confidence,
  };
}

const RECOMMENDATION_BY_ATTENTION_DOMAIN: Record<
  DecisionData['priority']['attentionDomain'],
  (todayState: TodayState) => EngineRecommendation | null
> = {
  RECOVERY: (todayState) => todayState.recovery?.recommendation ?? null,
  FATIGUE: (todayState) => todayState.fatigue?.recommendation ?? null,
  ADAPTATION: (todayState) => todayState.adaptation?.recommendation ?? null,
  PHYSICAL_HEALTH: physicalHealthRecommendation,
  ENVIRONMENT: () => null,
  BALANCED: () => null,
};

function recommendationForAttentionDomain(
  attentionDomain: DecisionData['priority']['attentionDomain'],
  todayState: TodayState,
): EngineRecommendation | null {
  return RECOMMENDATION_BY_ATTENTION_DOMAIN[attentionDomain](todayState);
}

export function resolveRecommendationFromDecision(
  decision: DecisionData | null | undefined,
  todayState: TodayState,
): EngineRecommendation | null {
  if (!decision || decision.priority.confidenceGated) {
    return null;
  }
  return recommendationForAttentionDomain(decision.priority.attentionDomain, todayState);
}

const CONFIDENCE_HREF_BY_DOMAIN: Record<string, string> = {
  FATIGUE: TWIN_DRILL_DOWN.effort,
  ADAPTATION: TWIN_DRILL_DOWN.adaptation,
  PHYSICAL_HEALTH: TWIN_DRILL_DOWN.physical,
  ENVIRONMENT: TWIN_DRILL_DOWN.recovery,
  RECOVERY: TWIN_DRILL_DOWN.recovery,
  BALANCED: TWIN_DRILL_DOWN.recovery,
};

export function resolveConfidenceHrefFromDecision(
  decision: DecisionData | null | undefined,
): string {
  const domain = decision?.priority.attentionDomain ?? decision?.systemAttentionPriority;
  return CONFIDENCE_HREF_BY_DOMAIN[domain ?? 'RECOVERY'] ?? TWIN_DRILL_DOWN.recovery;
}

export function resolveLimitingFactorHrefFromDecision(
  decision: DecisionData | null | undefined,
): string | null {
  const domain = decision?.limitingFactor.domain;
  if (domain === 'PHYSICAL_HEALTH') {
    return TWIN_DRILL_DOWN.physical;
  }
  if (domain === 'ENVIRONMENT') {
    return TWIN_DRILL_DOWN.recovery;
  }

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

function parseBriefingParagraphs(briefing: string): string[] {
  return briefing
    .split('\n')
    .map((paragraph) => paragraph.replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

function firstResolvedEvidenceItem(
  evidence: NonNullable<DecisionData['supportingEvidence']>[number],
): string | null {
  const [item] = evidence.evidenceItems;
  if (!item) {
    return null;
  }
  const text = resolve(item);
  if (text && text !== item.code) {
    return text;
  }
  return null;
}

function buildEvidenceLinesFromDecision(
  decision: DecisionData,
  whyFocus: DailyPhaseWhyFocus,
): string[] {
  const lines: string[] = [];
  const prioritized = prioritizeDecisionEvidence(decision.supportingEvidence, whyFocus);
  for (const evidence of prioritized.slice(0, 2)) {
    lines.push(resolve(evidence.title));
    const itemLine = firstResolvedEvidenceItem(evidence);
    if (itemLine) {
      lines.push(itemLine);
    }
  }
  return lines.slice(0, 3);
}

function buildBriefingLines(briefing: string, whyFocus: DailyPhaseWhyFocus): string[] | null {
  const paragraphs = parseBriefingParagraphs(briefing);
  if (whyFocus === 'adaptation_recovery' || whyFocus === 'tomorrow_impact') {
    return paragraphs.slice(-2);
  }
  if (whyFocus === 'readiness' || whyFocus === 'session_prep') {
    return paragraphs.slice(0, 2);
  }
  return null;
}

function buildTopActionRationaleLine(decision: DecisionData | null | undefined): string | null {
  const topAction = decisionTopAction(decision);
  if (!topAction) {
    return null;
  }
  const rationale = resolveCode(topAction.rationaleCode);
  if (rationale && rationale !== topAction.rationaleCode) {
    return rationale;
  }
  return null;
}

function resolveWhyEvidenceLines(
  decision: DecisionData | null | undefined,
  briefing: string | null | undefined,
  whyFocus: DailyPhaseWhyFocus,
): string[] | null {
  if (decision?.supportingEvidence?.length) {
    const evidenceLines = buildEvidenceLinesFromDecision(decision, whyFocus);
    if (evidenceLines.length > 0) {
      return evidenceLines;
    }
  }

  if (briefing) {
    const briefingLines = buildBriefingLines(briefing, whyFocus);
    if (briefingLines) {
      return briefingLines;
    }
  }

  const rationaleLine = buildTopActionRationaleLine(decision);
  return rationaleLine ? [rationaleLine] : null;
}

export function buildWhyEvidenceFromDecision(
  decision: DecisionData | null | undefined,
  briefing: string | null | undefined,
  whyFocus: DailyPhaseWhyFocus = 'readiness',
): string[] {
  return resolveWhyEvidenceLines(decision, briefing, whyFocus) ?? [];
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
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}
