'use client';

import Link from 'next/link';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';
import { STATUS_SURFACE } from '@/lib/presentation/status-surface';
import { cn } from '@/lib/utils';

function SessionChip({ line }: { line: TodayViewModel['actionRow']['daySummaryLines'][number] }) {
  return (
    <Link
      href={line.href}
      title={`Voir le détail — ${line.primary}`}
      className={cn(
        'border-analysis-border/80 bg-analysis-surface-alt/70 hover:border-primary/35 hover:bg-analysis-surface',
        'focus-visible:ring-primary/35 flex w-full min-w-0 items-center justify-between gap-2',
        'rounded-lg border px-3 py-2.5 transition-[border-color,background-color] duration-150',
        'focus-visible:ring-2 focus-visible:outline-hidden',
        line.isDone && cn(STATUS_SURFACE.doneSoft, STATUS_SURFACE.doneHover),
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <ActivityTypeIndicator type={line.activityType} />
        <span className="line-clamp-2 min-w-0 text-sm leading-snug font-medium wrap-break-word">
          {line.primary}
        </span>
        {line.secondary ? (
          <span className="text-data text-muted-foreground shrink-0 text-xs">{line.secondary}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {line.isDone ? <CheckCircle2 className="text-primary size-3.5" /> : null}
        <span className="text-muted-foreground/70 text-data text-[10px] tracking-wider" aria-hidden>
          →
        </span>
      </span>
    </Link>
  );
}

/**
 * Session response — single block answering “quoi aujourd’hui ?”
 * Limiting factor lives on the plate; no Frein column duplicate.
 */
export function TodayActionRow({
  vm,
  onWellnessCompleted,
}: {
  vm: TodayViewModel;
  onWellnessCompleted?: () => void;
}) {
  const daySummaryEmpty = vm.actionRow.daySummaryLines.length === 0;
  const reminders =
    !vm.hero.twinTrustStrip.limitingFactorText &&
    vm.actionRow.limitingMode === 'facts' &&
    vm.actionRow.limitingFacts.length > 0
      ? vm.actionRow.limitingFacts
      : [];

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-label">{vm.actionRow.actionLabel}</p>
        <MorningWellnessDialog onCompleted={onWellnessCompleted} />
      </div>

      {reminders.length > 0 ? (
        <ul className="text-muted-foreground space-y-1 px-0.5 text-xs leading-relaxed">
          {reminders.map((fact) => (
            <li key={`${fact.label}-${fact.value}`}>
              <span className="text-foreground/80 font-medium">{fact.label}</span>
              {' · '}
              {fact.value}
            </li>
          ))}
        </ul>
      ) : null}

      {daySummaryEmpty ? (
        <div className="border-analysis-border/80 bg-background/50 space-y-2 rounded-lg border px-3 py-3">
          <p className="text-muted-foreground text-sm">{vm.actionRow.daySummaryEmptyText}</p>
          <Link
            className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
            href={vm.actionRow.daySummaryEmptyHref}
          >
            <CalendarClock className="size-3.5" />
            Voir le planning
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {vm.actionRow.daySummaryLines.map((line) => (
            <li key={line.id}>
              <SessionChip line={line} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
