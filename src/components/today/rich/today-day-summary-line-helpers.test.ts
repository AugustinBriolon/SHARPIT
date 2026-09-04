import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import { buildDaySummaryMeta, daySummaryOpenPlanned } from './today-day-summary-line-helpers';

describe('today-day-summary-line-helpers', () => {
  it('builds planned meta from secondary and morning choice', () => {
    const meta = buildDaySummaryMeta({
      id: 'p1',
      activityType: ActivityType.RUN,
      primary: 'Tempo',
      secondary: 'Endurance · 45 min',
      kind: 'planned',
      href: '/plan',
      isDone: false,
      morningChoiceLabel: 'Maintenu',
      metrics: null,
      brickLegs: null,
    });

    expect(meta).toEqual(['Endurance', '45 min', { text: 'Maintenu', tone: 'caution' }]);
  });

  it('opens planned sessions only', () => {
    const open: string[] = [];
    const planned = daySummaryOpenPlanned(
      {
        id: 'p1',
        activityType: ActivityType.BIKE,
        primary: 'Endurance',
        kind: 'planned',
        href: '#',
        isDone: false,
      },
      (id) => open.push(id),
    );
    planned?.();
    expect(open).toEqual(['p1']);

    const done = daySummaryOpenPlanned(
      {
        id: 'a1',
        activityType: ActivityType.RUN,
        primary: 'Footing',
        kind: 'done',
        href: '/training/a1',
        isDone: true,
        metrics: [{ label: 'Durée', value: '30:00', unit: 'min' }],
      },
      (id) => open.push(id),
    );
    expect(done).toBeUndefined();
  });
});
