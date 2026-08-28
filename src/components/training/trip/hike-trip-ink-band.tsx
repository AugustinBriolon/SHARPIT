import { Mountain } from 'lucide-react';
import type { ReactNode } from 'react';
import { HikeTripElevationProfile } from '@/components/training/trip/hike-trip-elevation-profile';
import type { HikeTripElevationProfile as Profile } from '@/lib/activity/hike/hike-trip-elevation';
import {
  formatTripDateRange,
  formatTripStepCount,
  type HikeTripSummary,
} from '@/lib/activity/hike/hike-trip-summary';
import { formatDistance, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

type BandMetric = { label: string; value: string; unit?: string; accent?: boolean };

/**
 * Splits “130.87 km” into value + unit so the unit can be set smaller.
 * Readings without a unit (“16h24”) stay whole.
 */
function splitUnit(reading: string): { value: string; unit?: string } {
  const index = reading.lastIndexOf(' ');
  if (index === -1) {
    return { value: reading };
  }
  return { value: reading.slice(0, index), unit: reading.slice(index + 1) };
}

/**
 * The three readings that answer “how big was this trip?”.
 * Same null-guard as the metric grid it replaces: a missing total is omitted,
 * never rendered as a zero.
 */
export function buildHikeTripBandMetrics(summary: HikeTripSummary): BandMetric[] {
  const metrics: BandMetric[] = [];

  if (summary.distanceM !== null) {
    metrics.push({
      label: 'Distance',
      ...splitUnit(formatDistance(summary.distanceM)),
      accent: true,
    });
  }
  if (summary.elevationM !== null) {
    metrics.push({ label: 'D+ cumulé', value: `${Math.round(summary.elevationM)}`, unit: 'm' });
  }
  if (summary.durationSec !== null) {
    metrics.push({ label: 'Durée', ...splitUnit(formatDuration(summary.durationSec)) });
  }

  return metrics;
}

/**
 * Trip aggregation plate — the page's single ink band.
 * Carries identity (icon, name, dates) and the three headline totals;
 * on desktop the elevation signature sits in the second column.
 */
export function HikeTripInkBand({
  name,
  summary,
  profile,
  actions,
}: {
  name: string;
  summary: HikeTripSummary;
  profile: Profile | null;
  /** Menu / controls rendered top-right inside the band. */
  actions?: ReactNode;
}) {
  const metrics = buildHikeTripBandMetrics(summary);
  const stepCount = formatTripStepCount(summary.memberCount);
  const subtitle = [formatTripDateRange(summary.startAt, summary.endAt), stepCount]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="surface-ink relative px-5 py-6 sm:px-7 sm:py-7">
      {actions ? <div className="absolute top-5 right-4 sm:right-5">{actions}</div> : null}

      <div
        className={cn(profile ? 'lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-8' : null)}
      >
        <div className="flex min-w-0 items-start gap-3 pr-10 lg:pr-0">
          <span
            className="bg-ink-surface-foreground/12 text-ink-accent flex size-11 shrink-0 items-center justify-center rounded-full sm:size-12"
            aria-hidden
          >
            <Mountain className="size-5 sm:size-6" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-label text-ink-surface-foreground/60">séjour</p>
            <h1 className="text-page-title text-ink-surface-foreground mt-1 leading-snug wrap-break-word">
              {name}
            </h1>
            {subtitle ? (
              <p className="text-data text-ink-surface-foreground/70 mt-1.5 text-sm">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {profile ? (
          <HikeTripElevationProfile
            className="mt-7 hidden lg:mt-0 lg:block"
            height={148}
            profile={profile}
            surface="ink"
          />
        ) : null}
      </div>

      {/* Full band width so the three headline numbers never wrap their unit. */}
      {metrics.length > 0 ? (
        <dl
          className="divide-ink-surface-foreground/15 mt-6 grid divide-x lg:mt-7"
          style={{ gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))` }}
        >
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 px-2.5 first:pl-0 last:pr-0 sm:px-5">
              <dt className="text-label text-ink-surface-foreground/60">{metric.label}</dt>
              <dd
                className={cn(
                  'font-heading mt-1.5 text-[1.25rem] leading-none font-semibold whitespace-nowrap',
                  'tabular-nums sm:text-[1.625rem] lg:text-[1.75rem]',
                  metric.accent ? 'text-ink-accent' : 'text-ink-surface-foreground',
                )}
              >
                {metric.value}
                {metric.unit ? (
                  <span className="ml-1 text-[0.7em] font-normal opacity-70">{metric.unit}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
