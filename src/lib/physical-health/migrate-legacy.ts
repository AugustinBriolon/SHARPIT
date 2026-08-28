/**
 * Phase 1 legacy migration — pure transforms.
 * Produces insert payloads without side effects (testable, reviewable).
 */

import type {
  Condition,
  ConditionEpisode,
  ConditionObservation,
  FunctionalCapacity,
} from '@/core/physical-health/types';
import {
  inferFunctionalImpactFromLegacySeverity,
  inferSymptomPresentFromLegacySeverity,
  inferTrainingCapacityFromSeverity,
  mapLegacyCategoryToConditionType,
  mapLegacyStatusToConditionStatus,
  mapLegacyStatusToEpisodeStatus,
  resolveBodyRegion,
  resolveConditionScope,
  resolveLegacyCheckinContext,
  type LegacyPhysicalCategory,
  type LegacyPhysicalStatus,
} from '@/core/physical-health/legacy-mapping';

function legacyConfidenceFromCheckins(count: number): number {
  if (count >= 3) {
    return 0.75;
  }
  if (count > 0) {
    return 0.6;
  }
  return 0.45;
}

export type LegacyPhysicalCheckin = {
  id: string;
  noteId: string;
  date: Date;
  severity: number | null;
  comment: string | null;
};

export type LegacyPhysicalNote = {
  id: string;
  category: LegacyPhysicalCategory;
  status: LegacyPhysicalStatus;
  title: string;
  bodyPart: string | null;
  side: 'LEFT' | 'RIGHT' | 'BILATERAL' | 'NA';
  severity: number | null;
  description: string | null;
  affectsTraining: boolean;
  startDate: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  checkins: LegacyPhysicalCheckin[];
};

export type LegacySessionReassessment = {
  plannedSessionId: string;
  activityId: string | null;
  analyzedAt: Date | null;
  activityDate: Date | null;
  noteIds: string[];
};

export type MigrationConditionBundle = {
  condition: Omit<Condition, 'id'> & { id: string };
  episode: Omit<ConditionEpisode, 'id'> & { id: string };
  observations: Array<Omit<ConditionObservation, 'id'> & { id: string }>;
  functionalCapacities: Array<Omit<FunctionalCapacity, 'id'> & { id: string }>;
};

export type MigrationReportRow = {
  legacySource: string;
  legacyId: string;
  destination: string;
  destinationId: string;
  transformation: string;
  preserved: string[];
  inferred: string[];
  discarded: string[];
};

function peakSeverity(note: LegacyPhysicalNote): number | null {
  const values = [
    note.severity,
    ...note.checkins.map((c) => c.severity).filter((s): s is number => s !== null),
  ].filter((s): s is number => s !== null);

  return values.length > 0 ? Math.max(...values) : null;
}

function lastObservationAt(note: LegacyPhysicalNote): Date | null {
  const dates = note.checkins.map((c) => c.date);
  if (dates.length === 0) {
    return note.updatedAt;
  }
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function findReassessmentForCheckin(
  checkin: LegacyPhysicalCheckin,
  reassessments: LegacySessionReassessment[],
): LegacySessionReassessment | undefined {
  return reassessments.find((r) => {
    if (!r.noteIds.includes(checkin.noteId) || !r.analyzedAt || !r.activityDate) {
      return false;
    }

    const sameActivityDay = checkin.date.toDateString() === r.activityDate.toDateString();

    return sameActivityDay || checkin.date >= r.analyzedAt;
  });
}

function buildMigrationCondition(
  note: LegacyPhysicalNote,
  ids: { conditionId: string; type: ReturnType<typeof mapLegacyCategoryToConditionType>; scope: ReturnType<typeof resolveConditionScope>; bodyRegion: ReturnType<typeof resolveBodyRegion>; status: ReturnType<typeof mapLegacyStatusToConditionStatus> },
): MigrationConditionBundle['condition'] {
  return {
    id: ids.conditionId,
    scope: ids.scope,
    type: ids.type,
    bodyRegion: ids.bodyRegion,
    side: note.side,
    label: note.title,
    diagnosis: note.description,
    status: ids.status,
    severity: note.severity ?? peakSeverity(note) ?? 0,
    confidence: legacyConfidenceFromCheckins(note.checkins.length),
    affectsTraining: note.affectsTraining,
    startedAt: note.startDate,
    resolvedAt: note.resolvedAt,
    lastObservationAt: lastObservationAt(note),
    recurrenceCount: 0,
    observationCount: note.checkins.length,
    estimatedRecoveryDays: null,
    primaryTriggerManual: null,
    legacyPhysicalNoteId: note.id,
  };
}

function buildLegacyObservation(input: {
  obsId: string;
  checkin: LegacyPhysicalCheckin;
  note: LegacyPhysicalNote;
  context: ReturnType<typeof resolveLegacyCheckinContext>;
  reassessment: LegacySessionReassessment | undefined;
  conditionId: string;
  episodeId: string;
  bodyRegion: ReturnType<typeof resolveBodyRegion>;
  type: ReturnType<typeof mapLegacyCategoryToConditionType>;
}): MigrationConditionBundle['observations'][number] {
  return {
    id: input.obsId,
    conditionId: input.conditionId,
    episodeId: input.episodeId,
    observedAt: input.checkin.date,
    context: input.context,
    source: 'SYSTEM_MIGRATION',
    symptomPresent: inferSymptomPresentFromLegacySeverity(input.checkin.severity),
    severityReported: input.checkin.severity,
    functionalImpact: inferFunctionalImpactFromLegacySeverity(input.checkin.severity),
    bodyRegion: input.bodyRegion,
    side: input.note.side,
    type: input.type,
    comment: input.checkin.comment,
    activityId: input.reassessment?.activityId ?? null,
    plannedSessionId: input.reassessment?.plannedSessionId ?? null,
    trainingDayId: null,
    externalId: `legacy:checkin:${input.checkin.id}`,
    legacyPhysicalCheckinId: input.checkin.id,
  };
}

function legacyCheckinReport(
  checkinId: string,
  obsId: string,
  context: ReturnType<typeof resolveLegacyCheckinContext>,
): MigrationReportRow {
  return {
    legacySource: 'PhysicalCheckin',
    legacyId: checkinId,
    destination: 'ConditionObservation',
    destinationId: obsId,
    transformation:
      context === 'AFTER_SESSION'
        ? 'checkin → post-session observation'
        : 'checkin → manual observation',
    preserved: ['date→observedAt', 'severity→severityReported', 'comment'],
    inferred: ['symptomPresent', 'functionalImpact', 'trainingCapacity snapshot'],
    discarded: [],
  };
}

function migrateLegacyCheckin(input: {
  checkin: LegacyPhysicalCheckin;
  note: LegacyPhysicalNote;
  reassessments: LegacySessionReassessment[];
  conditionId: string;
  episodeId: string;
  bodyRegion: ReturnType<typeof resolveBodyRegion>;
  type: ReturnType<typeof mapLegacyCategoryToConditionType>;
  idFactory: (prefix: string) => string;
}): { observation: MigrationConditionBundle['observations'][number]; capacity: MigrationConditionBundle['functionalCapacities'][number] | null; report: MigrationReportRow } {
  const reassessment = findReassessmentForCheckin(input.checkin, input.reassessments);
  const obsId = input.idFactory('obs');
  const context = resolveLegacyCheckinContext({
    checkinDate: input.checkin.date,
    analyzedAt: reassessment?.analyzedAt ?? null,
    activityDate: reassessment?.activityDate ?? null,
    reassessmentNoteIds: reassessment?.noteIds ?? [],
    noteId: input.note.id,
  });
  const observation = buildLegacyObservation({
    obsId,
    checkin: input.checkin,
    note: input.note,
    context,
    reassessment,
    conditionId: input.conditionId,
    episodeId: input.episodeId,
    bodyRegion: input.bodyRegion,
    type: input.type,
  });

  const capacity =
    input.checkin.severity !== null
      ? {
          id: input.idFactory('fc'),
          conditionId: input.conditionId,
          observationId: obsId,
          assessedAt: input.checkin.date,
          painSeverity: input.checkin.severity,
          trainingCapacity: inferTrainingCapacityFromSeverity(input.checkin.severity),
          comment: null,
        }
      : null;

  return {
    observation,
    capacity,
    report: legacyCheckinReport(input.checkin.id, obsId, context),
  };
}

export function migrateLegacyPhysicalNote(
  note: LegacyPhysicalNote,
  reassessments: LegacySessionReassessment[],
  idFactory: (prefix: string) => string,
): { bundle: MigrationConditionBundle; report: MigrationReportRow[] } {
  const conditionId = idFactory('cond');
  const episodeId = idFactory('ep');
  const type = mapLegacyCategoryToConditionType(note.category);
  const scope = resolveConditionScope(type, note.bodyPart);
  const bodyRegion = resolveBodyRegion(scope, note.bodyPart, note.title, type);
  const status = mapLegacyStatusToConditionStatus(note.status);

  const condition = buildMigrationCondition(note, { conditionId, type, scope, bodyRegion, status });
  const episode: MigrationConditionBundle['episode'] = {
    id: episodeId,
    conditionId,
    episodeNumber: 1,
    status: mapLegacyStatusToEpisodeStatus(note.status),
    startedAt: note.startDate,
    resolvedAt: note.resolvedAt,
    peakSeverity: peakSeverity(note),
    estimatedRecoveryDays: null,
    triggerHypothesis: null,
  };

  const observations: MigrationConditionBundle['observations'] = [];
  const functionalCapacities: MigrationConditionBundle['functionalCapacities'] = [];
  const report: MigrationReportRow[] = [
    {
      legacySource: 'PhysicalNote',
      legacyId: note.id,
      destination: 'Condition',
      destinationId: conditionId,
      transformation: '1:1 note → condition + episode #1',
      preserved: [
        'title→label',
        'category→type',
        'bodyPart→bodyRegion',
        'side',
        'severity (initial)',
        'status (mapped)',
        'affectsTraining',
        'startDate',
        'resolvedAt',
        'description→diagnosis',
      ],
      inferred: ['scope', 'confidence', 'observationCount', 'recurrenceCount=0'],
      discarded: [],
    },
  ];

  for (const checkin of note.checkins) {
    const migrated = migrateLegacyCheckin({
      checkin,
      note,
      reassessments,
      conditionId,
      episodeId,
      bodyRegion,
      type,
      idFactory,
    });
    observations.push(migrated.observation);
    if (migrated.capacity) {
      functionalCapacities.push(migrated.capacity);
    }
    report.push(migrated.report);
  }

  return {
    bundle: { condition, episode, observations, functionalCapacities },
    report,
  };
}

export function extractReassessmentsFromPlannedSessions(
  sessions: Array<{
    id: string;
    activityId: string | null;
    analyzedAt: Date | null;
    date: Date;
    analysis: unknown;
  }>,
): LegacySessionReassessment[] {
  const result: LegacySessionReassessment[] = [];

  for (const session of sessions) {
    if (!session.analysis || typeof session.analysis !== 'object') {
      continue;
    }
    const analysis = session.analysis as {
      physicalReassessments?: Array<{ noteId: string }>;
    };
    const items = analysis.physicalReassessments ?? [];
    if (items.length === 0) {
      continue;
    }

    result.push({
      plannedSessionId: session.id,
      activityId: session.activityId,
      analyzedAt: session.analyzedAt,
      activityDate: session.date,
      noteIds: items.map((r) => r.noteId),
    });
  }

  return result;
}

export function migrateAllLegacyPhysicalNotes(
  notes: LegacyPhysicalNote[],
  reassessments: LegacySessionReassessment[],
  idFactory: (prefix: string) => string,
): { bundles: MigrationConditionBundle[]; report: MigrationReportRow[] } {
  const bundles: MigrationConditionBundle[] = [];
  const report: MigrationReportRow[] = [];

  for (const note of notes) {
    const migrated = migrateLegacyPhysicalNote(note, reassessments, idFactory);
    bundles.push(migrated.bundle);
    report.push(...migrated.report);
  }

  return { bundles, report };
}
