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
  if (count >= 3) return 0.75;
  if (count > 0) return 0.6;
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
    ...note.checkins.map((c) => c.severity).filter((s): s is number => s != null),
  ].filter((s): s is number => s != null);

  return values.length > 0 ? Math.max(...values) : null;
}

function lastObservationAt(note: LegacyPhysicalNote): Date | null {
  const dates = note.checkins.map((c) => c.date);
  if (dates.length === 0) return note.updatedAt;
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
  const lastObs = lastObservationAt(note);

  const condition: MigrationConditionBundle['condition'] = {
    id: conditionId,
    scope,
    type,
    bodyRegion,
    side: note.side,
    label: note.title,
    diagnosis: note.description,
    status,
    severity: note.severity ?? peakSeverity(note) ?? 0,
    confidence: legacyConfidenceFromCheckins(note.checkins.length),
    affectsTraining: note.affectsTraining,
    startedAt: note.startDate,
    resolvedAt: note.resolvedAt,
    lastObservationAt: lastObs,
    recurrenceCount: 0,
    observationCount: note.checkins.length,
    estimatedRecoveryDays: null,
    primaryTriggerManual: null,
    legacyPhysicalNoteId: note.id,
  };

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
    const reassessment = findReassessmentForCheckin(checkin, reassessments);
    const context = resolveLegacyCheckinContext({
      checkinDate: checkin.date,
      analyzedAt: reassessment?.analyzedAt ?? null,
      activityDate: reassessment?.activityDate ?? null,
      reassessmentNoteIds: reassessment?.noteIds ?? [],
      noteId: note.id,
    });

    const symptomPresent = inferSymptomPresentFromLegacySeverity(checkin.severity);
    const obsId = idFactory('obs');

    observations.push({
      id: obsId,
      conditionId,
      episodeId,
      observedAt: checkin.date,
      context,
      source: 'SYSTEM_MIGRATION',
      symptomPresent,
      severityReported: checkin.severity,
      functionalImpact: inferFunctionalImpactFromLegacySeverity(checkin.severity),
      bodyRegion,
      side: note.side,
      type,
      comment: checkin.comment,
      activityId: reassessment?.activityId ?? null,
      plannedSessionId: reassessment?.plannedSessionId ?? null,
      trainingDayId: null,
      externalId: `legacy:checkin:${checkin.id}`,
      legacyPhysicalCheckinId: checkin.id,
    });

    if (checkin.severity != null) {
      functionalCapacities.push({
        id: idFactory('fc'),
        conditionId,
        observationId: obsId,
        assessedAt: checkin.date,
        painSeverity: checkin.severity,
        trainingCapacity: inferTrainingCapacityFromSeverity(checkin.severity),
        comment: null,
      });
    }

    report.push({
      legacySource: 'PhysicalCheckin',
      legacyId: checkin.id,
      destination: 'ConditionObservation',
      destinationId: obsId,
      transformation:
        context === 'AFTER_SESSION'
          ? 'checkin → post-session observation'
          : 'checkin → manual observation',
      preserved: ['date→observedAt', 'severity→severityReported', 'comment'],
      inferred: ['symptomPresent', 'functionalImpact', 'trainingCapacity snapshot'],
      discarded: [],
    });
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
    if (!session.analysis || typeof session.analysis !== 'object') continue;
    const analysis = session.analysis as {
      physicalReassessments?: Array<{ noteId: string }>;
    };
    const items = analysis.physicalReassessments ?? [];
    if (items.length === 0) continue;

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
