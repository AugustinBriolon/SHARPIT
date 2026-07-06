import { DrillDownStatsStrip } from '@/components/today/drill-down/stats-strip';
import type { MetricTone } from '@/components/today/drill-down/metric-cell';

export function RecoveryStatsStrip({
  hrv,
  restingHr,
  bodyBattery,
  confidencePct,
  confidenceTone,
}: {
  hrv: number | null;
  restingHr: number | null;
  bodyBattery: number | null;
  confidencePct: number;
  confidenceTone: MetricTone;
}) {
  return (
    <DrillDownStatsStrip
      items={[
        { label: 'VFC', value: hrv != null ? `${hrv}` : '—', sub: 'ms' },
        { label: 'FC repos', value: restingHr != null ? `${restingHr}` : '—', sub: 'bpm' },
        {
          label: 'Batterie',
          value: bodyBattery != null ? `${bodyBattery}` : '—',
          sub: 'énergie',
        },
        {
          label: 'Confiance',
          value: `${confidencePct} %`,
          tone: confidenceTone,
        },
      ]}
    />
  );
}
