import { DrillDownStatsStrip } from '@/components/today/drill-down/stats-strip';
import type { MetricTone } from '@/components/today/drill-down/metric-cell';

function acwrTone(acwr: number): MetricTone {
  if (acwr >= 1.5) return 'warn';
  if (acwr >= 1.3) return 'warn';
  if (acwr >= 0.9) return 'good';
  return 'neutral';
}

function tsbDisplay(tsb: number | null): string {
  if (tsb == null) return '—';
  const sign = tsb > 0 ? '+' : '';
  return `${sign}${tsb}`;
}

function tsbTone(tsb: number | null): MetricTone {
  if (tsb == null) return 'neutral';
  return tsb >= 0 ? 'good' : 'warn';
}

export function EffortStatsStrip({
  acwr,
  weeklyTss,
  tsb,
}: {
  acwr: number;
  weeklyTss: number;
  tsb: number | null;
}) {
  return (
    <DrillDownStatsStrip
      items={[
        {
          label: 'ACWR',
          value: acwr > 0 ? acwr.toFixed(2) : '—',
          sub: 'ratio charge',
          tone: acwrTone(acwr),
        },
        {
          label: 'TSS 7j',
          value: weeklyTss > 0 ? `${weeklyTss}` : '—',
          sub: 'charge aiguë',
        },
        {
          label: 'TSB',
          value: tsbDisplay(tsb),
          sub: 'forme',
          tone: tsbTone(tsb),
        },
      ]}
    />
  );
}
