/**
 * Decision-driven scenario generation.
 *
 * Alternatives are proposed from the anchor DecisionState — not generic heuristics.
 */

import type { SerializedDecisionState } from '@/core/decision/adapters';
import type { DecisionDomain } from '@/core/decision/decision-state';
import type { ScenarioDefinition, ScenarioKind, ScenarioSessionSlice } from '@/core/scenario/types';
import { buildScenarioDefinition, pickFocusSession } from '@/lib/scenario/apply-modification';

const DOMAIN_SCENARIO_KINDS: Record<DecisionDomain, readonly ScenarioKind[]> = {
  ENVIRONMENT: ['INDOOR', 'MOVE_EARLIER', 'DELAY_SESSION', 'REDUCE_INTENSITY'],
  RECOVERY: ['REMOVE_SESSION', 'REDUCE_INTENSITY', 'DELAY_SESSION'],
  FATIGUE: ['REMOVE_SESSION', 'DELAY_SESSION', 'REDUCE_INTENSITY'],
  ADAPTATION: ['REDUCE_INTENSITY', 'DELAY_SESSION'],
  PHYSICAL_HEALTH: ['REDUCE_INTENSITY', 'REMOVE_SESSION', 'DELAY_SESSION'],
  DAILY_STRAIN: ['REDUCE_INTENSITY', 'DELAY_SESSION'],
  PLANNING: ['INDOOR', 'REDUCE_INTENSITY', 'DELAY_SESSION'],
  GOALS: ['REDUCE_INTENSITY', 'DELAY_SESSION'],
};

const DOMAIN_LABELS: Record<DecisionDomain, string> = {
  ENVIRONMENT: 'environnement',
  RECOVERY: 'récupération',
  FATIGUE: 'fatigue',
  ADAPTATION: 'adaptation',
  PHYSICAL_HEALTH: 'santé physique',
  DAILY_STRAIN: 'charge du jour',
  PLANNING: 'planification',
  GOALS: 'objectifs',
};

export function resolveAnchorDecisionDomain(
  anchorDecision: SerializedDecisionState | null,
): DecisionDomain | null {
  if (!anchorDecision) return null;

  if (anchorDecision.limitingFactor.domain) {
    return anchorDecision.limitingFactor.domain;
  }

  if (anchorDecision.priority.attentionDomain === 'ENVIRONMENT') {
    return 'ENVIRONMENT';
  }
  if (anchorDecision.priority.attentionDomain === 'PHYSICAL_HEALTH') {
    return 'PHYSICAL_HEALTH';
  }
  if (anchorDecision.limitingFactor.system === 'RECOVERY') return 'RECOVERY';
  if (anchorDecision.limitingFactor.system === 'FATIGUE') return 'FATIGUE';
  if (anchorDecision.limitingFactor.system === 'ADAPTATION') return 'ADAPTATION';

  return null;
}

function contextualizeDefinition(
  definition: ScenarioDefinition,
  domain: DecisionDomain | null,
): ScenarioDefinition {
  if (!domain || definition.kind === 'KEEP_PLAN') {
    return { ...definition, triggeredByDomain: null };
  }

  const domainLabel = DOMAIN_LABELS[domain];
  let { label, rationale } = definition;

  if (domain === 'RECOVERY') {
    if (definition.kind === 'REMOVE_SESSION') {
      label = label.replace(/^Retirer/, 'Jour de récupération — retirer');
      rationale = `Facteur limitant : ${domainLabel}. ${rationale}`;
    }
    if (definition.kind === 'REDUCE_INTENSITY') {
      label = label.replace(/^Réduire l’intensité/, 'Endurance facile — réduire');
      rationale = `Facteur limitant : ${domainLabel}. Allège la séance tout en maintenant le mouvement.`;
    }
  }

  if (domain === 'ENVIRONMENT') {
    if (definition.kind === 'INDOOR') {
      rationale = `Facteur limitant : ${domainLabel}. Alternative intérieure sans stress thermique prévu.`;
    }
    if (definition.kind === 'MOVE_EARLIER') {
      rationale = `Facteur limitant : ${domainLabel}. Créneau plus tôt pour limiter la contrainte environnementale.`;
    }
  }

  return {
    ...definition,
    label,
    rationale: rationale.startsWith('Facteur limitant')
      ? rationale
      : `Facteur limitant : ${domainLabel}. ${rationale}`,
    triggeredByDomain: domain,
  };
}

export function generateScenariosFromDecision(
  baseline: readonly ScenarioSessionSlice[],
  futureDayIds: readonly string[],
  anchorDecision: SerializedDecisionState | null,
): ScenarioDefinition[] {
  const scenarios: ScenarioDefinition[] = [];
  const keep = buildScenarioDefinition('KEEP_PLAN', baseline, null, futureDayIds);
  if (keep) {
    scenarios.push({ ...keep, triggeredByDomain: null });
  }

  const focus = pickFocusSession(baseline);
  if (!focus) return scenarios;

  const domain = resolveAnchorDecisionDomain(anchorDecision);
  const kinds = domain ? DOMAIN_SCENARIO_KINDS[domain] : DOMAIN_SCENARIO_KINDS.PLANNING;

  const seen = new Set<ScenarioKind>(['KEEP_PLAN']);
  for (const kind of kinds) {
    if (seen.has(kind)) continue;
    seen.add(kind);
    const raw = buildScenarioDefinition(kind, baseline, focus.sessionId, futureDayIds);
    if (!raw) continue;
    scenarios.push(contextualizeDefinition(raw, domain));
  }

  return scenarios;
}
