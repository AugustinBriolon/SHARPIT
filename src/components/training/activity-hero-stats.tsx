"use client";

import { ActivityType } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityStream } from "@/hooks/use-data";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSwimPace,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Accent = "cyan" | "orange" | "violet" | "emerald" | "default";

const accentText: Record<Accent, string> = {
  cyan: "text-cyan-600",
  orange: "text-orange-600",
  violet: "text-violet-600",
  emerald: "text-emerald-600",
  default: "text-foreground",
};

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
}

type StreamStats = {
  avgHr: number | null;
  avgSpeed: number | null;
  totalDistance: number | null;
  totalAscent: number | null;
};

type Slot = {
  label: string;
  value: string | null;
  accent: Accent;
  needsStream?: boolean;
};

function formatSpeed(metersPerSec: number | null): string | null {
  if (metersPerSec == null) return null;
  return `${(metersPerSec * 3.6).toFixed(1)} km/h`;
}

function buildSlots(activity: HeroActivity, stream: StreamStats | null): Slot[] {
  const duration =
    activity.duration != null ? formatDuration(activity.duration) : null;

  switch (activity.type) {
    case ActivityType.RUN: {
      const m = activity.runMetrics;
      const avgHr = m?.avgHr ?? stream?.avgHr ?? null;
      return [
        {
          label: "Distance",
          value: m?.distanceM != null ? formatDistance(m.distanceM) : null,
          accent: "cyan",
        },
        {
          label: "Allure",
          value: m?.paceSecPerKm != null ? formatPace(m.paceSecPerKm) : null,
          accent: "emerald",
        },
        {
          label: "FC moy.",
          value: avgHr != null ? `${avgHr} bpm` : null,
          accent: "orange",
          needsStream: m?.avgHr == null,
        },
        {
          label: "Cadence",
          value: m?.cadence != null ? `${m.cadence} spm` : null,
          accent: "violet",
        },
      ];
    }

    case ActivityType.BIKE: {
      const elevation = activity.bikeMetrics?.elevationM ?? stream?.totalAscent;
      return [
        {
          label: "Distance",
          value:
            stream?.totalDistance != null
              ? formatDistance(stream.totalDistance)
              : null,
          accent: "cyan",
          needsStream: true,
        },
        { label: "Temps", value: duration, accent: "default" },
        {
          label: "Vitesse moy.",
          value: formatSpeed(stream?.avgSpeed ?? null),
          accent: "emerald",
          needsStream: true,
        },
        {
          label: "Dénivelé",
          value: elevation != null ? `${Math.round(elevation)} m` : null,
          accent: "violet",
          needsStream: activity.bikeMetrics?.elevationM == null,
        },
      ];
    }

    case ActivityType.SWIM: {
      const m = activity.swimMetrics;
      return [
        {
          label: "Distance",
          value: m?.distanceM != null ? formatDistance(m.distanceM) : null,
          accent: "cyan",
        },
        { label: "Temps", value: duration, accent: "default" },
        {
          label: "Allure moy.",
          value:
            m?.avgPaceSecPer100m != null
              ? formatSwimPace(m.avgPaceSecPer100m)
              : null,
          accent: "emerald",
        },
        {
          label: "FC moy.",
          value: stream?.avgHr != null ? `${stream.avgHr} bpm` : null,
          accent: "orange",
          needsStream: true,
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
  const { data, isLoading } = useActivityStream(activityId);
  const slots = buildSlots(activity, data?.stats ?? null);

  const visible = slots.filter(
    (slot) => slot.value != null || (slot.needsStream && isLoading),
  );

  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {visible.map((slot) => (
        <div
          key={slot.label}
          className="rounded-2xl border border-border/60 bg-card/40 px-5 py-4 backdrop-blur-sm"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {slot.label}
          </p>
          {slot.value != null ? (
            <p
              className={cn(
                "mt-1.5 font-mono text-3xl font-semibold tabular-nums",
                accentText[slot.accent],
              )}
            >
              {slot.value}
            </p>
          ) : (
            <Skeleton className="mt-2 h-8 w-24 rounded-lg" />
          )}
        </div>
      ))}
    </div>
  );
}
