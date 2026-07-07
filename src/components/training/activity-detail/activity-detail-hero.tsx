import { ActivityHeroStats } from '@/components/training/activity-hero-stats';
import { TriathlonHeroCards } from '@/components/training/triathlon-hero-cards';
import type { MultisportLeg } from '@/lib/multisport';
import { toHeroActivity } from './activity-detail-helpers';
import type { ActivityDetail, ActivityStat } from './types';

function HeroStat({ label, value }: ActivityStat) {
  return (
    <div className="border-border bg-card rounded-2xl border px-5 py-4">
      <p className="text-muted-foreground text-[11px] font-medium uppercase">{label}</p>
      <p className="text-foreground mt-1.5 font-mono text-3xl font-semibold tabular-nums">
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
