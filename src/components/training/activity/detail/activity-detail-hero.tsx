import { ActivityHeroStats } from '@/components/training/activity/activity-hero-stats';
import { TriathlonHeroCards } from '@/components/training/activity/triathlon-hero-cards';
import type { MultisportLeg } from '@/lib/multisport';
import { toHeroActivity } from './activity-detail-helpers';
import type { ActivityDetail, ActivityStat } from './types';

function HeroStat({ label, value }: ActivityStat) {
  return (
    <div className="chip-surface rounded-2xl px-5 py-4">
      <p className="text-label">{label}</p>
      <p className="text-data text-foreground mt-1.5 text-3xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {strengthStats.map((stat) => (
          <HeroStat key={stat.label} {...stat} />
        ))}
      </div>
    );
  }

  if (isTriathlon && multisportLegs) {
    return <TriathlonHeroCards legs={multisportLegs} />;
  }

  return <ActivityHeroStats activity={toHeroActivity(activity)} activityId={activity.id} />;
}
