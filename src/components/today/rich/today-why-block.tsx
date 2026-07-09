'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';

export function TodayWhyBlock({ vm }: { vm: TodayViewModel }) {
  return !vm.whyBlock.visible || vm.whyBlock.lines.length === 0 ? null : (
    <section className="analysis-panel rounded-analysis-lg px-5 py-4 sm:px-6">
      <p className="text-label mb-3">{vm.whyBlock.title}</p>
      <ul className="space-y-2.5">
        {vm.whyBlock.lines.map((line, i) => (
          <li
            key={i}
            className={
              i === 0
                ? 'border-analysis-border text-foreground border-l-2 pl-3 text-sm leading-relaxed font-medium'
                : 'text-muted-foreground pl-3 text-sm leading-relaxed'
            }
          >
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
