import { describe, expect, it } from 'vitest';
import { buildConditionTimeline } from '@/core/physical-health/timeline';
import {
  mapLegacyCategoryToConditionType,
  mapLegacyStatusToConditionStatus,
  resolveConditionScope,
  inferSymptomPresentFromLegacySeverity,
} from '@/core/physical-health/legacy-mapping';
import {
  extractReassessmentsFromPlannedSessions,
  migrateLegacyPhysicalNote,
} from '@/lib/physical-health/migrate-legacy';

describe('legacy-mapping', () => {
  it('maps physical categories to condition types', () => {
    expect(mapLegacyCategoryToConditionType('MOBILITY')).toBe('MOBILITY_LIMITATION');
    expect(mapLegacyCategoryToConditionType('POSTURE')).toBe('POSTURE_ISSUE');
  });

  it('resolves systemic scope for global mobility', () => {
    expect(resolveConditionScope('MOBILITY_LIMITATION', 'Général')).toBe('SYSTEMIC');
    expect(resolveConditionScope('PAIN', 'Genou')).toBe('LOCALIZED');
  });

  it('treats severity 0 as asymptomatic not resolved', () => {
    expect(inferSymptomPresentFromLegacySeverity(0)).toBe(false);
    expect(inferSymptomPresentFromLegacySeverity(3)).toBe(true);
  });

  it('maps resolved status', () => {
    expect(mapLegacyStatusToConditionStatus('RESOLVED')).toBe('RESOLVED');
    expect(mapLegacyStatusToConditionStatus('MONITORING')).toBe('STABLE');
  });
});

describe('migrate-legacy', () => {
  const note = {
    id: 'note-1',
    category: 'PAIN' as const,
    status: 'ACTIVE' as const,
    title: "Tendon d'Achille droit",
    bodyPart: 'Achille',
    side: 'RIGHT' as const,
    severity: 5,
    description: 'Gêne en fin de sortie',
    affectsTraining: true,
    startDate: new Date('2026-01-01'),
    resolvedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-06-01'),
    checkins: [
      {
        id: 'chk-1',
        noteId: 'note-1',
        date: new Date('2026-02-01'),
        severity: 7,
        comment: 'Après sortie longue',
      },
      {
        id: 'chk-2',
        noteId: 'note-1',
        date: new Date('2026-03-01'),
        severity: 0,
        comment: 'Rien ressenti sur la séance',
      },
    ],
  };

  it('migrates note to condition + episode + observations', () => {
    let n = 0;
    const { bundle } = migrateLegacyPhysicalNote(note, [], () => `id-${++n}`);

    expect(bundle.condition.legacyPhysicalNoteId).toBe('note-1');
    expect(bundle.episode.episodeNumber).toBe(1);
    expect(bundle.observations).toHaveLength(2);
    expect(bundle.observations[1].symptomPresent).toBe(false);
    expect(bundle.observations[1].severityReported).toBe(0);
    expect(bundle.functionalCapacities).toHaveLength(2);
  });

  it('classifies post-session checkins when reassessment matches', () => {
    const reassessments = [
      {
        plannedSessionId: 'ps-1',
        activityId: 'act-1',
        analyzedAt: new Date('2026-02-01T10:00:00'),
        activityDate: new Date('2026-02-01'),
        noteIds: ['note-1'],
      },
    ];

    let n = 0;
    const { bundle } = migrateLegacyPhysicalNote(note, reassessments, () => `id-${++n}`);

    expect(bundle.observations[0].context).toBe('AFTER_SESSION');
    expect(bundle.observations[0].activityId).toBe('act-1');
    expect(bundle.observations[0].plannedSessionId).toBe('ps-1');
  });

  it('extracts reassessments from planned session analysis JSON', () => {
    const rows = extractReassessmentsFromPlannedSessions([
      {
        id: 'ps-1',
        activityId: 'a-1',
        analyzedAt: new Date('2026-02-01'),
        date: new Date('2026-02-01'),
        analysis: {
          physicalReassessments: [{ noteId: 'note-1', noteTitle: 'Achille' }],
        },
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].noteIds).toEqual(['note-1']);
  });
});

describe('buildConditionTimeline', () => {
  it('orders events chronologically', () => {
    const condition = {
      id: 'c1',
      scope: 'LOCALIZED' as const,
      type: 'PAIN' as const,
      bodyRegion: 'Achille',
      side: 'RIGHT' as const,
      label: 'Achille',
      diagnosis: null,
      status: 'ACTIVE' as const,
      severity: 3,
      confidence: 0.7,
      affectsTraining: true,
      startedAt: new Date('2026-01-01'),
      resolvedAt: null,
      lastObservationAt: new Date('2026-03-01'),
      recurrenceCount: 0,
      observationCount: 1,
      estimatedRecoveryDays: null,
      primaryTriggerManual: null,
      legacyPhysicalNoteId: null,
    };

    const timeline = buildConditionTimeline({
      condition,
      episodes: [
        {
          id: 'e1',
          conditionId: 'c1',
          episodeNumber: 1,
          status: 'ACTIVE',
          startedAt: new Date('2026-01-01'),
          resolvedAt: null,
          peakSeverity: 5,
          estimatedRecoveryDays: null,
          triggerHypothesis: null,
        },
      ],
      observations: [
        {
          id: 'o1',
          conditionId: 'c1',
          episodeId: 'e1',
          observedAt: new Date('2026-03-01'),
          context: 'MANUAL',
          source: 'ATHLETE',
          symptomPresent: true,
          severityReported: 3,
          functionalImpact: 'MILD',
          bodyRegion: 'Achille',
          side: 'RIGHT',
          type: 'PAIN',
          comment: null,
          activityId: null,
          plannedSessionId: null,
          trainingDayId: null,
          externalId: null,
          legacyPhysicalCheckinId: null,
        },
      ],
      functionalCapacities: [],
      knowledge: [],
    });

    expect(timeline.events[0].kind).toBe('CONDITION_STARTED');
    expect(timeline.events.at(-1)?.kind).toBe('OBSERVATION');
  });
});
