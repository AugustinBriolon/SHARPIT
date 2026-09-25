/**
 * Cap instrument → modal detail view-models.
 * Pure presentation; no Core. Aggregates only — no session history.
 */

import type { GoalCapSportShare, GoalCapStatsView } from '@/lib/goals/goal-cap-stats';
import type { GoalPositionAuditView } from '@/lib/goals/goal-position-audit';

export type CapStatKind = 'sessions' | 'duration' | 'load' | 'position';

export type CapStatDetail = {
  readonly kind: CapStatKind;
  readonly title: string;
  readonly value: string;
  readonly lead: string;
  readonly facts: readonly { label: string; value: string }[];
  readonly sportShares: readonly GoalCapSportShare[];
  readonly sportShareMode: 'sessions' | 'duration' | 'both' | null;
  readonly audit: GoalPositionAuditView | null;
};

function sessionsDetail(stats: GoalCapStatsView): CapStatDetail {
  return {
    kind: 'sessions',
    title: 'Séances',
    value: String(stats.sessionsDone),
    lead: 'Volume de séances liées à ce cap — répartition par sport.',
    facts: [
      ...(stats.sessionsPerWeekLabel
        ? [{ label: 'Rythme', value: stats.sessionsPerWeekLabel }]
        : []),
      { label: 'Période', value: `${stats.weeksSpanned.toLocaleString('fr-FR')} sem.` },
    ],
    sportShares: stats.sportShares,
    sportShareMode: 'sessions',
    audit: null,
  };
}

function durationDetail(stats: GoalCapStatsView): CapStatDetail {
  return {
    kind: 'duration',
    title: 'Durée',
    value: stats.durationLabel,
    lead: 'Temps consacré à ce cap — répartition par sport.',
    facts: [
      ...(stats.avgDurationLabel
        ? [{ label: 'Moyenne / séance', value: stats.avgDurationLabel }]
        : []),
      { label: 'Séances', value: String(stats.sessionsDone) },
    ],
    sportShares: stats.sportShares,
    sportShareMode: 'duration',
    audit: null,
  };
}

function loadDetail(stats: GoalCapStatsView): CapStatDetail {
  return {
    kind: 'load',
    title: 'TSS',
    value: stats.loadLabel ?? '—',
    lead: 'Charge d’entraînement cumulée sur les séances liées au cap.',
    facts: [{ label: 'Séances faites', value: String(stats.sessionsDone) }],
    sportShares: [],
    sportShareMode: null,
    audit: null,
  };
}

function positionDetail(audit: GoalPositionAuditView | null): CapStatDetail {
  if (!audit) {
    return {
      kind: 'position',
      title: 'Position',
      value: '—',
      lead: 'La comparaison chrono n’est pas encore disponible.',
      facts: [],
      sportShares: [],
      sportShareMode: null,
      audit: null,
    };
  }

  return {
    kind: 'position',
    title: audit.label,
    value: audit.value,
    lead: audit.lead,
    facts: [],
    sportShares: [],
    sportShareMode: null,
    audit,
  };
}

export function buildCapStatDetail(input: {
  kind: CapStatKind;
  stats: GoalCapStatsView;
  position: GoalPositionAuditView | null;
}): CapStatDetail {
  if (input.kind === 'sessions') {
    return sessionsDetail(input.stats);
  }
  if (input.kind === 'duration') {
    return durationDetail(input.stats);
  }
  if (input.kind === 'load') {
    return loadDetail(input.stats);
  }
  return positionDetail(input.position);
}
