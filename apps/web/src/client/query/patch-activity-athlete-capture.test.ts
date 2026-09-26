import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { ActivityType } from '@prisma/client';
import { queryKeys } from '@/client/query/keys';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import {
  patchActivityAthleteCaptureInPlannedSessions,
  resolveLinkedActivity,
} from '@/client/query/patch-activity-athlete-capture';

function activity(overrides: Partial<ClientActivity> = {}): ClientActivity {
  return {
    id: 'act-1',
    type: ActivityType.STRENGTH,
    title: 'Renfo',
    date: new Date('2026-09-14'),
    duration: 2700,
    feeling: null,
    rpe: null,
    notes: null,
    ...overrides,
  } as unknown as ClientActivity;
}

function session(overrides: Partial<ClientPlannedSession> = {}): ClientPlannedSession {
  return {
    id: 'ps-1',
    activityId: 'act-1',
    activity: activity({ feeling: null, rpe: null }),
    ...overrides,
  } as unknown as ClientPlannedSession;
}

describe('resolveLinkedActivity', () => {
  it('overlays live feeling/rpe from the activities list onto nested activity', () => {
    const linked = resolveLinkedActivity({
      nested: activity({
        feeling: null,
        rpe: null,
        notes: 'old',
      }) as ClientPlannedSession['activity'],
      activityId: 'act-1',
      activities: [activity({ feeling: 'Bien', rpe: 6, notes: 'new' })],
    });

    expect(linked?.feeling).toBe('Bien');
    expect(linked?.rpe).toBe(6);
    expect(linked?.notes).toBe('new');
  });

  it('falls back to nested when the activities list has not loaded', () => {
    const nested = activity({ feeling: 'Ok', rpe: 5 }) as ClientPlannedSession['activity'];
    expect(
      resolveLinkedActivity({ nested, activityId: 'act-1', activities: undefined })?.feeling,
    ).toBe('Ok');
  });
});

describe('patchActivityAthleteCaptureInPlannedSessions', () => {
  it('updates nested planned-session activity feeling and rpe', () => {
    const client = new QueryClient();
    client.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, [session()]);

    patchActivityAthleteCaptureInPlannedSessions(client, 'act-1', {
      feeling: 'Difficile',
      rpe: 8,
    });

    const next = client.getQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions)?.[0];
    expect(next?.activity?.feeling).toBe('Difficile');
    expect(next?.activity?.rpe).toBe(8);
  });
});
