import { DrillDownStatsStrip } from '@/components/today/drill-down/stats-strip';
import {
  formChipLabel,
  formChipTone,
  rampChipLabel,
  rampChipTone,
} from '@/lib/effort/load-reading';

export function EffortStatsStrip({
  acwr,
  weeklyTss,
  tsb,
  loading = false,
}: {
  acwr: number;
  weeklyTss: number;
  tsb: number | null;
  loading?: boolean;
}) {
  return (
    <DrillDownStatsStrip
      loading={loading}
      items={[
        {
          label: 'Montée',
          value: rampChipLabel(acwr),
          sub: acwr > 0 ? acwr.toFixed(2) : undefined,
          tone: rampChipTone(acwr),
        },
        {
          label: 'Charge 7 j',
          value: weeklyTss > 0 ? `${weeklyTss}` : '—',
          sub: weeklyTss > 0 ? 'TSS' : undefined,
        },
        {
          label: 'Forme',
          value: formChipLabel(tsb),
          sub: tsb != null ? `${tsb > 0 ? '+' : ''}${tsb}` : undefined,
          tone: formChipTone(tsb),
        },
      ]}
    />
  );
}
