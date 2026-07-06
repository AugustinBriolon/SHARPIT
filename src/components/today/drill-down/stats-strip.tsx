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
    <section className="dark:bg-card dark:ring-border flex divide-x rounded-3xl bg-white shadow-sm ring-1 ring-black/4">
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
