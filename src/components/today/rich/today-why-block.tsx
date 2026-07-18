'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';

function FactRows({
  facts,
}: {
  facts: Array<{ label: string; value: string; hint?: string | null }>;
}) {
  return (
    <ul className="divide-analysis-border/50 divide-y">
      {facts.map((fact) => (
        <li
          key={`${fact.label}-${fact.value}`}
          className="flex items-baseline justify-between gap-4 py-2.5"
        >
          <p className="text-muted-foreground text-sm">{fact.label}</p>
          <div className="min-w-0 text-right">
            <p className="text-data text-foreground text-sm font-semibold tabular-nums">
              {fact.value}
            </p>
            {fact.hint ? (
              <p className="text-muted-foreground text-[11px] leading-snug">{fact.hint}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TodayWhyBlock({ vm }: { vm: TodayViewModel }) {
  const { facts } = vm.whyBlock;
  if (!vm.whyBlock.visible || facts.length === 0) return null;

  return (
    <section className="analysis-panel rounded-analysis-lg px-5 py-4 sm:px-6">
      <p className="text-label mb-1">{vm.whyBlock.title}</p>
      <FactRows facts={facts} />
    </section>
  );
}
