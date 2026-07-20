'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';

import { InstrumentListChip, splitInstrumentMeta } from '@/components/ui/instrument-list-chip';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';

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
        <div className="border-analysis-border/80 bg-background/50 rounded-analysis space-y-2 border px-3 py-3">
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
              <InstrumentListChip
                activityType={line.activityType}
                done={line.isDone}
                href={line.href}
                meta={splitInstrumentMeta(line.secondary)}
                title={line.primary}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
