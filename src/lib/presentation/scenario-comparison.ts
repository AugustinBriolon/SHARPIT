/**
 * Scenario Comparison — presentation mapping + coach formatting.
 */

import type {
  ScenarioComparisonRow,
  ScenarioComparisonViewModel,
} from '@/core/presentation/scenario-comparison-view-model';
import type { ScenarioComparison } from '@/core/scenario/types';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { limitingFactorLabel } from '@/lib/projection/project-athlete-state';
import { runScenarioComparison } from '@/lib/scenario/scenario-engine';
import { mapVerdictToDisplay } from '@/lib/today-mapping';

const ENV_LABELS: Record<string, string> = {
  NONE: 'Faible',
  MODERATE: 'Modéré',
  SIGNIFICANT: 'Significatif',
};

const DOMAIN_LABELS: Record<string, string> = {
  ENVIRONMENT: 'Environnement',
  RECOVERY: 'Récupération',
  FATIGUE: 'Fatigue',
  ADAPTATION: 'Adaptation',
  PHYSICAL_HEALTH: 'Santé physique',
  PLANNING: 'Planification',
};

const GENERIC_EQUIVALENT = 'Équivalent au plan actuel sur les sorties Decision Engine comparées.';

function confidenceLabel(confidence: number): string | null {
  if (confidence >= 0.75) return 'Élevée';
  if (confidence >= 0.55) return 'Modérée';
  return 'Partielle';
}

function formatScore(value: number | null): string | null {
  if (value == null) return null;
  return String(Math.round(value));
}

export function isGenericEquivalentExplanation(text: string): boolean {
  return text === GENERIC_EQUIVALENT || text.startsWith('Équivalent au plan actuel');
}

function cleanRationale(rationale: string): string {
  return rationale.replace(/^Facteur limitant\s*:[^.]+\.\s*/i, '').trim();
}

function humanizePreferabilityClause(clause: string): string | null {
  if (clause.startsWith('verdict de fin')) {
    return "améliore le verdict en fin d'horizon";
  }
  if (clause.startsWith('verdict le plus défavorable')) {
    return "réduit le jour le plus risqué de l'horizon";
  }
  if (clause.startsWith('bénéfice attendu')) {
    return 'renforce le bénéfice attendu sur la période';
  }
  if (clause.startsWith('confiance')) {
    return 'gagne en confiance sur la projection';
  }
  if (clause.includes('jour(s) à risque en moins')) {
    const n = clause.match(/(\d+)/)?.[1];
    return n ? `${n} jour${n === '1' ? '' : 's'} de vigilance en moins` : 'moins de jours à risque';
  }
  if (clause.startsWith('facteur limitant déplacé')) {
    return 'déplace le facteur limitant';
  }
  return null;
}

function humanizePreferability(text: string): string | null {
  const clauses = text.split(' · ').map(humanizePreferabilityClause).filter(Boolean);
  if (clauses.length === 0) return null;
  const sentence = clauses.join(', ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

function buildSummaryLine(input: {
  rationale: string;
  preferabilityExplanation: string;
  isRecommended: boolean;
  isBaseline: boolean;
  allAlternativesEquivalent: boolean;
}): string {
  const action = cleanRationale(input.rationale);

  if (input.isBaseline) {
    return 'Référence — ton planning tel quel, pour comparer les autres options.';
  }

  const pref = input.preferabilityExplanation;
  const equivalent = isGenericEquivalentExplanation(pref);

  if (input.isRecommended) {
    if (!equivalent) {
      const benefit = humanizePreferability(pref);
      return benefit ? `${action} ${benefit}` : `${action} Option préférée sur cet horizon.`;
    }
    return `${action} Meilleur compromis identifié, même si l'écart reste faible.`;
  }

  if (equivalent) {
    if (input.allAlternativesEquivalent) return action;
    return `${action} Pas d'avantage net par rapport au plan actuel.`;
  }

  if (pref.includes('Moins favorable')) {
    return `${action} Moins intéressante que garder le plan actuel.`;
  }

  const nuance = humanizePreferability(pref);
  return nuance ? `${action} ${nuance}` : action;
}

function buildScenarioRow(
  entry: ScenarioComparison['scenarios'][number],
  comparison: ScenarioComparison,
  allAlternativesEquivalent: boolean,
): ScenarioComparisonRow {
  const lastDay = entry.projection.days[entry.projection.days.length - 1];
  const limiting =
    lastDay != null
      ? (limitingFactorLabel(lastDay.decision.limitingFactor) ??
        (entry.decision.endLimitingFactorDomain
          ? (DOMAIN_LABELS[entry.decision.endLimitingFactorDomain] ??
            entry.decision.endLimitingFactorDomain)
          : null))
      : null;

  const isRecommended = entry.scenarioId === comparison.recommendedScenarioId;
  const isBaseline = entry.kind === 'KEEP_PLAN';
  const preferabilityExplanation =
    entry.kind === 'KEEP_PLAN' || isGenericEquivalentExplanation(entry.preferabilityExplanation)
      ? null
      : entry.preferabilityExplanation;

  return {
    scenarioId: entry.scenarioId,
    kind: entry.kind,
    label: entry.label,
    summaryLine: buildSummaryLine({
      rationale: entry.rationale,
      preferabilityExplanation: entry.preferabilityExplanation,
      isRecommended,
      isBaseline,
      allAlternativesEquivalent,
    }),
    isRecommended,
    isBaseline,
    technicalDetail: {
      endVerdict: mapVerdictToDisplay(entry.decision.endVerdict).label,
      endReadiness: formatScore(entry.outcome.endReadiness),
      endAdaptation: formatScore(entry.outcome.endAdaptation),
      environmentalImpact: ENV_LABELS[entry.outcome.maxEnvironmentalImpact] ?? '—',
      endConfidenceLabel: confidenceLabel(entry.decision.endConfidence),
      limitingFactor: limiting,
      preferabilityExplanation,
      tradeOffs: entry.tradeOffs,
    },
  };
}

export function buildScenarioComparisonViewModel(
  comparison: ScenarioComparison | null,
): ScenarioComparisonViewModel {
  if (!comparison || comparison.scenarios.length === 0) {
    return {
      visible: false,
      recommendedScenarioLabel: null,
      focusSessionLabel: null,
      anchorDecisionDomain: null,
      recommendation: '',
      recommendationRationale: '',
      sharedEquivalentNote: null,
      scenarios: [],
      emptyStateMessage:
        'Planifie au moins une séance future pour comparer des scénarios automatiques.',
    };
  }

  const nonBaseline = comparison.scenarios.filter((e) => e.kind !== 'KEEP_PLAN');
  const allAlternativesEquivalent =
    nonBaseline.length > 0 &&
    nonBaseline.every((e) => isGenericEquivalentExplanation(e.preferabilityExplanation));

  const scenarios = comparison.scenarios.map((entry) =>
    buildScenarioRow(entry, comparison, allAlternativesEquivalent),
  );

  const hasActionableRecommendation =
    comparison.recommendedScenarioId !== comparison.baselineScenarioId;
  const recommendedScenario = scenarios.find((s) => s.isRecommended);

  return {
    visible: hasActionableRecommendation,
    recommendedScenarioLabel: recommendedScenario?.label ?? null,
    focusSessionLabel: comparison.focusSessionLabel,
    anchorDecisionDomain: comparison.anchorDecisionDomain
      ? (DOMAIN_LABELS[comparison.anchorDecisionDomain] ?? comparison.anchorDecisionDomain)
      : null,
    recommendation: comparison.recommendation,
    recommendationRationale: comparison.recommendationRationale,
    sharedEquivalentNote: allAlternativesEquivalent
      ? 'Sur cet horizon, les alternatives testées équivalent au plan actuel — aucun avantage net détecté.'
      : null,
    scenarios,
    emptyStateMessage: null,
  };
}

export async function buildScenarioComparisonPresentationViewModel(params?: {
  horizonDays?: ProjectionHorizonDays;
  anchorTrainingDayId?: string;
}): Promise<ScenarioComparisonViewModel> {
  const comparison = await runScenarioComparison(params);
  return buildScenarioComparisonViewModel(comparison);
}

/** Compact markdown for Coach prompt injection. */
function coachScenarioMarker(
  entry: ScenarioComparison['scenarios'][number],
  recommendedScenarioId: string,
): string {
  if (entry.scenarioId === recommendedScenarioId) return '★ ';
  if (entry.kind === 'KEEP_PLAN') return '● ';
  return '- ';
}

export function formatScenarioComparisonForCoach(
  comparison: ScenarioComparison | null,
): string | null {
  if (!comparison || comparison.scenarios.length <= 1) return null;

  const lines: string[] = [];
  lines.push('## Comparaison de scénarios (Scenario Engine — orchestration)');
  if (comparison.focusSessionLabel) {
    lines.push(`Séance analysée : ${comparison.focusSessionLabel}.`);
  }
  if (comparison.anchorDecisionDomain) {
    lines.push(
      `Facteur limitant du jour (Decision Engine) : ${DOMAIN_LABELS[comparison.anchorDecisionDomain] ?? comparison.anchorDecisionDomain}.`,
    );
  }
  lines.push(`Recommandation : ${comparison.recommendation}`);
  lines.push(comparison.recommendationRationale);

  for (const entry of comparison.scenarios) {
    const d = entry.decision;
    const marker = coachScenarioMarker(entry, comparison.recommendedScenarioId);
    lines.push(
      `${marker}${entry.label} · verdict ${d.endVerdict} · confiance ${Math.round(d.endConfidence * 100)}% · benefit ${d.endExpectedBenefit}`,
    );
    if (entry.preferabilityExplanation && entry.kind !== 'KEEP_PLAN') {
      lines.push(`  Pourquoi : ${entry.preferabilityExplanation}`);
    }
    if (entry.tradeOffs.length) {
      lines.push(`  Compromis : ${entry.tradeOffs.join(' · ')}`);
    }
  }

  lines.push(
    'Le Scenario Engine explore des futurs — le Decision Engine arbitre. Explique sans contredire la décision du jour.',
  );

  return lines.join('\n');
}

export async function loadScenarioComparisonForCoach(params?: {
  horizonDays?: ProjectionHorizonDays;
}): Promise<ScenarioComparison | null> {
  return runScenarioComparison({ horizonDays: params?.horizonDays ?? 7 });
}
