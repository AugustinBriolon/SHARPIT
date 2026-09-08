import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { resolveBrickSiblingActivityLinks } from './brick-sessions';

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
