import { ActivityHeroStats } from '@/components/training/activity/activity-hero-stats';
import { TriathlonHeroCards } from '@/components/training/activity/triathlon-hero-cards';
import {
  InstrumentMetricChip,
  InstrumentMetricGridShell,
} from '@/components/ui/instrument-metric-chip';
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
      <InstrumentMetricGridShell count={strengthStats.length}>
        {strengthStats.map((stat) => (
          <InstrumentMetricChip key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </InstrumentMetricGridShell>
    );
  }

  if (isTriathlon && multisportLegs) {
    return <TriathlonHeroCards legs={multisportLegs} />;
  }

  return <ActivityHeroStats activity={toHeroActivity(activity)} activityId={activity.id} />;
}
