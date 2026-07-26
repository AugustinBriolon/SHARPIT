import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';

import { formatActivityDetailMeta, formatActivityDetailStats } from './activity-detail-helpers';

describe('activity detail header helpers', () => {
  it('formats meta as type · date · SOURCE', () => {
    const meta = formatActivityDetailMeta({
      type: ActivityType.RUN,
      date: new Date('2026-07-24T08:00:00Z'),
      source: 'garmin',
      garminId: 'g-1',
    });
    expect(meta).toMatch(/^Course · /);
    expect(meta).toContain('GARMIN');
  });

  it('formats stats as duration · TSS · RPE when present', () => {
    expect(
      formatActivityDetailStats({
        duration: 2712,
        load: 32.4,
        rpe: 3,
      }),
    ).toBe('45 min · 32 TSS · RPE 3');
  });

  it('omits TSS and RPE when missing', () => {
    expect(
      formatActivityDetailStats({
        duration: 1800,
        load: null,
        rpe: null,
      }),
    ).toBe('30 min');
  });
});
