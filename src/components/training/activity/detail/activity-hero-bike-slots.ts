import { formatDistance, formatDuration } from '@/lib/format';
import type { HeroActivity } from '@/components/training/activity/detail/activity-hero-stats';
import type { HeroStatSlot } from '@/components/training/activity/detail/activity-hero-run-slots';

type StreamStats = {
  avgSpeed: number | null;
  totalDistance: number | null;
  totalAscent: number | null;
};

function formatSpeed(metersPerSec: number | null): string | null {
  if (metersPerSec === null) {
    return null;
  }
  return `${(metersPerSec * 3.6).toFixed(1)} km/h`;
}

function bikeDistanceSlot(stream: StreamStats | null): HeroStatSlot {
  return {
    label: 'Distance',
    value: stream?.totalDistance !== null ? formatDistance(stream.totalDistance) : null,
    needsStream: true,
  };
}

function bikeDurationSlot(activity: HeroActivity): HeroStatSlot {
  return {
    label: 'Temps',
    value: activity.duration !== null ? formatDuration(activity.duration) : null,
  };
}

function bikeSpeedSlot(stream: StreamStats | null): HeroStatSlot {
  return {
    label: 'Vitesse moy.',
    value: formatSpeed(stream?.avgSpeed ?? null),
    needsStream: true,
  };
}

function bikeElevationSlot(activity: HeroActivity, stream: StreamStats | null): HeroStatSlot {
  const elevation = activity.bikeMetrics?.elevationM ?? stream?.totalAscent;
  return {
    label: 'Dénivelé',
    value: elevation !== null ? `${Math.round(elevation)} m` : null,
    needsStream: activity.bikeMetrics?.elevationM === null,
  };
}

export function buildBikeHeroSlots(
  activity: HeroActivity,
  stream: StreamStats | null,
): HeroStatSlot[] {
  return [
    bikeDistanceSlot(stream),
    bikeDurationSlot(activity),
    bikeSpeedSlot(stream),
    bikeElevationSlot(activity, stream),
  ];
}
