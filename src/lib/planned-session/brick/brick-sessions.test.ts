import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  groupPlannedSessions,
  resolveBrickSiblingActivityLinks,
} from './brick-sessions';

describe('resolveBrickSiblingActivityLinks', () => {
  it('returns other realized legs in brick order, excluding the current activity', () => {
    const links = resolveBrickSiblingActivityLinks(
      [
        {
          id: 'ps-bike',
          type: ActivityType.BIKE,
          title: 'Vélo',
          brickOrder: 0,
          activityId: 'act-bike',
          completed: true,
        },
        {
          id: 'ps-run',
          type: ActivityType.RUN,
          title: 'Course',
          brickOrder: 1,
          activityId: 'act-run',
          completed: true,
        },
        {
          id: 'ps-open',
          type: ActivityType.SWIM,
          title: null,
          brickOrder: 2,
          activityId: null,
          completed: false,
        },
      ],
      'act-bike',
    );

    expect(links).toEqual([
      {
        activityId: 'act-run',
        type: ActivityType.RUN,
        title: 'Course',
        brickOrder: 1,
      },
    ]);
  });

  it('returns an empty list when no sibling activity is linked yet', () => {
    expect(
      resolveBrickSiblingActivityLinks(
        [
          {
            id: 'ps-1',
            type: ActivityType.BIKE,
            title: 'Vélo',
            brickOrder: 0,
            activityId: 'act-1',
            completed: true,
          },
          {
            id: 'ps-2',
            type: ActivityType.RUN,
            title: 'Course',
            brickOrder: 1,
            activityId: null,
            completed: false,
          },
        ],
        'act-1',
      ),
    ).toEqual([]);
  });
});


describe('groupPlannedSessions demotion', () => {
  const bike = {
    id: 'bike',
    type: ActivityType.BIKE,
    title: 'Vélo',
    brickGroupId: 'brick-1',
    brickOrder: 0,
  } as never;
  const run = {
    id: 'run',
    type: ActivityType.RUN,
    title: 'Course',
    brickGroupId: 'brick-1',
    brickOrder: 1,
  } as never;

  it('keeps a two-leg chain as a brick', () => {
    const items = groupPlannedSessions([bike, run] as never);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'brick', id: 'brick-1' });
  });

  it('demotes a lone remaining leg to a simple session (no brick tag)', () => {
    const items = groupPlannedSessions([run] as never);
    expect(items).toEqual([{ kind: 'single', session: run }]);
  });
});
