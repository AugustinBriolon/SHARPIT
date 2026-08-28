'use client';

import { Area, AreaChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ResponsiveChartFrame } from '@/components/ui/charts/responsive-chart-frame';
import { CHART_PRIMARY_STROKE } from '@/lib/theme/chart-theme';
import {
  formatRelativeGain,
  type HikeTripElevationProfile as Profile,
} from '@/lib/activity/hike/hike-trip-elevation';
import { resolveHikeElevationChartTheme } from '@/components/training/trip/hike-trip-elevation-chart-theme';
import { cn } from '@/lib/utils';

/**
 * Trip elevation signature — cumulative *relative* gain, one tooth per step.
 * The trip query has no altitude stream, so this is never an absolute altitude;
 * every reading stays signed (`+1240 m`) to keep that explicit.
 */
export function HikeTripElevationProfile({
  profile,
  surface = 'card',
  height = 132,
  className,
}: {
  profile: Profile;
  /** `ink` restyles ticks and stroke for the Forest/Lime band. */
  surface?: 'card' | 'ink';
  height?: number;
  className?: string;
}) {
  const onInk = surface === 'ink';
  const theme = resolveHikeElevationChartTheme(onInk);
  const formatTick = (value: number) => formatRelativeGain(value).replace(' ', ' ');

  return (
    <div className={cn('min-w-0', onInk ? 'text-ink-surface-foreground/60' : null, className)}>
      {/* The peak value lives on the axis only — the dot marks where it happens. */}
      <p className={cn('text-label', onInk && 'text-ink-surface-foreground/60')}>
        profil du dénivelé cumulé
      </p>

      <ResponsiveChartFrame className="mt-2" height={height}>
        <AreaChart data={profile.points} margin={{ top: 10, right: 8, bottom: 6, left: 0 }}>
          {/* Needed so the peak dot and step junctions can be placed by `x`. */}
          <XAxis dataKey="x" domain={['dataMin', 'dataMax']} type="number" hide />
          <YAxis
            axisLine={false}
            dataKey="gain"
            domain={[profile.minGain, profile.maxGain]}
            interval={0}
            tick={{ fill: theme.tickColor, fontFamily: 'var(--font-data)', fontSize: 10 }}
            tickFormatter={formatTick}
            tickLine={false}
            ticks={[profile.minGain, profile.maxGain]}
            width={60}
          />
          {profile.stepBoundaries.map((x) => (
            <ReferenceLine key={x} stroke={theme.gridColor} strokeDasharray="3 3" x={x} />
          ))}
          <Area
            dataKey="gain"
            fill={theme.stroke}
            fillOpacity={theme.fillOpacity}
            isAnimationActive={false}
            stroke={theme.stroke}
            strokeWidth={2}
            type="linear"
          />
          <ReferenceDot
            fill={theme.stroke}
            r={3.5}
            stroke="none"
            x={profile.peakX}
            y={profile.peakGain}
          />
        </AreaChart>
      </ResponsiveChartFrame>
    </div>
  );
}

/** Per-step mini profile — start → peak → end, no axis, no label. */
export function HikeStepSparkline({
  points,
  className,
}: {
  points: { x: number; gain: number }[];
  className?: string;
}) {
  return (
    <div className={cn('h-7 w-12 shrink-0', className)} aria-hidden>
      <ResponsiveChartFrame height={28}>
        <AreaChart data={points} margin={{ top: 3, right: 1, bottom: 2, left: 1 }}>
          <Area
            dataKey="gain"
            fill={CHART_PRIMARY_STROKE}
            fillOpacity={0.14}
            isAnimationActive={false}
            stroke={CHART_PRIMARY_STROKE}
            strokeWidth={1.5}
            type="linear"
          />
        </AreaChart>
      </ResponsiveChartFrame>
    </div>
  );
}
