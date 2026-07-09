import { MetricCell } from '@/components/ui/metric-cell';
import type { MetricTone } from '@/lib/metric-tone';

export type StatsStripItem = {
  label: string;
  value: string;
  sub?: string;
  tone?: MetricTone;
};

export function DrillDownStatsStrip({ items }: { items: StatsStripItem[] }) {
  return (
    <section className="analysis-panel rounded-analysis-lg grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4">
      {items.map((item) => (
        <MetricCell
          key={item.label}
          label={item.label}
          layout="strip"
          sub={item.sub}
          tone={item.tone}
          value={item.value}
        />
      ))}
    </section>
  );
}
