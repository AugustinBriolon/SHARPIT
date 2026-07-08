'use client';

import Link from 'next/link';
import { CalendarClock, CheckCircle2 } from 'lucide-react';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';
import { cn } from '@/lib/utils';

function SessionLine({ line }: { line: TodayViewModel['actionRow']['daySummaryLines'][number] }) {
  const content = (
    <div className="flex min-w-0 items-start gap-1.5">
      {line.isDone && (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      )}
      <p className="line-clamp-2 min-w-0 text-sm leading-snug font-medium break-words">
        {line.primary}
      </p>
      {line.secondary ? (
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {line.secondary}
        </span>
      ) : null}
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
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <section className="bg-card flex flex-col rounded-2xl border px-5 py-4 sm:px-6">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-[0.14em] uppercase">
          {vm.actionRow.limitingLabel}
        </p>
        <LimitingContent vm={vm} />
      </section>

      <section className="bg-card flex flex-col rounded-2xl border px-5 py-4 sm:px-6">
        <div className="mb-3 flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
            {vm.actionRow.actionLabel}
          </p>
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
