import { InstrumentMetricGrid } from '@/components/ui/instrument-metric-chip';
import { computeSleepEfficiencyPct, formatSleepDuration } from '@/lib/sleep/sleep-scoring';

/**
 * Sleep KPI chips — durée · efficacité · profond · restaurateur.
 * Matches the activity-detail instrument strip (overflow-visible, responsive).
 */
export function SleepStatsStrip({
  totalSleepMin,
  deepMin,
  awakeMin,
  bedtimeMin,
  wakeMin,
  restorativeRatio,
  loading = false,
}: {
  totalSleepMin: number | null;
  deepMin: number | null;
  awakeMin: number | null;
  bedtimeMin: number | null;
  wakeMin: number | null;
  restorativeRatio: number | null;
  loading?: boolean;
}) {
  const efficiency = computeSleepEfficiencyPct({
    totalSleepMin,
    awakeMin,
    bedtimeMin,
    wakeMin,
  });

  return (
    <InstrumentMetricGrid
      loading={loading}
      items={[
        {
          label: 'Durée',
          value: totalSleepMin != null ? formatSleepDuration(totalSleepMin) : null,
        },
        {
          label: 'Efficacité',
          value: efficiency != null ? `${efficiency} %` : null,
        },
        {
          label: 'Sommeil profond',
          value: deepMin != null ? formatSleepDuration(deepMin) : null,
        },
        {
          label: 'Restaurateur',
          value: restorativeRatio != null ? `${restorativeRatio} %` : null,
        },
      ]}
    />
  );
}
