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
      narrativeHref: '/activite/a1',
      freshnessLine: 'Twin à jour — ta séance est intégrée.',
    });
  });

  it('still prompts for ressenti when RPE is known but feeling is missing', () => {
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
    expect(loop).toMatchObject({
      visible: true,
      activityId: 'a2',
      activityTitle: 'Vélo',
      needsFeeling: true,
      freshnessLine: null,
    });
  });

  it('stays hidden when ressenti is complete and twin is not fresh', () => {
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
          feeling: 'Solide',
        },
      ],
    });
    expect(loop).toBeNull();
  });

  it('prefers the substantive session over a demo link orphan on the same day', () => {
    const loop = buildPostSessionLoop({
      phase: 'SESSION_COMPLETED',
      overallFresh: true,
      day: DAY,
      activities: [
        {
          id: 'main',
          title: 'Sortie longue — Bois de Boulogne',
          typeLabel: 'Course',
          date: '2026-08-25T09:00:00',
          rpe: 6,
          feeling: 'Solide',
        },
        {
          id: 'demo',
          title: 'Footing récup — démo liaison (réalisé)',
          typeLabel: 'Course',
          date: '2026-08-25T18:00:00',
          rpe: 4,
          feeling: 'Facile',
        },
      ],
    });
    expect(loop?.activityId).toBe('main');
    expect(loop?.activityTitle).toBe('Sortie longue — Bois de Boulogne');
  });

  it('skips activities awaiting a link decision', () => {
    const loop = buildPostSessionLoop({
      phase: 'SESSION_COMPLETED',
      overallFresh: true,
      day: DAY,
      excludeActivityIds: new Set(['pending']),
      activities: [
        {
          id: 'pending',
          title: 'Footing club',
          typeLabel: 'Course',
          date: '2026-08-25T18:00:00',
          rpe: 4,
          feeling: null,
        },
        {
          id: 'main',
          title: 'Sortie longue',
          typeLabel: 'Course',
          date: '2026-08-25T09:00:00',
          rpe: 6,
          feeling: 'Solide',
        },
      ],
    });
    expect(loop?.activityId).toBe('main');
  });
});
