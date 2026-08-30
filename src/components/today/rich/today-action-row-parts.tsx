'use client';

import Link from 'next/link';
import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { CalendarClock } from 'lucide-react';
import dynamic from 'next/dynamic';
import { MorningOrientationActions } from '@/components/today/rich/morning-orientation-actions';
import { SessionLinkSuggestionCard } from '@/components/today/rich/session-link-suggestion-card';
import { ActivityFeelingPrompt } from '@/components/training/activity/detail/activity-feeling-prompt';
import { TodayDaySummaryLine } from '@/components/today/rich/today-day-summary-line';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

const MorningWellnessDialog = dynamic(
  () =>
    import('@/components/today/dashboard/morning-wellness-dialog').then(
      (mod) => mod.MorningWellnessDialog,
    ),
  { ssr: false },
);

export function TodayActionRowHeader({
  loading,
  actionLabel,
  onWellnessCompleted,
}: {
  loading: boolean;
  actionLabel: string;
  onWellnessCompleted?: () => void;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2 px-0.5">
      <h2 className="text-label text-balance">{actionLabel}</h2>
      <div className="flex shrink-0 items-center gap-2">
        {loading ? (
          <SkeletonDataValue heightClassName="h-8" widthClassName="w-24" />
        ) : (
          <MorningWellnessDialog onCompleted={onWellnessCompleted} />
        )}
      </div>
    </div>
  );
}

export function TodayActionRowReminders({
  reminders,
}: {
  reminders: TodayViewModel['actionRow']['limitingFacts'];
}) {
  if (reminders.length === 0) {
    return null;
  }

  return (
    <ul className="text-muted-foreground space-y-1 px-0.5 text-xs leading-relaxed text-pretty">
      {reminders.map((fact) => (
        <li key={`${fact.label}-${fact.value}`}>
          <span className="text-foreground/80 font-medium">{fact.label}</span>
          {' · '}
          <span className="tabular-nums">{fact.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function TodayActionRowSkeleton() {
  return (
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
  );
}

export function TodayActionRowEmpty({
  emptyText,
  emptyHref,
}: {
  emptyText: string;
  emptyHref: string;
}) {
  return (
    <div className="border-analysis-border/80 bg-background/50 rounded-analysis space-y-2 border px-3 py-3">
      <p className="text-muted-foreground text-sm text-pretty">{emptyText}</p>
      <Link
        className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
        href={emptyHref}
      >
        <CalendarClock className="size-3.5" />
        Voir le planning
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

export function TodayPostSessionLoop({
  loop,
}: {
  loop: NonNullable<TodayViewModel['postSessionLoop']>;
}) {
  return (
    <div className="border-analysis-border/80 bg-background/50 rounded-analysis space-y-2 border px-3 py-3">
      <p className="text-sm font-medium text-pretty">{loop.activityTitle}</p>
      {loop.freshnessLine ? (
        <p className="text-muted-foreground text-xs text-pretty">{loop.freshnessLine}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          className="text-primary text-xs font-medium hover:underline"
          href={loop.narrativeHref}
        >
          Voir le récit de séance
          <span aria-hidden> →</span>
        </Link>
        {loop.needsFeeling ? <ActivityFeelingPrompt activityId={loop.activityId} /> : null}
      </div>
    </div>
  );
}

export function TodayActionRowLinkSuggestions({
  suggestions,
  onWellnessCompleted,
  openPlannedSession,
}: {
  suggestions: TodayViewModel['actionRow']['sessionLinkSuggestions'];
  onWellnessCompleted?: () => void;
  openPlannedSession: (args: { sessionId: string }) => void;
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {suggestions.map((suggestion) => (
        <li key={suggestion.id}>
          <SessionLinkSuggestionCard
            suggestion={suggestion}
            onLinked={onWellnessCompleted}
            onOpenPlanned={() => openPlannedSession({ sessionId: suggestion.plannedSessionId })}
          />
        </li>
      ))}
    </ul>
  );
}

export function TodayActionRowDaySummary({
  sessionLines,
  primaryIndex,
  orientation,
  openPlannedSession,
}: {
  sessionLines: TodayViewModel['actionRow']['daySummaryLines'];
  primaryIndex: number;
  orientation: TodayViewModel['morningOrientation'];
  openPlannedSession: (args: { sessionId: string }) => void;
}) {
  if (sessionLines.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {sessionLines.map((line, index) => (
        <li key={line.id}>
          <TodayDaySummaryLine
            isPrimary={index === primaryIndex && !orientation?.showFirmActions}
            line={line}
            onOpenPlanned={(sessionId) => openPlannedSession({ sessionId })}
          />
        </li>
      ))}
    </ul>
  );
}

export function TodayActionRowSessionLists({
  loading,
  derived,
  vm,
  onWellnessCompleted,
  openPlannedSession,
}: {
  loading: boolean;
  derived: {
    daySummaryEmpty: boolean;
    sessionLinkSuggestions: TodayViewModel['actionRow']['sessionLinkSuggestions'];
    sessionLines: TodayViewModel['actionRow']['daySummaryLines'];
    primaryIndex: number;
    orientation: TodayViewModel['morningOrientation'];
    postSessionLoop: TodayViewModel['postSessionLoop'] | null;
  };
  vm: TodayViewModel;
  onWellnessCompleted?: () => void;
  openPlannedSession: (args: { sessionId: string }) => void;
}) {
  return (
    <>
      {loading ? <TodayActionRowSkeleton /> : null}

      {!loading && derived.daySummaryEmpty ? (
        <TodayActionRowEmpty
          emptyHref={vm.actionRow.daySummaryEmptyHref}
          emptyText={vm.actionRow.daySummaryEmptyText}
        />
      ) : null}

      {!loading ? (
        <TodayActionRowLinkSuggestions
          openPlannedSession={openPlannedSession}
          suggestions={derived.sessionLinkSuggestions}
          onWellnessCompleted={onWellnessCompleted}
        />
      ) : null}

      {!loading ? (
        <TodayActionRowDaySummary
          openPlannedSession={openPlannedSession}
          orientation={derived.orientation}
          primaryIndex={derived.primaryIndex}
          sessionLines={derived.sessionLines}
        />
      ) : null}

      {!loading && derived.postSessionLoop ? (
        <TodayPostSessionLoop loop={derived.postSessionLoop} />
      ) : null}
    </>
  );
}
