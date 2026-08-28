import { formatDistance, formatDuration } from '@/lib/format';
import type { HeroActivity } from '@/components/training/activity/detail/activity-hero-stats';
import type { HeroStatSlot } from '@/components/training/activity/detail/activity-hero-run-slots';

type StreamStats = {
  avgHr: number | null;
  totalDistance: number | null;
  totalAscent: number | null;
};

function hikeDistanceSlot(
  m: HeroActivity['hikeMetrics'],
  stream: StreamStats | null,
): HeroStatSlot {
  const distance = m?.distanceM ?? stream?.totalDistance ?? null;
  return {
    label: 'Distance',
    value: distance !== null ? formatDistance(distance) : null,
    needsStream: m?.distanceM === null,
  };
}

function hikeElevationSlot(
  m: HeroActivity['hikeMetrics'],
  stream: StreamStats | null,
): HeroStatSlot {
  const elevation = m?.elevationM ?? stream?.totalAscent ?? null;
  return {
    label: 'Dénivelé',
    value: elevation !== null ? `${Math.round(elevation)} m` : null,
    needsStream: m?.elevationM === null,
  };
}

function hikeDurationSlot(activity: HeroActivity): HeroStatSlot {
  return {
    label: 'Temps',
    value: activity.duration !== null ? formatDuration(activity.duration) : null,
  };
}

function hikeHrSlot(m: HeroActivity['hikeMetrics'], stream: StreamStats | null): HeroStatSlot {
  const avgHr = m?.avgHr ?? stream?.avgHr ?? null;
  return {
    label: 'FC moy.',
    value: avgHr !== null ? `${avgHr} bpm` : null,
    needsStream: m?.avgHr === null,
  };
}

export function buildHikeHeroSlots(
  activity: HeroActivity,
  stream: StreamStats | null,
): HeroStatSlot[] {
  const m = activity.hikeMetrics;
  return [
    hikeDistanceSlot(m, stream),
    hikeElevationSlot(m, stream),
    hikeDurationSlot(activity),
    hikeHrSlot(m, stream),
  ];
}
