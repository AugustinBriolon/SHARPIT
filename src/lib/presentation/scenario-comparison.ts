/**
 * Scenario Comparison — presentation mapping + coach formatting.
 */

import type { ScenarioComparisonViewModel } from '@/core/presentation/scenario-comparison-view-model';
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

function confidenceLabel(confidence: number): string | null {
  if (confidence >= 0.75) return 'Élevée';
  if (confidence >= 0.55) return 'Modérée';
  return 'Partielle';
}

function formatScore(value: number | null): string | null {
  if (value == null) return null;
  return String(Math.round(value));
}

export function buildScenarioComparisonViewModel(
  comparison: ScenarioComparison | null,
): ScenarioComparisonViewModel {
  if (!comparison || comparison.scenarios.length === 0) {
    return {
      visible: false,
      focusSessionLabel: null,
      anchorDecisionDomain: null,
      recommendation: '',
      recommendationRationale: '',
      comparisonMethod: '',
      scenarios: [],
      emptyStateMessage:
        'Planifie au moins une séance future pour comparer des scénarios automatiques.',
    };
  }

  const scenarios = comparison.scenarios.map((entry) => {
    const lastDay = entry.projection.days[entry.projection.days.length - 1];
    const limiting =
      lastDay != null
        ? (limitingFactorLabel(lastDay.decision.limitingFactor) ??
          (entry.decision.endLimitingFactorDomain
            ? (DOMAIN_LABELS[entry.decision.endLimitingFactorDomain] ??
              entry.decision.endLimitingFactorDomain)
            : null))
        : null;

    return {
      scenarioId: entry.scenarioId,
      kind: entry.kind,
      label: entry.label,
      rationale: entry.rationale,
      endVerdict: mapVerdictToDisplay(entry.decision.endVerdict).label,
      endConfidenceLabel: confidenceLabel(entry.decision.endConfidence),
      limitingFactor: limiting,
      endReadiness: formatScore(entry.outcome.endReadiness),
      endAdaptation: formatScore(entry.outcome.endAdaptation),
      environmentalImpact: ENV_LABELS[entry.outcome.maxEnvironmentalImpact] ?? '—',
      preferabilityExplanation: entry.preferabilityExplanation,
      tradeOffs: entry.tradeOffs,
      isRecommended: entry.scenarioId === comparison.recommendedScenarioId,
      isBaseline: entry.kind === 'KEEP_PLAN',
    };
  });

  return {
    visible: true,
    focusSessionLabel: comparison.focusSessionLabel,
    anchorDecisionDomain: comparison.anchorDecisionDomain
      ? (DOMAIN_LABELS[comparison.anchorDecisionDomain] ?? comparison.anchorDecisionDomain)
      : null,
    recommendation: comparison.recommendation,
    recommendationRationale: comparison.recommendationRationale,
    comparisonMethod: comparison.comparisonMethod,
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
  lines.push(`Méthode : ${comparison.comparisonMethod}`);

  for (const entry of comparison.scenarios) {
    const d = entry.decision;
    const marker =
      entry.scenarioId === comparison.recommendedScenarioId
        ? '★ '
        : entry.kind === 'KEEP_PLAN'
          ? '● '
          : '- ';
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
