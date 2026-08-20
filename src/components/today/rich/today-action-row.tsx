'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import dynamic from 'next/dynamic';

import {
  InstrumentListChip,
  splitInstrumentMeta,
} from '@/components/ui/instruments/instrument-list-chip';
import type { InstrumentListChipMeta } from '@/components/ui/instruments/instrument-list-chip';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { MorningOrientationActions } from '@/components/today/rich/morning-orientation-actions';
import { useAppModal } from '@/providers/app-modal-provider';

const MorningWellnessDialog = dynamic(
  () =>
    import('@/components/today/dashboard/morning-wellness-dialog').then(
      (mod) => mod.MorningWellnessDialog,
    ),
  { ssr: false },
);

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
  const { openPlannedSession } = useAppModal();
  const daySummaryEmpty = !loading && vm.actionRow.daySummaryLines.length === 0;
  const reminders =
    !loading &&
    !vm.hero.twinTrustStrip.limitingFactorText &&
    vm.actionRow.limitingMode === 'facts' &&
    vm.actionRow.limitingFacts.length > 0
      ? vm.actionRow.limitingFacts
      : [];

  const orientation = loading ? null : vm.morningOrientation;

  const proposalSessionId =
    orientation?.confirmEase?.sessionId ?? orientation?.confirmIncrease?.sessionId ?? null;
  /** Proposal card replaces the targeted session chip — keep any other day lines. */
  const sessionLines = proposalSessionId
    ? vm.actionRow.daySummaryLines.filter((line) => line.id !== proposalSessionId)
    : vm.actionRow.daySummaryLines;
  const primaryIndex = sessionLines.findIndex((line) => line.kind === 'planned' && !line.isDone);

  return (
    <section aria-busy={loading || undefined} className="space-y-3">
      <div className="flex h-8 items-center justify-between gap-2 px-0.5">
        <h2 className="text-label text-balance">{vm.actionRow.actionLabel}</h2>
        {loading ? (
          <SkeletonDataValue heightClassName="h-8" widthClassName="w-24" />
        ) : (
          <MorningWellnessDialog onCompleted={onWellnessCompleted} />
        )}
      </div>

      {orientation ? (
        <MorningOrientationActions
          orientation={orientation}
          trainingDayId={trainingDayId}
          onRefreshed={onWellnessCompleted}
        />
      ) : null}

      {reminders.length > 0 ? (
        <ul className="text-muted-foreground space-y-1 px-0.5 text-xs leading-relaxed text-pretty">
          {reminders.map((fact) => (
            <li key={`${fact.label}-${fact.value}`}>
              <span className="text-foreground/80 font-medium">{fact.label}</span>
              {' · '}
              <span className="tabular-nums">{fact.value}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {loading && (
        <div className="chip-surface rounded-analysis space-y-1 px-3 py-3">
          <SkeletonDataValue heightClassName="h-5" widthClassName="w-full max-w-[240px]" />
          <div className="flex h-3.75 items-center gap-1.5">
            <SkeletonDataValue heightClassName="h-3.75" widthClassName="w-15" />
            <span className="opacity-30" aria-hidden>
              ·
            </span>
            <SkeletonDataValue heightClassName="h-full" widthClassName="w-10" />
            <span className="opacity-30" aria-hidden>
              ·
            </span>
            <SkeletonDataValue heightClassName="h-full" widthClassName="w-10" />
          </div>
        </div>
      )}

      {!loading && daySummaryEmpty ? (
        <div className="border-analysis-border/80 bg-background/50 rounded-analysis space-y-2 border px-3 py-3">
          <p className="text-muted-foreground text-sm text-pretty">
            {vm.actionRow.daySummaryEmptyText}
          </p>
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

      {!loading && !daySummaryEmpty ? (
        <ul className="space-y-2">
          {sessionLines.map((line, index) => {
            const rawMeta = splitInstrumentMeta(line.secondary);
            const meta: InstrumentListChipMeta[] =
              line.kind === 'missed'
                ? rawMeta.map((text, i) => (i === 0 ? { text, tone: 'caution' as const } : text))
                : rawMeta;
            if (line.morningChoiceLabel) {
              meta.push({ text: line.morningChoiceLabel, tone: 'caution' });
            }
            const openPlanned =
              line.kind === 'planned' || line.kind === 'missed'
                ? () => openPlannedSession({ sessionId: line.id })
                : undefined;
            return (
              <li key={line.id}>
                <InstrumentListChip
                  activityType={line.activityType}
                  done={line.isDone}
                  href={openPlanned ? undefined : line.href}
                  meta={meta}
                  primary={index === primaryIndex && !orientation?.showFirmActions}
                  title={line.primary}
                  onClick={openPlanned}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
