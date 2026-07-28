import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import {
  activityDetailExpectsMap,
  isOpenWaterSwimSession,
  resolveActivityDetailSkeletonLayout,
} from './activity-detail-skeleton-layout';

describe('resolveActivityDetailSkeletonLayout', () => {
  it('uses strength layout for musculation', () => {
    expect(
      resolveActivityDetailSkeletonLayout({ type: ActivityType.STRENGTH, title: 'Full body' }),
    ).toBe('strength');
  });

  it('uses map layout for outdoor run / bike', () => {
    expect(
      resolveActivityDetailSkeletonLayout({ type: ActivityType.RUN, title: 'Footing parc' }),
    ).toBe('map');
    expect(
      resolveActivityDetailSkeletonLayout({ type: ActivityType.BIKE, title: 'Sortie côtes' }),
    ).toBe('map');
  });

  it('drops the map for indoor run but keeps it for bike loading', () => {
    expect(
      resolveActivityDetailSkeletonLayout({ type: ActivityType.RUN, title: 'Tapis endurance' }),
    ).toBe('no-map');
    expect(
      resolveActivityDetailSkeletonLayout({ type: ActivityType.BIKE, title: 'Zwift Endurance' }),
    ).toBe('map');
  });

  it('defaults swim to no-map (pool) unless open-water hints', () => {
    expect(
      resolveActivityDetailSkeletonLayout({ type: ActivityType.SWIM, title: 'Séance technique' }),
    ).toBe('no-map');
    expect(
      resolveActivityDetailSkeletonLayout({ type: ActivityType.SWIM, title: 'Piscine 3k' }),
    ).toBe('no-map');
    expect(
      resolveActivityDetailSkeletonLayout({
        type: ActivityType.SWIM,
        title: 'Open water Lac',
      }),
    ).toBe('map');
  });
});

describe('isOpenWaterSwimSession', () => {
  it('detects eau libre and ignores pool titles', () => {
    expect(isOpenWaterSwimSession({ type: ActivityType.SWIM, title: 'Eau libre' })).toBe(true);
    expect(isOpenWaterSwimSession({ type: ActivityType.SWIM, title: 'Piscine 50m' })).toBe(false);
  });
});

describe('activityDetailExpectsMap', () => {
  it('is true only for map layouts', () => {
    expect(activityDetailExpectsMap({ type: ActivityType.RUN, title: 'Tempo' })).toBe(true);
    expect(activityDetailExpectsMap({ type: ActivityType.BIKE, title: 'Zwift Endurance' })).toBe(
      true,
    );
    expect(activityDetailExpectsMap({ type: ActivityType.SWIM, title: null })).toBe(false);
    expect(activityDetailExpectsMap({ type: ActivityType.STRENGTH, title: null })).toBe(false);
  });
});
