import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import { mapGarminType } from '@/lib/integrations/garmin-activities';

describe('mapGarminType', () => {
  it.each([
    ['triathlon', ActivityType.TRIATHLON],
    ['duathlon', ActivityType.TRIATHLON],
    ['multisport', ActivityType.TRIATHLON],
    ['multi_sport', ActivityType.TRIATHLON],
    ['running', ActivityType.RUN],
    ['cycling', ActivityType.BIKE],
    ['lap_swimming', ActivityType.SWIM],
    ['strength_training', ActivityType.STRENGTH],
  ])('%s -> %s', (typeKey, expected) => {
    expect(mapGarminType(typeKey)).toBe(expected);
  });

  it('falls back to OTHER for supported-but-unmodeled Garmin sports', () => {
    expect(mapGarminType('kayaking')).toBe(ActivityType.OTHER);
    expect(mapGarminType('padel')).toBe(ActivityType.OTHER);
  });
});
