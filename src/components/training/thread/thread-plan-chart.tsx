'use client';

import type { ThreadAdherence, ThreadWeek } from '@/lib/training/thread/thread-model';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { cn } from '@/lib/utils';

/**
 * Eight weeks of plan against performance, one bar pair per week.
 *
 * The outline is what was asked, the fill is what happened, and they share a
 * baseline so the gap between them is the reading — no axis, no tooltip, because
 * the question is "am I drifting" and a precise load figure answers a different one.
 */
export function ThreadPlanChart({
  weeks,
  adherence,
}: {
  weeks: readonly ThreadWeek[];
  adherence: ThreadAdherence;
}) {
  const { mode } = useDisplayMode();
  const window = weeks.slice(-8);
  if (window.length === 0) return null;

  const tallest = Math.max(...window.flatMap((w) => [w.plannedLoad, w.doneLoad]), 1);

  return (
    <section className="chip-surface-lg rounded-analysis-lg px-4 py-4">
      <p className="text-label">Prévu vs réalisé · 8 semaines</p>

      <div className="mt-3 flex h-24 items-end gap-1.5" aria-hidden>
        {window.map((week) => (
          <div key={week.weekKey} className="relative flex-1">
            <div
              className="border-analysis-border w-full rounded-[3px] border border-dashed"
              style={{ height: `${Math.max(6, (week.plannedLoad / tallest) * 96)}px` }}
            />
            <div
              style={{ height: `${(week.doneLoad / tallest) * 96}px` }}
              className={cn(
                'absolute bottom-0 w-full rounded-[3px]',
                week.isCurrent ? 'bg-primary' : 'bg-primary/55',
              )}
            />
          </div>
        ))}
      </div>

      <p className="text-data text-muted-foreground mt-2.5 text-[11px] tabular-nums">
        {adherence.ratio != null
          ? `Ratio tenu ${Math.round(adherence.ratio * 100)} %`
          : 'Aucune séance prescrite sur la fenêtre'}
        {adherence.worstWeekLabel ? ` · dernier creux ${adherence.worstWeekLabel}` : ''}
      </p>

      <ul className="sr-only">
        {window.map((week) => (
          <li key={week.weekKey}>
            {week.label} ·{' '}
            {week.plannedLoad > 0
              ? `prévu ${formatTrainingLoad(week.plannedLoad, mode)} · `
              : 'aucune charge prévue · '}
            {week.doneLoadKnown
              ? `réalisé ${formatTrainingLoad(week.doneLoad, mode)}`
              : 'charge réalisée non mesurée'}
          </li>
        ))}
      </ul>
    </section>
  );
}
