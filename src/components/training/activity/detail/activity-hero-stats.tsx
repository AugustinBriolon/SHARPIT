'use client';

import { ActivityType } from '@prisma/client';
import { InstrumentMetricGrid } from '@/components/ui/instruments/instrument-metric-chip';
import { useActivityStream } from '@/hooks/use-data';
import { buildHeroStatSlots } from '@/components/training/activity/detail/activity-hero-stats-helpers';

export interface HeroActivity {
  type: ActivityType;
  duration: number | null;
  runMetrics: {
    distanceM: number | null;
    paceSecPerKm: number | null;
    avgHr: number | null;
    cadence: number | null;
  } | null;
  bikeMetrics: {
    elevationM: number | null;
  } | null;
  swimMetrics: {
    distanceM: number | null;
    avgPaceSecPer100m: number | null;
  } | null;
  hikeMetrics: {
    distanceM: number | null;
    elevationM: number | null;
    avgHr: number | null;
  } | null;
}

export function ActivityHeroStats({
  activityId,
  activity,
}: {
  activityId: string;
  activity: HeroActivity;
}) {
  const { data, isPending } = useActivityStream(activityId);
  const slots = buildHeroStatSlots(activity, data?.stats ?? null);

  const items = slots.filter((slot) => slot.value !== null || (slot.needsStream && isPending));

  if (items.length === 0) {
    return null;
  }

  return (
    <InstrumentMetricGrid
      items={items.map(({ label, value }) => ({ label, value }))}
      loading={isPending && items.some((slot) => slot.value === null)}
    />
  );
}
