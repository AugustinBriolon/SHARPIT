import { DrillDownStatsStrip } from '@/components/today/drill-down/stats-strip';
import type { MetricTone } from '@/components/today/drill-down/metric-cell';
import { formatSleepDuration } from '@/lib/sleep-scoring';

function restorativeRatioTone(ratio: number | null): MetricTone {
  if (ratio == null || ratio >= 40) return 'good';
  if (ratio < 32) return 'bad';
  return 'warn';
}

/** Negative deltas use caution — not punitive risk red. */
function deltaTone(delta: number | null, positiveTone: MetricTone): MetricTone {
  if (delta == null) return 'neutral';
  return delta >= 0 ? positiveTone : 'warn';
}

function signedSleepDuration(deltaMin: number): string {
  const sign = deltaMin >= 0 ? '+' : '−';
  return `${sign}${formatSleepDuration(Math.abs(deltaMin))}`;
}

/**
 * Sleep chips — no Durée (already on the plate).
 */
export function SleepStatsStrip({
  restorativeRatio,
  sleepDelta7d,
  targetDeltaMin,
  sleepTargetMin: _sleepTargetMin,
  totalSleepMin: _totalSleepMin,
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
          label: 'Restaurateur',
          tone: restorativeRatioTone(restorativeRatio),
          value: restorativeRatio != null ? `${restorativeRatio} %` : '—',
        },
        {
          label: 'vs 7j',
          tone: deltaTone(sleepDelta7d, 'good'),
          value: sleepDelta7d != null ? signedSleepDuration(sleepDelta7d) : '—',
        },
        {
          label: 'Objectif',
          tone: deltaTone(targetDeltaMin, 'good'),
          value: targetDeltaMin != null ? signedSleepDuration(targetDeltaMin) : '—',
        },
      ]}
    />
  );
}
