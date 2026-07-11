'use client';

import Link from 'next/link';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';
import { cn } from '@/lib/utils';

function SessionLine({ line }: { line: TodayViewModel['actionRow']['daySummaryLines'][number] }) {
  const content = (
    <div className="flex w-full min-w-0 items-center justify-between">
      <div className="flex items-center gap-1.5">
        <ActivityTypeIndicator type={line.activityType} />
        <p className="line-clamp-2 min-w-0 text-sm leading-snug font-medium wrap-break-word">
          {line.primary}
        </p>
        {line.secondary ? (
          <span className="text-data text-muted-foreground shrink-0 text-xs">{line.secondary}</span>
        ) : null}
      </div>
      {line.isDone && (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      )}
    </div>
  );

  return (
    <Link
      href={line.href}
      className={cn(
        'border-border/60 bg-background/40 hover:bg-muted/40 block rounded-xl border px-3 py-2.5 transition-colors',
        line.isDone && 'border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10',
      )}
    >
      {content}
    </Link>
  );
}

function LimitingContent({ vm }: { vm: TodayViewModel }) {
  const limiting = vm.actionRow;

  if (limiting.limitingMode === 'list' && limiting.limitingLines.length > 0) {
    return (
      <ul className="text-foreground space-y-1.5 text-sm leading-relaxed">
        {limiting.limitingLines.map((hint) => (
          <li key={hint}>· {hint}</li>
        ))}
      </ul>
    );
  }

  if (limiting.limitingHref && limiting.limitingText) {
    return (
      <Link
        className="text-foreground block text-sm leading-relaxed underline-offset-2 transition-colors hover:underline"
        href={limiting.limitingHref}
      >
        {limiting.limitingText}
      </Link>
    );
  }

  return <p className="text-muted-foreground text-sm leading-relaxed">{limiting.limitingText}</p>;
}

export function TodayActionRow({
  vm,
  onWellnessCompleted,
}: {
  vm: TodayViewModel;
  onWellnessCompleted?: () => void;
}) {
  const daySummaryEmpty = vm.actionRow.daySummaryLines.length === 0;

  return (
    <div
      className={cn('grid grid-cols-1 gap-3', vm.actionRow.showLimitingColumn && 'lg:grid-cols-2')}
    >
      {vm.actionRow.showLimitingColumn ? (
        <section className="analysis-panel rounded-analysis-lg flex flex-col px-5 py-4 sm:px-6">
          <p className="text-label mb-2">{vm.actionRow.limitingLabel}</p>
          <LimitingContent vm={vm} />
        </section>
      ) : null}

      <section className="analysis-panel rounded-analysis-lg flex flex-col px-5 py-4 sm:px-6">
        <div className="mb-3 flex items-start justify-between gap-2">
          <p className="text-label">{vm.actionRow.actionLabel}</p>
          <MorningWellnessDialog onCompleted={onWellnessCompleted} />
        </div>

        {daySummaryEmpty ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">{vm.actionRow.daySummaryEmptyText}</p>
            <Link
              className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
              href={vm.actionRow.daySummaryEmptyHref}
            >
              <CalendarClock className="size-3.5" />
              Voir le planning
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {vm.actionRow.daySummaryLines.map((line) => (
              <li key={line.id}>
                <SessionLine line={line} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
