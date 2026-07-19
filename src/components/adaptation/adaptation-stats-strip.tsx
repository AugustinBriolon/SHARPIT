import { DrillDownStatsStrip } from '@/components/today/drill-down/stats-strip';
import type { MetricTone } from '@/components/today/drill-down/metric-cell';

/**
 * Adaptation chips — index lives on the plate; frein name lives on the plate action line.
 * Score / tendance / charge stay as glanceable numbers.
 */
export function AdaptationStatsStrip({
  trendLabel,
  loadMultiplier,
  limitingFactor,
  limitingScore,
}: {
  trendLabel: string;
  loadMultiplier: number;
  limitingFactor: string | null;
  limitingScore: number | null;
}) {
  let loadTone: MetricTone = 'neutral';
  if (loadMultiplier > 1.05) loadTone = 'good';
  else if (loadMultiplier < 0.95) loadTone = 'warn';

  const loadValue =
    Math.abs(loadMultiplier - 1) < 0.005 ? 'neutre' : `×${loadMultiplier.toFixed(2)}`;

  let freinValue = '—';
  if (limitingScore != null) freinValue = String(Math.round(limitingScore));
  else if (limitingFactor) freinValue = '·';

  return (
    <DrillDownStatsStrip
      items={[
        {
          label: 'Tendance',
          value: trendLabel && trendLabel !== '—' ? trendLabel : '—',
        },
        {
          label: 'Charge',
          value: loadValue,
          tone: loadTone,
        },
        {
          label: 'Frein',
          value: freinValue,
          tone: limitingScore != null && limitingScore < 40 ? 'warn' : 'neutral',
        },
      ]}
    />
  );
}
