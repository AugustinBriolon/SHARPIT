import { describe, expect, it } from 'vitest';
import { buildPostSessionLoop } from '@/lib/today/post-session-loop';

const DAY = new Date('2026-08-25T12:00:00');

describe('buildPostSessionLoop', () => {
  it('returns null outside post-training phases', () => {
    expect(
      buildPostSessionLoop({
        phase: 'MORNING',
        overallFresh: true,
        day: DAY,
        activities: [
          {
            id: 'a1',
            title: 'Tempo',
            typeLabel: 'Course',
            date: '2026-08-25T09:00:00',
            rpe: null,
            feeling: null,
          },
        ],
      }),
    ).toBeNull();
  });

  it('surfaces ressenti CTA and narrative link after a session', () => {
    const loop = buildPostSessionLoop({
      phase: 'SESSION_COMPLETED',
      overallFresh: true,
      day: DAY,
      activities: [
        {
          id: 'a1',
          title: 'Tempo',
          typeLabel: 'Course',
          date: '2026-08-25T09:00:00',
          rpe: null,
          feeling: null,
        },
      ],
    });
    expect(loop).toMatchObject({
      visible: true,
      activityId: 'a1',
      activityTitle: 'Tempo',
      needsFeeling: true,
      narrativeHref: '/training/a1',
      freshnessLine: 'Twin à jour — ta séance est intégrée.',
    });
  });

  it('skips ressenti when RPE or feeling already set', () => {
    const loop = buildPostSessionLoop({
      phase: 'RECOVERY_WINDOW',
      overallFresh: false,
      day: DAY,
      activities: [
        {
          id: 'a2',
          title: null,
          typeLabel: 'Vélo',
          date: '2026-08-25T10:00:00',
          rpe: 6,
          feeling: null,
        },
      ],
    });
    expect(loop?.needsFeeling).toBe(false);
    expect(loop?.freshnessLine).toBeNull();
  });
});
