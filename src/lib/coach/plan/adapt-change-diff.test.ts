import { ActivityType, SessionIntensity } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { buildAdaptChangeDiff } from '@/lib/coach/plan/adapt-change-diff';
import type { AdaptChange } from '@/hooks/use-coach';
import type { ClientPlannedSession } from '@/lib/query/types';

function session(overrides: Partial<ClientPlannedSession> = {}): ClientPlannedSession {
  return {
    id: 'ps1',
    date: new Date('2026-08-27T09:00:00'),
    type: ActivityType.RUN,
    title: 'Seuil piste',
    intensity: SessionIntensity.THRESHOLD,
    durationMin: 60,
    ...overrides,
  } as ClientPlannedSession;
}

function change(overrides: Partial<AdaptChange>): AdaptChange {
  return {
    action: 'MODIFY',
    sessionId: 'ps1',
    date: '2026-08-28',
    type: ActivityType.RUN,
    title: 'Endurance',
    intensity: SessionIntensity.ENDURANCE,
    durationMin: 45,
    description: null,
    reason: 'Alléger',
    strengthPrescription: null,
    load: null,
    decisionId: null,
    ...overrides,
  };
}

describe('buildAdaptChangeDiff', () => {
  it('builds before→after for MODIFY with date shift', () => {
    const diff = buildAdaptChangeDiff(change({}), session());
    expect(diff.action).toBe('MODIFY');
    expect(diff.before?.title).toContain('Seuil');
    expect(diff.after?.title).toContain('Endurance');
    expect(diff.dateShifted).toBe(true);
  });

  it('exposes remove as before-only', () => {
    const diff = buildAdaptChangeDiff(
      change({ action: 'REMOVE', date: null, title: null, intensity: null }),
      session(),
    );
    expect(diff.after).toBeNull();
    expect(diff.before?.title).toContain('Seuil');
  });

  it('exposes add as after-only', () => {
    const diff = buildAdaptChangeDiff(
      change({ action: 'ADD', sessionId: null, date: '2026-08-30' }),
      null,
    );
    expect(diff.before).toBeNull();
    expect(diff.after?.dateLabel).toBeTruthy();
  });
});
