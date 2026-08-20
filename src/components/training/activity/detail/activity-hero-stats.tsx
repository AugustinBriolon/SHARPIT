'use client';

import { ActivityType } from '@prisma/client';
import {
  InstrumentMetricGrid,
  type InstrumentMetricItem,
} from '@/components/ui/instruments/instrument-metric-chip';
import { useActivityStream } from '@/hooks/use-data';
import { formatDistance, formatDuration, formatPace, formatSwimPace } from '@/lib/format';

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

type StreamStats = {
  avgHr: number | null;
  avgSpeed: number | null;
  totalDistance: number | null;
  totalAscent: number | null;
};

type Slot = InstrumentMetricItem & {
  needsStream?: boolean;
};

function formatSpeed(metersPerSec: number | null): string | null {
  if (metersPerSec == null) return null;
  return `${(metersPerSec * 3.6).toFixed(1)} km/h`;
}

function buildSlots(activity: HeroActivity, stream: StreamStats | null): Slot[] {
  const duration = activity.duration != null ? formatDuration(activity.duration) : null;

  switch (activity.type) {
    case ActivityType.RUN: {
      const m = activity.runMetrics;
      const avgHr = m?.avgHr ?? stream?.avgHr ?? null;
      return [
        {
          label: 'Distance',
          value: m?.distanceM != null ? formatDistance(m.distanceM) : null,
        },
        {
          label: 'Allure',
          value: m?.paceSecPerKm != null ? formatPace(m.paceSecPerKm) : null,
        },
        {
          label: 'FC moy.',
          value: avgHr != null ? `${avgHr} bpm` : null,
          needsStream: m?.avgHr == null,
        },
        {
          label: 'Cadence',
          value: m?.cadence != null ? `${m.cadence} spm` : null,
        },
      ];
    }

    case ActivityType.BIKE: {
      const elevation = activity.bikeMetrics?.elevationM ?? stream?.totalAscent;
      return [
        {
          label: 'Distance',
          value: stream?.totalDistance != null ? formatDistance(stream.totalDistance) : null,
          needsStream: true,
        },
        { label: 'Temps', value: duration },
        {
          label: 'Vitesse moy.',
          value: formatSpeed(stream?.avgSpeed ?? null),
          needsStream: true,
        },
        {
          label: 'Dénivelé',
          value: elevation != null ? `${Math.round(elevation)} m` : null,
          needsStream: activity.bikeMetrics?.elevationM == null,
        },
      ];
    }

    case ActivityType.SWIM: {
      const m = activity.swimMetrics;
      return [
        {
          label: 'Distance',
          value: m?.distanceM != null ? formatDistance(m.distanceM) : null,
        },
        { label: 'Temps', value: duration },
        {
          label: 'Allure moy.',
          value: m?.avgPaceSecPer100m != null ? formatSwimPace(m.avgPaceSecPer100m) : null,
        },
        {
          label: 'FC moy.',
          value: stream?.avgHr != null ? `${stream.avgHr} bpm` : null,
          needsStream: true,
        },
      ];
    }

    case ActivityType.HIKE: {
      const m = activity.hikeMetrics;
      const elevation = m?.elevationM ?? stream?.totalAscent ?? null;
      const distance = m?.distanceM ?? stream?.totalDistance ?? null;
      const avgHr = m?.avgHr ?? stream?.avgHr ?? null;
      return [
        {
          label: 'Distance',
          value: distance != null ? formatDistance(distance) : null,
          needsStream: m?.distanceM == null,
        },
        {
          label: 'Dénivelé',
          value: elevation != null ? `${Math.round(elevation)} m` : null,
          needsStream: m?.elevationM == null,
        },
        { label: 'Temps', value: duration },
        {
          label: 'FC moy.',
          value: avgHr != null ? `${avgHr} bpm` : null,
          needsStream: m?.avgHr == null,
        },
      ];
    }

    default:
      return [];
  }
}

export function ActivityHeroStats({
  activityId,
  activity,
}: {
  activityId: string;
  activity: HeroActivity;
}) {
  const { data, isPending } = useActivityStream(activityId);
  const slots = buildSlots(activity, data?.stats ?? null);

  const items = slots.filter((slot) => slot.value != null || (slot.needsStream && isPending));

  if (items.length === 0) return null;

  return (
    <InstrumentMetricGrid
      items={items.map(({ label, value }) => ({ label, value }))}
      loading={isPending && items.some((slot) => slot.value == null)}
    />
  );
}
