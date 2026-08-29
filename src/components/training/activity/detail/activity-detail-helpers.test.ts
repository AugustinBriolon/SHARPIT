import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';

import { formatActivityDetailLoad, formatActivityDetailMeta } from './activity-detail-helpers';

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

  it('formats the load as charge on the essential reading', () => {
    expect(formatActivityDetailLoad({ load: 32.4 }, 'essential')).toBe('charge 32');
  });

  it('formats the load as TSS on the expert reading', () => {
    expect(formatActivityDetailLoad({ load: 32.4 }, 'expert')).toBe('32 TSS');
  });

  it('defaults to essential when mode is omitted', () => {
    expect(formatActivityDetailLoad({ load: 32.4 })).toBe('charge 32');
  });

  it('returns null when load is missing', () => {
    expect(formatActivityDetailLoad({ load: null })).toBeNull();
  });
});
