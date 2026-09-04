'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import {
  type ActivityForConsistency,
  buildActivityConsistencyStats,
  buildConsistencyDayWindow,
  CONSISTENCY_DAY_LAYOUT_FALLBACK,
  type ConsistencyDayCell,
  type ConsistencyDayLayout,
  resolveConsistencyDayLayout,
} from '@/lib/activity/list/activity-consistency';
import { cn } from '@/lib/utils';

const LOADING_ANCHOR = new Date('2026-01-01T12:00:00');

function DayActivityRing({ day }: { day: ConsistencyDayCell }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          'text-[10px] font-medium tracking-[0.06em] uppercase',
          day.isToday ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {day.weekdayLabel}
      </span>
      <span
        title={day.date}
        className={cn(
          'text-data flex size-9 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
          day.hasActivity && 'border-primary text-foreground border-[2.5px]',
          !day.hasActivity && !day.isFuture && 'border-border/80 text-foreground border',
          day.isFuture && 'text-muted-foreground/70',
          day.isToday && !day.hasActivity && 'border-primary/40 border',
        )}
      >
        {day.dayOfMonth}
      </span>
    </div>
  );
}

function ConsistencyDayGrid({ days, columns }: { days: ConsistencyDayCell[]; columns: number }) {
  return (
    <div
      className="grid w-full min-w-0 gap-x-1 gap-y-2.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {days.map((day) => (
        <DayActivityRing key={day.date} day={day} />
      ))}
    </div>
  );
}

function StreakHero({ weeks }: { weeks: number }) {
  const unit = weeks <= 1 ? 'semaine' : 'semaines';

  return (
    <div className="flex shrink-0 flex-col items-end justify-center self-center pl-2 text-right sm:pl-3">
      <span className="text-data text-primary text-[2.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {weeks}
      </span>
      <span className="text-muted-foreground mt-1 text-[12px] leading-tight">
        {unit}
        <br />
        de suite
      </span>
    </div>
  );
}

function RegularityHeaderIcon() {
  return (
    <span className="icon-well size-8" aria-hidden>
      <Activity className="size-3.5" strokeWidth={2.25} />
    </span>
  );
}

function QuietHistoryFooter() {
  return (
    <div className="border-border/50 mt-4 flex items-end justify-between gap-3 border-t pt-3">
      <p className="text-muted-foreground text-xs leading-snug">Voir l’historique</p>
      <span className="text-primary text-xs font-medium">→</span>
    </div>
  );
}

function useConsistencyDayLayout(stripRef: RefObject<HTMLDivElement | null>) {
  const [layout, setLayout] = useState<ConsistencyDayLayout>(CONSISTENCY_DAY_LAYOUT_FALLBACK);

  useEffect(() => {
    const element = stripRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const measure = () => {
      setLayout(resolveConsistencyDayLayout(element.clientWidth));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [stripRef]);

  return layout;
}

export function ActivityConsistencyLoading() {
  const layout = CONSISTENCY_DAY_LAYOUT_FALLBACK;

  return (
    <div
      className={cn(
        'chip-surface-lg mt-2 flex min-h-38 w-full flex-1 flex-col',
        'rounded-2xl px-4 py-4',
      )}
    >
      <div className="flex justify-end">
        <div className="bg-muted size-8 animate-pulse rounded-full" />
      </div>
      <div className="mt-2 flex flex-1 items-center gap-2">
        <div
          className="grid w-full min-w-0 flex-1 gap-x-1 gap-y-2.5"
          style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: layout.totalDays }, (_, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <SkeletonDataValue heightClassName="h-2.5" widthClassName="w-3" />
              <div className="bg-muted/55 size-9 animate-pulse rounded-full" />
            </div>
          ))}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pl-3">
          <SkeletonDataValue heightClassName="h-10" widthClassName="w-12" />
          <SkeletonDataValue heightClassName="h-6" widthClassName="w-14" />
        </div>
      </div>
    </div>
  );
}

export function ActivityConsistencyContent({
  days,
  layout,
  quietHistory,
  stats,
  stripRef,
}: {
  days: ConsistencyDayCell[];
  layout: ConsistencyDayLayout;
  quietHistory: boolean;
  stats: ReturnType<typeof buildActivityConsistencyStats>;
  stripRef: RefObject<HTMLDivElement | null>;
}) {
  const activeInWindow = days.filter((day) => day.hasActivity).length;

  return (
    <Link
      href="/training"
      title="Voir l’historique d’entraînement"
      className={cn(
        'chip-surface-lg hover:border-primary/35 group mt-2 flex min-h-38 w-full flex-1 flex-col',
        'rounded-2xl px-4 py-4 transition-[border-color,background-color] duration-150 ease-out',
        'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        'active:scale-[0.988]',
      )}
    >
      <div className="flex justify-end">
        <RegularityHeaderIcon />
      </div>

      <div className="mt-2 flex flex-1 items-center gap-2">
        <div ref={stripRef} className="min-w-0 flex-1">
          <ConsistencyDayGrid columns={layout.columns} days={days} />
        </div>
        <StreakHero weeks={stats.heldWeeks} />
      </div>

      <p className="sr-only">
        {stats.heldWeeks === 1
          ? '1 semaine de suite avec au moins une activité'
          : `${stats.heldWeeks} semaines de suite avec au moins une activité`}
        {`. ${activeInWindow} jours actifs sur la fenêtre affichée.`}
        {!stats.activeThisWeek && stats.heldWeeks > 0 ? ' Semaine courante encore ouverte.' : ''}
      </p>

      {quietHistory ? <QuietHistoryFooter /> : null}
    </Link>
  );
}

export function useActivityConsistencyStats(
  activities: ActivityForConsistency[],
  loading: boolean,
  layout: ConsistencyDayLayout,
) {
  return useMemo(() => {
    const ref = loading ? LOADING_ANCHOR : new Date();
    return {
      stats: buildActivityConsistencyStats(activities, ref),
      days: buildConsistencyDayWindow(activities, ref, layout.pastDays, layout.futureDays),
    };
  }, [activities, loading, layout.pastDays, layout.futureDays]);
}

export function useActivityConsistencyLayout() {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const layout = useConsistencyDayLayout(stripRef);
  return { stripRef, layout };
}

export function isQuietActivityHistory(
  stats: ReturnType<typeof buildActivityConsistencyStats>,
  loading: boolean,
): boolean {
  return (
    !loading &&
    stats.thisWeekSessionCount === 0 &&
    stats.heldWeeks === 0 &&
    stats.programWeeks.every((week) => week.sessionCount === 0)
  );
}
