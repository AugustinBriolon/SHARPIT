'use client';

import Link from 'next/link';
import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { CalendarClock } from 'lucide-react';
import dynamic from 'next/dynamic';
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
  onWellnessCompleted,
}: {
  loading: boolean;
  onWellnessCompleted?: () => void;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2 px-0.5">
      {loading ? (
        <SkeletonDataValue heightClassName="h-8" widthClassName="w-24" />
      ) : (
        <DiscussWithCoachButton label="Coach" size="sm" target={{ kind: 'today' }} />
      )}
      <div className="flex shrink-0 items-center">
        {loading ? (
          <SkeletonDataValue heightClassName="h-8" widthClassName="w-24" />
        ) : (
          <MorningWellnessDialog triggerLabel="Ressenti" onCompleted={onWellnessCompleted} />
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
    <div className="analysis-panel border-analysis-border/80 rounded-analysis-lg overflow-hidden border">
      <div className="grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="bg-muted/40 min-h-44 sm:min-h-36" aria-hidden />
        <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
          <SkeletonDataValue heightClassName="h-4" widthClassName="w-28" />
          <div className="grid grid-cols-3 gap-3">
            <SkeletonDataValue heightClassName="h-10" widthClassName="w-full" />
            <SkeletonDataValue heightClassName="h-10" widthClassName="w-full" />
            <SkeletonDataValue heightClassName="h-10" widthClassName="w-full" />
          </div>
        </div>
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
    <ul className="space-y-3">
      {sessionLines.map((line, index) => (
        <li key={line.id}>
          <TodayDaySummaryLine
            isPrimary={index === primaryIndex && !orientation?.showFirmActions}
            line={line}
            sessionCount={sessionLines.length}
            onOpenPlanned={(sessionId) => openPlannedSession({ sessionId })}
          />
        </li>
      ))}
    </ul>
  );
}

function TodayActionRowLoadedContent({
  derived,
  vm,
  onWellnessCompleted,
  openPlannedSession,
}: {
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
      {derived.daySummaryEmpty ? (
        <TodayActionRowEmpty
          emptyHref={vm.actionRow.daySummaryEmptyHref}
          emptyText={vm.actionRow.daySummaryEmptyText}
        />
      ) : null}
      <TodayActionRowLinkSuggestions
        openPlannedSession={openPlannedSession}
        suggestions={derived.sessionLinkSuggestions}
        onWellnessCompleted={onWellnessCompleted}
      />
      <TodayActionRowDaySummary
        openPlannedSession={openPlannedSession}
        orientation={derived.orientation}
        primaryIndex={derived.primaryIndex}
        sessionLines={derived.sessionLines}
      />
      {derived.postSessionLoop ? <TodayPostSessionLoop loop={derived.postSessionLoop} /> : null}
    </>
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
  if (loading) {
    return <TodayActionRowSkeleton />;
  }

  return (
    <TodayActionRowLoadedContent
      derived={derived}
      openPlannedSession={openPlannedSession}
      vm={vm}
      onWellnessCompleted={onWellnessCompleted}
    />
  );
}
