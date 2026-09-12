import { describe, expect, it } from 'vitest';
import {
  dueReassessments,
  isFollowedCondition,
  reassessmentDue,
  reassessmentQuestion,
  silenceThresholdDays,
  type ReassessmentNote,
} from './reassessment-due';

const NOW = new Date('2026-09-13T10:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

function note(overrides: Partial<ReassessmentNote> = {}): ReassessmentNote {
  return {
    id: 'note-1',
    title: 'Tendinite genou droit',
    category: 'PAIN',
    status: 'ACTIVE',
    severity: 5,
    resolvedAt: null,
    checkins: [{ createdAt: daysAgo(1) }],
    ...overrides,
  };
}

describe('isFollowedCondition', () => {
  it('follows active pain and injuries', () => {
    expect(isFollowedCondition(note())).toBe(true);
    expect(isFollowedCondition(note({ category: 'INJURY', status: 'MONITORING' }))).toBe(true);
  });

  it('leaves resolved or non-symptomatic entries alone', () => {
    expect(isFollowedCondition(note({ resolvedAt: daysAgo(2) }))).toBe(false);
    expect(isFollowedCondition(note({ status: 'RESOLVED' }))).toBe(false);
    expect(isFollowedCondition(note({ category: 'POSTURE' }))).toBe(false);
  });
});

describe('silenceThresholdDays', () => {
  it('asks sooner when it hurts more', () => {
    expect(silenceThresholdDays(8)).toBe(3);
    expect(silenceThresholdDays(4)).toBe(5);
    expect(silenceThresholdDays(1)).toBe(8);
    expect(silenceThresholdDays(null)).toBe(5);
  });
});

describe('reassessmentDue', () => {
  it('asks after a session the athlete actually did', () => {
    const due = reassessmentDue({
      note: note({ checkins: [{ createdAt: daysAgo(3) }] }),
      lastRealisedSessionAt: daysAgo(1),
      now: NOW,
    });

    expect(due).toMatchObject({ trigger: 'after_session', noteId: 'note-1' });
  });

  it('stops asking once the athlete answered since that session', () => {
    expect(
      reassessmentDue({
        note: note({ checkins: [{ createdAt: daysAgo(0) }] }),
        lastRealisedSessionAt: daysAgo(1),
        now: NOW,
      }),
    ).toBeNull();
  });

  it('asks again after too long a silence, even with no session', () => {
    const due = reassessmentDue({
      note: note({ severity: 7, checkins: [{ createdAt: daysAgo(4) }] }),
      lastRealisedSessionAt: null,
      now: NOW,
    });

    expect(due).toMatchObject({ trigger: 'silence', daysSinceLastObservation: 4 });
  });

  it('stays quiet while the silence is still acceptable', () => {
    expect(
      reassessmentDue({
        note: note({ severity: 2, checkins: [{ createdAt: daysAgo(4) }] }),
        lastRealisedSessionAt: null,
        now: NOW,
      }),
    ).toBeNull();
  });

  it('never asks about something that no longer constrains training', () => {
    expect(
      reassessmentDue({
        note: note({ status: 'RESOLVED', checkins: [] }),
        lastRealisedSessionAt: daysAgo(1),
        now: NOW,
      }),
    ).toBeNull();
  });
});

describe('dueReassessments', () => {
  it('puts the most severe first', () => {
    const notes = [
      note({ id: 'mild', severity: 2, checkins: [{ createdAt: daysAgo(30) }] }),
      note({ id: 'bad', severity: 8, checkins: [{ createdAt: daysAgo(30) }] }),
    ];

    expect(
      dueReassessments({ notes, lastRealisedSessionAt: null, now: NOW }).map((d) => d.noteId),
    ).toEqual(['bad', 'mild']);
  });
});

describe('reassessmentQuestion', () => {
  it('says why it is asking now', () => {
    expect(
      reassessmentQuestion({
        noteId: 'n',
        noteTitle: 'Genou droit',
        trigger: 'after_session',
        daysSinceLastObservation: 2,
        suggestedSeverity: 4,
      }),
    ).toBe('Comment va « Genou droit » après cette séance ?');

    expect(
      reassessmentQuestion({
        noteId: 'n',
        noteTitle: 'Genou droit',
        trigger: 'silence',
        daysSinceLastObservation: 6,
        suggestedSeverity: 4,
      }),
    ).toBe('Pas de nouvelles de « Genou droit » depuis 6 jours. Où en est-ce ?');
  });
});
