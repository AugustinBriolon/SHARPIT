'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';

export function TodayWhyBlock({ vm }: { vm: TodayViewModel }) {
  return vm.whyBlock.lines.length === 0 ? null : (
    <section className="bg-card rounded-2xl border px-5 py-4 sm:px-6">
      <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-[0.14em] uppercase">
        {vm.whyBlock.title}
      </p>
      <ul className="space-y-2">
        {vm.whyBlock.lines.map((line, i) => (
          <li
            key={i}
            className={
              i === 0
                ? 'text-foreground text-sm leading-relaxed font-medium'
                : 'text-muted-foreground text-sm leading-relaxed'
            }
          >
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
