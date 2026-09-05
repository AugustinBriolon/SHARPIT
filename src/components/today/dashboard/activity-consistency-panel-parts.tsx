'use client';

import { Activity } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  TodayInstrumentCard,
  TodayInstrumentCardSkeleton,
} from '@/components/today/dashboard/today-instrument-card';
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
  // Fixed anchor — never `new Date()` during prerender (blocking-prerender-current-time-client).
  const days = buildConsistencyDayWindow([], LOADING_ANCHOR, layout.pastDays, layout.futureDays);

  return (
    <TodayInstrumentCardSkeleton className="min-h-38 flex-1" title="Régularité">
      <div className="mt-3 flex flex-1 items-center gap-2">
        <div className="min-w-0 flex-1">
          <ConsistencyDayGrid columns={layout.columns} days={days} />
        </div>
        <div className="flex shrink-0 flex-col items-end justify-center self-center pl-2 text-right sm:pl-3">
          <span className="text-data text-muted-foreground text-[2.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
            —
          </span>
          <span className="text-muted-foreground mt-1 text-[12px] leading-tight">
            semaines
            <br />
            de suite
          </span>
        </div>
      </div>
    </TodayInstrumentCardSkeleton>
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
    <TodayInstrumentCard
      className="min-h-38 flex-1 active:scale-[0.988]"
      href="/plan/semaine"
      icon={<Activity className="size-3.5" strokeWidth={2.25} />}
      title="Régularité"
      titleAttr="Voir l’historique d’entraînement"
    >
      <div className="mt-3 flex flex-1 items-center gap-2">
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
    </TodayInstrumentCard>
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
