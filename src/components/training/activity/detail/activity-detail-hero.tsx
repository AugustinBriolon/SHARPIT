import { ActivityHeroStats } from './activity-hero-stats';
import { TriathlonHeroCards } from './triathlon-hero-cards';
import { WeightedInstruments } from '@/components/training/activity/reading/weighted-instruments';
import type { MultisportLeg } from '@/lib/multisport';
import { toHeroActivity } from './activity-detail-helpers';
import type { ActivityDetail, ActivityStat } from './types';

export function ActivityDetailHero({
  activity,
  isStrength,
  isTriathlon,
  strengthStats,
  multisportLegs,
}: {
  activity: ActivityDetail;
  isStrength: boolean;
  isTriathlon: boolean;
  strengthStats: ActivityStat[];
  multisportLegs: MultisportLeg[] | null;
}) {
  if (isStrength && strengthStats.length > 0) {
    return (
      <WeightedInstruments
        items={strengthStats.map((stat) => ({ label: stat.label, value: stat.value }))}
        primaryCount={Math.min(3, strengthStats.length)}
      />
    );
  }

  if (isTriathlon && multisportLegs) {
    return <TriathlonHeroCards legs={multisportLegs} />;
  }

  return <ActivityHeroStats activity={toHeroActivity(activity)} activityId={activity.id} />;
}
