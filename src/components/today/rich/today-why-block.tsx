'use client';

import type { TodayDashboardViewModel } from '@/components/today/dashboard/use-today-dashboard-view-model';
import { buildWhyEvidence, whyBlockTitle } from '@/lib/today-rich-view';

export function TodayWhyBlock({ vm }: { vm: TodayDashboardViewModel }) {
  const whyFocus = vm.phaseNarrative?.whyFocus ?? vm.dailyPhase?.whyFocus ?? 'readiness';
  const lines = buildWhyEvidence(vm.reasoning, vm.briefing?.content, whyFocus);

  if (lines.length === 0) return null;

  const phase = vm.dailyPhase?.phase ?? 'MORNING';

  return (
    <section className="bg-card rounded-2xl border px-5 py-4 sm:px-6">
      <p className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-[0.14em] uppercase">
        {whyBlockTitle(phase)}
      </p>
      <ul className="space-y-2">
        {lines.map((line, i) => (
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
