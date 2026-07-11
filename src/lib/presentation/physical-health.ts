/**
 * Physical Health — Presentation builder
 * Sources: Athlete Snapshot (inferred state) + Condition tables (history / timeline)
 */

import { format } from 'date-fns';
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
import { corpsToneFromPhysicalSeverity } from '@/lib/health-status';
import { mapConfidenceToTier } from '@/lib/today-mapping';
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

const CAPACITY_LABELS: Record<string, string> = {
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
  if (tier === 'high') return 'good';
  if (tier === 'medium') return 'warn';
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

  const timeline = buildConditionTimeline({
    condition,
    episodes,
    observations,
    functionalCapacities,
    knowledge: [],
  });

  const severity = inferred?.severity ?? row.severity;
  const status = inferred?.status ?? row.status;
  const trend = inferred?.trend ?? 'UNKNOWN';
  const functionalCapacity = inferred?.functionalCapacity ?? null;
  const confidence = inferred?.confidence ?? row.confidence;

  const sparkline = observations
    .filter((o) => o.severityReported != null)
    .slice(-14)
    .map((o) => ({
      date: format(o.observedAt, 'dd MMM', { locale: fr }),
      severity: o.severityReported,
    }));

  return {
    conditionId: row.id,
    label: row.label,
    bodyRegion: row.bodyRegion,
    sideLabel: row.side !== 'NA' ? (SIDE_LABELS[row.side] ?? null) : null,
    type: row.type,
    typeLabel: TYPE_LABELS[row.type] ?? row.type,
    scope: row.scope,
    severity,
    status,
    statusLabel: STATUS_LABELS[status] ?? status,
    trend,
    trendLabel: TREND_LABELS[trend] ?? null,
    functionalCapacity,
    functionalCapacityLabel: functionalCapacity
      ? (CAPACITY_LABELS[functionalCapacity] ?? functionalCapacity)
      : null,
    confidencePct: Math.round(confidence * 100),
    confidenceTone: confidenceTone(confidence),
    estimatedRecoveryDays: inferred?.estimatedRecoveryDays ?? row.estimatedRecoveryDays,
    affectsTraining: row.affectsTraining,
    isActive: isActiveCondition(status as import('@/core/physical-health/types').ConditionStatus),
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

async function loadConditions() {
  return prisma.condition.findMany({
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
      action: { label: 'Ajouter une condition', href: '/biology?tab=suivi' },
    },
    hierarchy: { rootId: 'hero', order: ['hero', 'conditions', 'history'] },
    sections: [],
  };
}

export async function buildPhysicalHealthPresentationViewModel(
  trainingDayId: string,
): Promise<PhysicalHealthViewModel> {
  const [snapshot, rows] = await Promise.all([
    getOrBuildAthleteSnapshot(trainingDayId),
    loadConditions(),
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

  const ph = snapshot.physicalHealth;
  const aggregateTrainingCapacity = ph?.aggregateTrainingCapacity ?? 'FULL';
  const primaryId = ph?.primaryLimitingConditionId ?? null;
  const primaryCondition = primaryId
    ? cards.find((c) => c.conditionId === primaryId)
    : activeConditions[0];

  const maxSeverity =
    activeConditions.length > 0 ? Math.max(...activeConditions.map((c) => c.severity)) : 0;

  const confidence = ph?.confidence ?? 0.5;
  const decisionVerdict = ph?.decision?.verdict ?? 'INSUFFICIENT_DATA';

  return {
    aggregate: {
      activeCount: ph?.activeConditionCount ?? activeConditions.length,
      resolvedCount: resolvedConditions.length,
      maxSeverity,
      aggregateTrainingCapacity,
      aggregateTrainingCapacityLabel:
        CAPACITY_LABELS[aggregateTrainingCapacity] ?? aggregateTrainingCapacity,
      trainingBlocked: ph?.trainingBlockedByCondition ?? false,
      confidencePct: Math.round(confidence * 100),
      confidenceTone: confidenceTone(confidence),
      decisionVerdict,
      decisionLabel: DECISION_LABELS[decisionVerdict] ?? decisionVerdict,
      primaryConditionLabel: primaryCondition?.label ?? null,
    },
    activeConditions,
    resolvedConditions,
    globalDecision: buildGlobalDecisionContext(snapshot, 'PHYSICAL_HEALTH'),
    medicalDisclaimer:
      "SHARPIT estime ton état physique à partir de tes observations. Ce n'est pas un diagnostic médical ni un avis de traitement.",
    emptyState:
      activeConditions.length === 0 && resolvedConditions.length === 0
        ? emptyViewModel().emptyState
        : null,
    hierarchy: {
      rootId: 'hero',
      order: ['hero', 'active', 'resolved', 'disclaimer'],
    },
    sections: [
      {
        id: 'hero',
        type: 'hero',
        data: { maxSeverity, corpsTone: corpsToneFromPhysicalSeverity(maxSeverity) },
      },
      { id: 'active', type: 'dimensions', data: { count: activeConditions.length } },
    ],
  };
}
