import { DrillDownStatsStrip } from '@/components/today/drill-down/stats-strip';

export function RecoveryStatsStrip({
  hrv,
  restingHr,
  bodyBattery,
  loading = false,
}: {
  hrv: number | null;
  restingHr: number | null;
  bodyBattery: number | null;
  loading?: boolean;
}) {
  return (
    <DrillDownStatsStrip
      loading={loading}
      items={[
        { label: 'VFC', value: hrv != null ? `${hrv}` : '—', sub: 'ms' },
        { label: 'FC repos', value: restingHr != null ? `${restingHr}` : '—', sub: 'bpm' },
        {
          label: 'Batterie',
          value: bodyBattery != null ? `${bodyBattery}` : '—',
          sub: 'énergie',
        },
      ]}
    />
  );
}
