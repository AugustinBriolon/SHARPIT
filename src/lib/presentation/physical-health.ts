/**
 * Physical Health — Presentation builder
 * Sources: Athlete Snapshot (inferred state) + Condition tables (history / timeline)
 */

import { format } from 'date-fns';
import { isSet } from '@/lib/util/value';
import { fr } from 'date-fns/locale';
import type { PhysicalHealthViewModel } from '@/core/presentation/physical-health-view-model';
import { isActiveCondition } from '@/core/inference/physical-health/scoring';
import { buildConditionTimeline } from '@/core/physical-health/timeline';
import type {
  Condition,
  ConditionEpisode,
  ConditionObservation,
  FunctionalCapacity,
} from '@/core/physical-health/types';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { corpsToneFromPhysicalSeverity } from '@/lib/health/health-status';
import { mapConfidenceToTier } from '@/lib/today/today-mapping';
import { buildGlobalDecisionContext } from '@/lib/decision/global-decision-context';
import { EMPTY_GLOBAL_DECISION } from '@/core/presentation/global-decision-context';
import { prisma } from '@/lib/prisma';

const TYPE_LABELS: Record<string, string> = {
  PAIN: 'Douleur',
  INJURY: 'Blessure',
  MOBILITY_LIMITATION: 'Mobilité',
  POSTURE_ISSUE: 'Posture',
  DISCOMFORT: 'Gêne',
  MUSCULAR_TIGHTNESS: 'Raideur musculaire',
  JOINT_STIFFNESS: 'Raideur articulaire',
  INSTABILITY: 'Instabilité',
  RECURRING_PHYSICAL: 'Récidive',
  OTHER: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouvelle',
  ACTIVE: 'Active',
  IMPROVING: 'En amélioration',
  STABLE: 'Stable',
  WORSENING: 'En aggravation',
  RESOLVED: 'Résolue',
  RECURRENT: 'Récurrente',
};

const TREND_LABELS: Record<string, string> = {
  IMPROVING: 'en amélioration',
  STABLE: 'stable',
  WORSENING: 'en aggravation',
};

/** TrainingCapacityLevel labels (FULL/REDUCED/LIMITED/UNABLE) — a different enum from
 * fatigue's TrainingCapacity (FULL/REDUCED/LIGHT_ONLY/REST_ONLY); do not conflate the two. */
export const CAPACITY_LABELS: Record<string, string> = {
  FULL: 'Entraînement complet',
  REDUCED: 'Charge réduite',
  LIMITED: 'Entraînement limité',
  UNABLE: 'Entraînement impossible',
};

const DECISION_LABELS: Record<string, string> = {
  CLEAR: 'Aucune contrainte identifiée',
  MONITOR: 'Surveillance recommandée',
  REDUCE_LOAD: 'Réduire la charge',
  LIMIT_TRAINING: "Limiter l'entraînement",
  REST_RECOMMENDED: 'Repos recommandé',
  INSUFFICIENT_DATA: 'Données insuffisantes',
};

const SIDE_LABELS: Record<string, string> = {
  LEFT: 'Gauche',
  RIGHT: 'Droit',
  BILATERAL: 'Bilatéral',
};

function confidenceTone(pct: number): 'good' | 'warn' | 'neutral' | 'bad' {
  const tier = mapConfidenceToTier(pct);
  if (tier === 'high') {
    return 'good';
  }
  if (tier === 'medium') {
    return 'warn';
  }
  return 'neutral';
}

function toDomainCondition(row: {
  id: string;
  scope: 'LOCALIZED' | 'SYSTEMIC';
  type: string;
  bodyRegion: string;
  side: string;
  label: string;
  diagnosis: string | null;
  status: string;
  severity: number;
  confidence: number;
  affectsTraining: boolean;
  startedAt: Date;
  resolvedAt: Date | null;
  recurrenceCount: number;
  observationCount: number;
  estimatedRecoveryDays: number | null;
  legacyPhysicalNoteId: string | null;
}): Condition {
  return {
    id: row.id,
    scope: row.scope,
    type: row.type as Condition['type'],
    bodyRegion: row.bodyRegion,
    side: row.side as Condition['side'],
    label: row.label,
    diagnosis: row.diagnosis,
    status: row.status as Condition['status'],
    severity: row.severity,
    confidence: row.confidence,
    affectsTraining: row.affectsTraining,
    startedAt: row.startedAt,
    resolvedAt: row.resolvedAt,
    lastObservationAt: null,
    recurrenceCount: row.recurrenceCount,
    observationCount: row.observationCount,
    estimatedRecoveryDays: row.estimatedRecoveryDays,
    primaryTriggerManual: null,
    legacyPhysicalNoteId: row.legacyPhysicalNoteId,
  };
}

function buildConditionDomainModels(row: Awaited<ReturnType<typeof loadConditions>>[number]) {
  const condition = toDomainCondition(row);
  const episodes: ConditionEpisode[] = row.episodes.map((ep) => ({
    id: ep.id,
    conditionId: row.id,
    episodeNumber: ep.episodeNumber,
    status: ep.status as ConditionEpisode['status'],
    startedAt: ep.startedAt,
    resolvedAt: ep.resolvedAt,
    peakSeverity: ep.peakSeverity,
    estimatedRecoveryDays: ep.estimatedRecoveryDays,
    triggerHypothesis: ep.triggerHypothesis,
  }));
  const observations: ConditionObservation[] = row.observations.map((o) => ({
    id: o.id,
    conditionId: o.conditionId,
    episodeId: o.episodeId,
    observedAt: o.observedAt,
    context: o.context as ConditionObservation['context'],
    source: o.source as ConditionObservation['source'],
    symptomPresent: o.symptomPresent,
    severityReported: o.severityReported,
    functionalImpact: o.functionalImpact as ConditionObservation['functionalImpact'],
    bodyRegion: o.bodyRegion,
    side: o.side as ConditionObservation['side'],
    type: o.type as ConditionObservation['type'],
    comment: o.comment,
    activityId: o.activityId,
    plannedSessionId: o.plannedSessionId,
    trainingDayId: o.trainingDayId,
    externalId: o.externalId,
    legacyPhysicalCheckinId: o.legacyPhysicalCheckinId,
  }));
  const functionalCapacities: FunctionalCapacity[] = row.functionalCapacities.map((fc) => ({
    id: fc.id,
    conditionId: fc.conditionId,
    observationId: fc.observationId,
    assessedAt: fc.assessedAt,
    painSeverity: fc.painSeverity,
    trainingCapacity: fc.trainingCapacity as FunctionalCapacity['trainingCapacity'],
    comment: fc.comment,
  }));
  return { condition, episodes, observations, functionalCapacities };
}

function buildConditionSparkline(observations: ConditionObservation[]) {
  return observations
    .filter((o) => isSet(o.severityReported))
    .slice(-14)
    .map((o) => ({
      date: format(o.observedAt, 'dd MMM', { locale: fr }),
      severity: o.severityReported,
    }));
}

function resolveConditionSideLabel(side: string) {
  if (side === 'NA') {
    return null;
  }
  return SIDE_LABELS[side] ?? null;
}

function resolveFunctionalCapacityLabel(functionalCapacity: string | null) {
  if (!functionalCapacity) {
    return null;
  }
  return CAPACITY_LABELS[functionalCapacity] ?? functionalCapacity;
}

function resolveConditionCardState(
  row: Awaited<ReturnType<typeof loadConditions>>[number],
  inferred:
    | {
        severity: number;
        status: string;
        trend: string;
        confidence: number;
        functionalCapacity: string | null;
        estimatedRecoveryDays: number | null;
      }
    | undefined,
) {
  if (!inferred) {
    return {
      severity: row.severity,
      status: row.status,
      trend: 'UNKNOWN',
      functionalCapacity: null,
      confidence: row.confidence,
      estimatedRecoveryDays: row.estimatedRecoveryDays,
    };
  }
  return {
    severity: inferred.severity,
    status: inferred.status,
    trend: inferred.trend,
    functionalCapacity: inferred.functionalCapacity,
    confidence: inferred.confidence,
    estimatedRecoveryDays: inferred.estimatedRecoveryDays,
  };
}

function buildConditionCard(
  row: Awaited<ReturnType<typeof loadConditions>>[number],
  inferred:
    | {
        severity: number;
        status: string;
        trend: string;
        confidence: number;
        functionalCapacity: string | null;
        estimatedRecoveryDays: number | null;
      }
    | undefined,
): PhysicalHealthViewModel['activeConditions'][number] {
  const { condition, episodes, observations, functionalCapacities } =
    buildConditionDomainModels(row);
  const timeline = buildConditionTimeline({
    condition,
    episodes,
    observations,
    functionalCapacities,
    knowledge: [],
  });
  const state = resolveConditionCardState(row, inferred);
  const sparkline = buildConditionSparkline(observations);

  return {
    conditionId: row.id,
    label: row.label,
    bodyRegion: row.bodyRegion,
    sideLabel: resolveConditionSideLabel(row.side),
    type: row.type,
    typeLabel: TYPE_LABELS[row.type] ?? row.type,
    scope: row.scope,
    severity: state.severity,
    status: state.status,
    statusLabel: STATUS_LABELS[state.status] ?? state.status,
    trend: state.trend,
    trendLabel: TREND_LABELS[state.trend] ?? null,
    functionalCapacity: state.functionalCapacity,
    functionalCapacityLabel: resolveFunctionalCapacityLabel(state.functionalCapacity),
    confidencePct: Math.round(state.confidence * 100),
    confidenceTone: confidenceTone(state.confidence),
    estimatedRecoveryDays: state.estimatedRecoveryDays,
    affectsTraining: row.affectsTraining,
    isActive: isActiveCondition(
      state.status as import('@/core/physical-health/types').ConditionStatus,
    ),
    observationCount: row.observationCount,
    sparkline,
    timelinePreview: timeline.events.slice(-5).map((e) => ({
      at: format(e.at, 'd MMM · HH:mm', { locale: fr }),
      label: e.label,
      kind: e.kind,
    })),
    legacyPhysicalNoteId: row.legacyPhysicalNoteId,
  };
}

async function loadConditions(athleteId: string) {
  return prisma.condition.findMany({
    where: { athleteId },
    include: {
      episodes: { orderBy: { episodeNumber: 'asc' } },
      observations: { orderBy: { observedAt: 'asc' } },
      functionalCapacities: { orderBy: { assessedAt: 'asc' } },
    },
    orderBy: [{ status: 'asc' }, { severity: 'desc' }],
  });
}

function emptyViewModel(): PhysicalHealthViewModel {
  return {
    aggregate: {
      activeCount: 0,
      resolvedCount: 0,
      maxSeverity: 0,
      aggregateTrainingCapacity: 'FULL',
      aggregateTrainingCapacityLabel: CAPACITY_LABELS.FULL,
      trainingBlocked: false,
      confidencePct: 0,
      confidenceTone: 'neutral',
      decisionVerdict: 'INSUFFICIENT_DATA',
      decisionLabel: DECISION_LABELS.INSUFFICIENT_DATA,
      primaryConditionLabel: null,
    },
    activeConditions: [],
    resolvedConditions: [],
    globalDecision: EMPTY_GLOBAL_DECISION,
    medicalDisclaimer:
      "SHARPIT estime ton état physique à partir de tes observations. Ce n'est pas un diagnostic médical ni un avis de traitement.",
    emptyState: {
      title: 'Aucune condition suivie',
      description:
        'Ajoute une condition (douleur, mobilité, posture…) pour construire une mémoire physiologique durable.',
      action: { label: 'Ajouter une condition', href: '/moi/corps' },
    },
    hierarchy: { rootId: 'hero', order: ['hero', 'conditions', 'history'] },
    sections: [],
  };
}

function maxConditionSeverity(activeConditions: PhysicalHealthViewModel['activeConditions']) {
  if (activeConditions.length === 0) {
    return 0;
  }
  return Math.max(...activeConditions.map((c) => c.severity));
}

function resolvePhysicalHealthAggregateSource(
  ph: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>['physicalHealth'],
) {
  if (!ph) {
    return {
      aggregateTrainingCapacity: 'FULL' as const,
      confidence: 0.5,
      decisionVerdict: 'INSUFFICIENT_DATA' as const,
      activeConditionCount: null as number | null,
      trainingBlocked: false,
    };
  }
  return {
    aggregateTrainingCapacity: ph.aggregateTrainingCapacity,
    confidence: ph.confidence,
    decisionVerdict: ph.decision?.verdict ?? 'INSUFFICIENT_DATA',
    activeConditionCount: ph.activeConditionCount,
    trainingBlocked: ph.trainingBlockedByCondition,
  };
}

function buildPhysicalHealthAggregate(input: {
  ph: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>['physicalHealth'];
  activeConditions: PhysicalHealthViewModel['activeConditions'];
  resolvedConditions: PhysicalHealthViewModel['resolvedConditions'];
  primaryCondition: PhysicalHealthViewModel['activeConditions'][number] | undefined;
}): PhysicalHealthViewModel['aggregate'] {
  const source = resolvePhysicalHealthAggregateSource(input.ph);
  const { aggregateTrainingCapacity } = source;

  return {
    activeCount: source.activeConditionCount ?? input.activeConditions.length,
    resolvedCount: input.resolvedConditions.length,
    maxSeverity: maxConditionSeverity(input.activeConditions),
    aggregateTrainingCapacity,
    aggregateTrainingCapacityLabel:
      CAPACITY_LABELS[aggregateTrainingCapacity] ?? aggregateTrainingCapacity,
    trainingBlocked: source.trainingBlocked,
    confidencePct: Math.round(source.confidence * 100),
    confidenceTone: confidenceTone(source.confidence),
    decisionVerdict: source.decisionVerdict,
    decisionLabel: DECISION_LABELS[source.decisionVerdict] ?? source.decisionVerdict,
    primaryConditionLabel: input.primaryCondition?.label ?? null,
  };
}

function resolvePrimaryCondition(
  cards: Array<PhysicalHealthViewModel['activeConditions'][number]>,
  primaryId: string | null,
  activeConditions: PhysicalHealthViewModel['activeConditions'],
) {
  if (primaryId) {
    return cards.find((c) => c.conditionId === primaryId);
  }
  return activeConditions[0];
}

function buildPhysicalHealthSections(maxSeverity: number, activeCount: number) {
  return [
    {
      id: 'hero',
      type: 'hero' as const,
      data: { maxSeverity, corpsTone: corpsToneFromPhysicalSeverity(maxSeverity) },
    },
    { id: 'active', type: 'dimensions' as const, data: { count: activeCount } },
  ];
}

function buildPopulatedPhysicalHealthViewModel(input: {
  snapshot: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>;
  cards: Array<PhysicalHealthViewModel['activeConditions'][number]>;
  activeConditions: PhysicalHealthViewModel['activeConditions'];
  resolvedConditions: PhysicalHealthViewModel['resolvedConditions'];
  primaryCondition: PhysicalHealthViewModel['activeConditions'][number] | undefined;
}): PhysicalHealthViewModel {
  const maxSeverity = maxConditionSeverity(input.activeConditions);
  const aggregate = buildPhysicalHealthAggregate({
    ph: input.snapshot.physicalHealth,
    activeConditions: input.activeConditions,
    resolvedConditions: input.resolvedConditions,
    primaryCondition: input.primaryCondition,
  });
  const hasNoConditions =
    input.activeConditions.length === 0 && input.resolvedConditions.length === 0;

  return {
    aggregate,
    activeConditions: input.activeConditions,
    resolvedConditions: input.resolvedConditions,
    globalDecision: buildGlobalDecisionContext(input.snapshot, 'PHYSICAL_HEALTH'),
    medicalDisclaimer:
      "SHARPIT estime ton état physique à partir de tes observations. Ce n'est pas un diagnostic médical ni un avis de traitement.",
    emptyState: hasNoConditions ? emptyViewModel().emptyState : null,
    hierarchy: {
      rootId: 'hero',
      order: ['hero', 'active', 'resolved', 'disclaimer'],
    },
    sections: buildPhysicalHealthSections(maxSeverity, input.activeConditions.length),
  };
}

export async function buildPhysicalHealthPresentationViewModel(
  athleteId: string,
  trainingDayId: string,
): Promise<PhysicalHealthViewModel> {
  const [snapshot, rows] = await Promise.all([
    getOrBuildAthleteSnapshot(athleteId, trainingDayId),
    loadConditions(athleteId),
  ]);

  if (rows.length === 0 && !snapshot.physicalHealth) {
    return emptyViewModel();
  }

  const inferredById = new Map(
    (snapshot.physicalHealth?.conditions ?? []).map((c) => [c.conditionId, c]),
  );
  const cards = rows.map((row) => buildConditionCard(row, inferredById.get(row.id)));
  const activeConditions = cards.filter((c) => c.isActive);
  const resolvedConditions = cards.filter((c) => !c.isActive);
  const primaryId = snapshot.physicalHealth?.primaryLimitingConditionId ?? null;
  const primaryCondition = resolvePrimaryCondition(cards, primaryId, activeConditions);

  return buildPopulatedPhysicalHealthViewModel({
    snapshot,
    cards,
    activeConditions,
    resolvedConditions,
    primaryCondition,
  });
}
