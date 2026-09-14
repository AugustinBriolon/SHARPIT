'use client';

import Link from 'next/link';
import { DiscussWithCoachButton } from '@/components/coach/discuss/discuss-with-coach-button';
import { ActivityStatusButton } from '@/components/shell/activity-status-button';
import { BookOpen, CalendarClock, Check } from 'lucide-react';
import { TodayInstrumentCard } from '@/components/today/dashboard/today-instrument-card';
import { SessionLinkSuggestionCard } from '@/components/today/rich/session-link-suggestion-card';
import { ActivityFeelingPrompt } from '@/components/training/activity/detail/activity-feeling-prompt';
import { TodayDaySummaryLine } from '@/components/today/rich/today-day-summary-line';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

/**
 * Row controls are 44px tall on touch and compact from `lg`: the header sits on
 * the primary surface, where a 32px target is under the tap minimum.
 */
export function TodayActionRowHeader({ loading }: { loading: boolean }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2 px-0.5 lg:min-h-8">
      {loading ? (
        <SkeletonDataValue heightClassName="h-11 lg:h-8" widthClassName="w-24" />
      ) : (
        <DiscussWithCoachButton size="sm" target={{ kind: 'today' }} />
      )}
      <div className="flex shrink-0 items-center gap-2">
        {loading ? (
          <SkeletonDataValue heightClassName="h-11 lg:h-8" widthClassName="w-36" />
        ) : (
          <>
            <ActivityStatusButton />
            <Link
              className="border-primary/35 bg-primary/10 text-primary hover:bg-primary/15 inline-flex h-11 items-center gap-1.5 rounded-lg border px-2.5 text-[0.8rem] font-medium transition-colors duration-150 ease-out active:scale-[0.97] lg:h-8"
              href="/journal"
            >
              <BookOpen className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
              Journal
            </Link>
          </>
        )}
      </div>
    </div>
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
        className="text-primary inline-flex min-h-11 items-center gap-1.5 text-xs font-medium hover:underline lg:min-h-0"
        href={emptyHref}
      >
        <CalendarClock className="size-3.5" />
        Voir le planning
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

/**
 * The window right after a session is the day's peak, and it used to be served
 * by a bordered note. It gets the instrument chrome instead — not the verdict's
 * ink plate, which must stay the single differing surface on the page.
 */
export function TodayPostSessionLoop({
  loop,
}: {
  loop: NonNullable<TodayViewModel['postSessionLoop']>;
}) {
  return (
    <TodayInstrumentCard
      icon={<Check className="size-3.5" strokeWidth={2.25} />}
      subtitle={loop.activityTitle}
      title="Séance faite"
      titleAttr={`Ce que la séance a produit — ${loop.activityTitle}`}
    >
      <div className="mt-3 flex min-w-0 flex-1 flex-col gap-3">
        {loop.freshnessLine ? (
          <p className="text-foreground text-[13px] leading-snug text-pretty">
            {loop.freshnessLine}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            className="text-primary hover:text-primary/85 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold tracking-tight transition-colors lg:min-h-0"
            href={loop.narrativeHref}
          >
            Voir le récit de séance
            <span aria-hidden>→</span>
          </Link>
          {loop.needsFeeling ? <ActivityFeelingPrompt activityId={loop.activityId} /> : null}
        </div>
      </div>
    </TodayInstrumentCard>
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

type ActionRowDerived = {
  daySummaryEmpty: boolean;
  sessionLinkSuggestions: TodayViewModel['actionRow']['sessionLinkSuggestions'];
  sessionLines: TodayViewModel['actionRow']['daySummaryLines'];
  primaryIndex: number;
  orientation: TodayViewModel['morningOrientation'];
  postSessionLoop: TodayViewModel['postSessionLoop'] | null;
};

function TodayActionRowLoadedContent({
  derived,
  vm,
  onWellnessCompleted,
  openPlannedSession,
}: {
  derived: ActionRowDerived;
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
  derived: ActionRowDerived;
  vm: TodayViewModel;
  onWellnessCompleted?: () => void;
  openPlannedSession: (args: { sessionId: string }) => void;
}) {
  if (loading && derived.sessionLines.length === 0 && derived.sessionLinkSuggestions.length === 0) {
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
