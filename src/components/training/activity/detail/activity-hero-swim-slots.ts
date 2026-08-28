import { formatDistance, formatDuration, formatSwimPace } from '@/lib/format';
import type { HeroActivity } from '@/components/training/activity/detail/activity-hero-stats';
import type { HeroStatSlot } from '@/components/training/activity/detail/activity-hero-run-slots';

type StreamStats = {
  avgHr: number | null;
};

function swimDistanceSlot(m: HeroActivity['swimMetrics']): HeroStatSlot {
  const distanceM = m?.distanceM ?? null;
  return {
    label: 'Distance',
    value: distanceM !== null ? formatDistance(distanceM) : null,
  };
}

function swimDurationSlot(activity: HeroActivity): HeroStatSlot {
  const duration = activity.duration ?? null;
  return {
    label: 'Temps',
    value: duration !== null ? formatDuration(duration) : null,
  };
}

function swimPaceSlot(m: HeroActivity['swimMetrics']): HeroStatSlot {
  const avgPaceSecPer100m = m?.avgPaceSecPer100m ?? null;
  return {
    label: 'Allure moy.',
    value: avgPaceSecPer100m !== null ? formatSwimPace(avgPaceSecPer100m) : null,
  };
}

function swimHrSlot(stream: StreamStats | null): HeroStatSlot {
  const avgHr = stream?.avgHr ?? null;
  return {
    label: 'FC moy.',
    value: avgHr !== null ? `${avgHr} bpm` : null,
    needsStream: true,
  };
}

export function buildSwimHeroSlots(
  activity: HeroActivity,
  stream: StreamStats | null,
): HeroStatSlot[] {
  const m = activity.swimMetrics;
  return [swimDistanceSlot(m), swimDurationSlot(activity), swimPaceSlot(m), swimHrSlot(stream)];
}
