import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';

import type { ClientPlannedSession } from '@/lib/query/types';
import {
  resolveTodaysPlannedItems,
  resolveTodaysPlannedSessions,
} from '@/components/training/hub/training-next-session';

function stubPlanned(id: string, date: string, completed = false): ClientPlannedSession {
  return {
    id,
    date: new Date(date),
    type: ActivityType.RUN,
    completed,
  } as ClientPlannedSession;
}

describe('resolveTodaysPlannedSessions', () => {
  it('returns every open session on the local day, soonest first', () => {
    const now = new Date('2026-09-07T10:00:00');
    const todays = resolveTodaysPlannedSessions(
      [
        stubPlanned('past', '2026-09-06T18:00:00'),
        stubPlanned('done', '2026-09-07T07:00:00', true),
        { ...stubPlanned('second', '2026-09-07T00:00:00'), startTime: '17:00' },
        { ...stubPlanned('first', '2026-09-07T00:00:00'), startTime: '08:00' },
        stubPlanned('tomorrow', '2026-09-08T08:00:00'),
      ],
      now,
    );
    expect(todays.map((session) => session.id)).toEqual(['first', 'second']);
  });

  it('orders same calendar day by startTime, soonest first', () => {
    const now = new Date('2026-09-07T10:00:00');
    const day = '2026-09-07T00:00:00';
    const todays = resolveTodaysPlannedSessions(
      [
        { ...stubPlanned('evening', day), startTime: '18:00' },
        { ...stubPlanned('morning', day), startTime: '07:30' },
      ],
      now,
    );
    expect(todays.map((session) => session.id)).toEqual(['morning', 'evening']);
  });

  it('groups same-day brick legs into one preview item', () => {
    const now = new Date('2026-09-07T10:00:00');
    const day = '2026-09-07T00:00:00';
    const items = resolveTodaysPlannedItems(
      [
        {
          ...stubPlanned('bike', day),
          type: ActivityType.BIKE,
          brickGroupId: 'brick-1',
          brickOrder: 0,
          startTime: '08:00',
        },
        {
          ...stubPlanned('run', day),
          type: ActivityType.RUN,
          brickGroupId: 'brick-1',
          brickOrder: 1,
          startTime: '09:30',
        },
        { ...stubPlanned('solo', day), startTime: '18:00' },
      ],
      now,
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: 'brick', id: 'brick-1' });
    expect(items[1]).toMatchObject({ kind: 'single', session: { id: 'solo' } });
  });
});
