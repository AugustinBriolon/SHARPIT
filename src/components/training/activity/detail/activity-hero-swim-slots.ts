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
  const duration = activity.duration !== null ? formatDuration(activity.duration) : null;
  const m = activity.swimMetrics;
  return [
    {
      label: 'Distance',
      value: m?.distanceM !== null ? formatDistance(m.distanceM) : null,
    },
    { label: 'Temps', value: duration },
    {
      label: 'Allure moy.',
      value: m?.avgPaceSecPer100m !== null ? formatSwimPace(m.avgPaceSecPer100m) : null,
    },
    {
      label: 'FC moy.',
      value: stream?.avgHr !== null ? `${stream.avgHr} bpm` : null,
      needsStream: true,
    },
  ];
}
