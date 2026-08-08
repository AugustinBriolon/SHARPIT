import { InstrumentMetricGrid } from '@/components/ui/instrument-metric-chip';
import type { HikeTripSummary } from '@/lib/activity/hike-trip-summary';
import { formatDistance, formatDuration } from '@/lib/format';

export function buildHikeTripHeroMetrics(summary: HikeTripSummary) {
  const items: { label: string; value: string }[] = [];

  if (summary.durationSec != null) {
    items.push({ label: 'Durée', value: formatDuration(summary.durationSec) });
  }
  if (summary.distanceM != null) {
    items.push({ label: 'Distance', value: formatDistance(summary.distanceM) });
  }
  if (summary.elevationM != null) {
    items.push({ label: 'D+', value: `${Math.round(summary.elevationM)} m` });
  }
  if (summary.elevationLossM != null) {
    items.push({ label: 'D−', value: `${Math.round(summary.elevationLossM)} m` });
  }
  if (summary.load != null) {
    items.push({ label: 'Charge', value: `${Math.round(summary.load)} TSS` });
  }

  return items;
}

export function HikeTripHero({ summary }: { summary: HikeTripSummary }) {
  const items = buildHikeTripHeroMetrics(summary);
  if (items.length === 0) return null;
  return <InstrumentMetricGrid items={items} />;
}
