import { formatDistance, formatDuration, formatSwimPace } from '@/lib/format';
import type { HeroActivity } from '@/components/training/activity/detail/activity-hero-stats';
import type { HeroStatSlot } from '@/components/training/activity/detail/activity-hero-run-slots';

type StreamStats = {
  avgHr: number | null;
};

export function buildSwimHeroSlots(
  activity: HeroActivity,
  stream: StreamStats | null,
): HeroStatSlot[] {
  const duration = activity.duration ?? null;
  const m = activity.swimMetrics;
  const distanceM = m?.distanceM ?? null;
  const avgPaceSecPer100m = m?.avgPaceSecPer100m ?? null;
  const avgHr = stream?.avgHr ?? null;
  return [
    {
      label: 'Distance',
      value: distanceM !== null ? formatDistance(distanceM) : null,
    },
    { label: 'Temps', value: duration !== null ? formatDuration(duration) : null },
    {
      label: 'Allure moy.',
      value: avgPaceSecPer100m !== null ? formatSwimPace(avgPaceSecPer100m) : null,
    },
    {
      label: 'FC moy.',
      value: avgHr !== null ? `${avgHr} bpm` : null,
      needsStream: true,
    },
  ];
}
