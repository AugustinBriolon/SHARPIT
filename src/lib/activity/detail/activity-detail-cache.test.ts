import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import {
  clientActivityToDetailShell,
  clientActivityToHeaderActivity,
} from '@/lib/activity/detail/activity-detail-cache';
import type { ClientActivity } from '@/lib/query/types';

function sampleActivity(partial: Partial<ClientActivity> & { id: string }): ClientActivity {
  return {
    type: ActivityType.RUN,
    date: new Date('2026-08-20'),
    title: 'Sortie footing',
    duration: 3600,
    load: 85,
    rpe: 6,
    feeling: 'Bien',
    weather: null,
    notes: null,
    source: 'garmin',
    stravaId: null,
    garminId: 'g1',
    createdAt: new Date(),
    updatedAt: new Date(),
    runMetrics: { distanceM: 10000 },
    bikeMetrics: null,
    swimMetrics: null,
    hikeMetrics: null,
    strengthSets: [],
    plannedSession: null,
    hikeTripId: null,
    ...partial,
  } as ClientActivity;
}

describe('activity-detail-cache', () => {
  it('maps list cache row to header activity without hikeTrip relation', () => {
    const cached = sampleActivity({ id: 'a1' });
    const header = clientActivityToHeaderActivity(cached);
    expect(header.id).toBe('a1');
    expect(header.title).toBe('Sortie footing');
    expect(header.hikeTrip).toBeNull();
  });

  it('maps list cache row to detail shell for meta/hero', () => {
    const cached = sampleActivity({ id: 'a2', feeling: 'Correct' });
    const shell = clientActivityToDetailShell(cached);
    expect(shell.feeling).toBe('Correct');
    expect(shell.type).toBe(ActivityType.RUN);
  });
});
