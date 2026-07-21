'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';

import { InstrumentListChip, splitInstrumentMeta } from '@/components/ui/instrument-list-chip';
import type { InstrumentListChipMeta } from '@/components/ui/instrument-list-chip';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';
import { MorningOrientationActions } from '@/components/today/rich/morning-orientation-actions';

/**
 * Session response — single block answering “quoi aujourd’hui ?”
 * Morning firm actions live here; post-choice is annotated on the session chip.
 */
export function TodayActionRow({
  loading = false,
  onWellnessCompleted,
  trainingDayId,
  vm,
}: {
  vm: TodayViewModel;
  trainingDayId: string;
  onWellnessCompleted?: () => void;
  loading?: boolean;
}) {
  const daySummaryEmpty = !loading && vm.actionRow.daySummaryLines.length === 0;
  const reminders =
    !loading &&
    !vm.hero.twinTrustStrip.limitingFactorText &&
    vm.actionRow.limitingMode === 'facts' &&
    vm.actionRow.limitingFacts.length > 0
      ? vm.actionRow.limitingFacts
      : [];

  const orientation = loading ? null : vm.morningOrientation;
  const hideSessionList = orientation?.phase === 'EVIDENCE_PENDING';

  return (
    <section aria-busy={loading || undefined} className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-label">{vm.actionRow.actionLabel}</p>
        <MorningWellnessDialog onCompleted={onWellnessCompleted} />
      </div>

      {orientation ? (
        <MorningOrientationActions
          orientation={orientation}
          trainingDayId={trainingDayId}
          onRefreshed={onWellnessCompleted}
        />
      ) : null}

      {reminders.length > 0 && orientation?.phase !== 'EVIDENCE_PENDING' ? (
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

      {loading ? (
        <ul className="space-y-2">
          {[0, 1].map((i) => (
            <li
              key={i}
              className="border-analysis-border/80 bg-background/50 rounded-lg border px-3 py-2.5"
            >
              <SkeletonDataValue heightClassName="h-4" widthClassName="w-full max-w-[240px]" />
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !hideSessionList && daySummaryEmpty ? (
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
      ) : null}

      {!loading && !hideSessionList && !daySummaryEmpty ? (
        <ul className="space-y-2">
          {vm.actionRow.daySummaryLines.map((line) => {
            const meta: InstrumentListChipMeta[] = splitInstrumentMeta(line.secondary);
            if (line.morningChoiceLabel) {
              meta.push({ text: line.morningChoiceLabel, tone: 'caution' });
            }
            return (
              <li key={line.id}>
                <InstrumentListChip
                  activityType={line.activityType}
                  done={line.isDone}
                  href={line.href}
                  meta={meta}
                  title={line.primary}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
