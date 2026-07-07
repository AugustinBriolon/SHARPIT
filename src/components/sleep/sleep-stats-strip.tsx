import { DrillDownStatsStrip } from '@/components/today/drill-down/stats-strip';
import type { MetricTone } from '@/components/today/drill-down/metric-cell';
import { formatSleepDuration, restorativeRatioLabel } from '@/lib/sleep-scoring';

function restorativeRatioTone(ratio: number | null): MetricTone {
  if (ratio == null || ratio >= 40) return 'good';
  if (ratio < 32) return 'bad';
  return 'warn';
}

function deltaTone(
  delta: number | null,
  positiveTone: MetricTone,
  negativeTone: MetricTone,
): MetricTone {
  if (delta == null) return 'neutral';
  return delta >= 0 ? positiveTone : negativeTone;
}

function signedSleepDuration(deltaMin: number): string {
  const sign = deltaMin >= 0 ? '+' : '−';
  return `${sign}${formatSleepDuration(Math.abs(deltaMin))}`;
}

export function SleepStatsStrip({
  totalSleepMin,
  restorativeRatio,
  sleepDelta7d,
  targetDeltaMin,
  sleepTargetMin,
}: {
  totalSleepMin: number | null;
  restorativeRatio: number | null;
  sleepDelta7d: number | null;
  targetDeltaMin: number | null;
  sleepTargetMin: number;
}) {
  return (
    <DrillDownStatsStrip
      items={[
        {
          label: 'Durée',
          value: totalSleepMin != null ? formatSleepDuration(totalSleepMin) : '—',
        },
        {
          label: 'Restaurateur',
          // sub: restorativeRatio != null ? restorativeRatioLabel(restorativeRatio) : undefined,
          tone: restorativeRatioTone(restorativeRatio),
          value: restorativeRatio != null ? `${restorativeRatio} %` : '—',
        },
        {
          label: 'vs 7j',
          tone: deltaTone(sleepDelta7d, 'good', 'bad'),
          value: sleepDelta7d != null ? signedSleepDuration(sleepDelta7d) : '—',
        },
        {
          label: 'Objectif',
          // sub: formatSleepDuration(sleepTargetMin),
          tone: deltaTone(targetDeltaMin, 'good', 'warn'),
          value: targetDeltaMin != null ? signedSleepDuration(targetDeltaMin) : '—',
        },
      ]}
    />
  );
}
