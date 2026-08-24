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

  it('formats stats as duration · charge · RPE on the essential reading', () => {
    expect(
      formatActivityDetailStats(
        {
          duration: 2712,
          load: 32.4,
          rpe: 3,
        },
        'essential',
      ),
    ).toBe('45 min · charge 32 · RPE 3');
  });

  it('formats stats as duration · TSS · RPE on the expert reading', () => {
    expect(
      formatActivityDetailStats(
        {
          duration: 2712,
          load: 32.4,
          rpe: 3,
        },
        'expert',
      ),
    ).toBe('45 min · 32 TSS · RPE 3');
  });

  it('defaults to essential when mode is omitted', () => {
    expect(
      formatActivityDetailStats({
        duration: 2712,
        load: 32.4,
        rpe: 3,
      }),
    ).toBe('45 min · charge 32 · RPE 3');
  });

  it('omits load and RPE when missing', () => {
    expect(
      formatActivityDetailStats({
        duration: 1800,
        load: null,
        rpe: null,
      }),
    ).toBe('30 min');
  });
});
