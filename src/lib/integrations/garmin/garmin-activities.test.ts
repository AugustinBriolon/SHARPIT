import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import type { IActivity } from '@flow-js/garmin-connect/dist/garmin/types/activity';
import {
  garminTrainingStressScore,
  mapGarminType,
} from '@/lib/integrations/garmin/garmin-activities';

describe('garminTrainingStressScore', () => {
  const activity = (fields: Partial<IActivity>) => fields as IActivity;

  it('reads the Training Stress Score when Garmin provides one', () => {
    expect(garminTrainingStressScore(activity({ trainingStressScore: 65 }))).toBe(65);
  });

  it('never substitutes the EPOC training load', () => {
    // trainingStressScore is Coggan TSS (100 = one hour at threshold);
    // activityTrainingLoad is EPOC-derived and ran ~3x that scale on real data,
    // which is what made cross-sport load comparison meaningless.
    expect(
      garminTrainingStressScore(
        activity({ trainingStressScore: null, activityTrainingLoad: 210 } as Partial<IActivity>),
      ),
    ).toBeNull();
  });

  it('rejects non-positive and non-numeric values', () => {
    expect(garminTrainingStressScore(activity({ trainingStressScore: 0 }))).toBeNull();
    expect(garminTrainingStressScore(activity({}))).toBeNull();
  });
});

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

  it.each([
    ['hiking', ActivityType.HIKE],
    ['walking', ActivityType.HIKE],
    ['mountaineering', ActivityType.HIKE],
    ['hike', ActivityType.HIKE],
  ])('%s -> HIKE', (typeKey, expected) => {
    expect(mapGarminType(typeKey)).toBe(expected);
  });

  it('keeps trail_running as RUN', () => {
    expect(mapGarminType('trail_running')).toBe(ActivityType.RUN);
  });
});
