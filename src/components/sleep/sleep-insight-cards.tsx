import { SleepSectionLabel } from '@/components/sleep/sleep-section-label';
import type { SleepInsight } from '@/lib/sleep';

export function SleepInsightCards({ insights }: { insights: SleepInsight[] }) {
  if (!insights.length) return null;

  return (
    <section className="space-y-2">
      <SleepSectionLabel>Ce que cette nuit change</SleepSectionLabel>
      {insights.slice(0, 3).map((insight, i) => (
        <div
          key={i}
          className="dark:bg-card dark:ring-border rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/4"
        >
          <p className="text-sm font-medium">{insight.title}</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{insight.detail}</p>
        </div>
      ))}
    </section>
  );
}
