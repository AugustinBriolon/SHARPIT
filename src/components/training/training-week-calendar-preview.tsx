'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { addDays, eachDayOfInterval, format, isSameDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarRange } from 'lucide-react';
import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { LinkButton } from '@/components/ui/link-button';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { CalendarDay } from '@/lib/calendar';
import { groupPlannedSessions } from '@/lib/brick-sessions';
import { activityTypeLabels } from '@/lib/format';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { intensityAccent } from '@/lib/sessions';
import { cn } from '@/lib/utils';

const NEUTRAL_ACCENT = 'var(--color-signal-neutral)';
const MAX_ITEMS = 2;
const DAYS_BEFORE = 2;
const DAYS_AFTER = 2;

function buildCalendarWindow(
  anchor: Date,
  activities: ClientActivity[],
  planned: ClientPlannedSession[],
): CalendarDay[] {
  const today = new Date();
  const start = subDays(anchor, DAYS_BEFORE);
  const end = addDays(anchor, DAYS_AFTER);
  const days = eachDayOfInterval({ start, end });

  return days.map((date) => ({
    date,
    inMonth: true,
    isToday: isSameDay(date, today),
    activities: activities.filter((a) => isSameDay(new Date(a.date), date)),
    planned: planned.filter((p) => isSameDay(new Date(p.date), date)),
  }));
}

function windowRangeLabel(rangeStart: Date, rangeEnd: Date): string {
  const sameMonth = rangeStart.getMonth() === rangeEnd.getMonth();
  if (sameMonth) {
    return `${format(rangeStart, 'd', { locale: fr })}–${format(rangeEnd, 'd MMM yyyy', { locale: fr })}`;
  }
  return `${format(rangeStart, 'd MMM', { locale: fr })} – ${format(rangeEnd, 'd MMM yyyy', { locale: fr })}`;
}

function PreviewActivityChip({ activity }: { activity: ClientActivity }) {
  return (
    <Link
      className="border-analysis-border bg-analysis-surface-alt/70 hover:border-primary/40 text-foreground flex items-center gap-1 truncate rounded-[6px] border px-1.5 py-0.5 text-[10px] font-medium"
      href={`/training/${activity.id}`}
      title={activity.title ?? activityTypeLabels[activity.type]}
    >
      <ActivityTypeIndicator type={activity.type} variant="code" />
      <span className="truncate">{activity.title ?? activityTypeLabels[activity.type]}</span>
    </Link>
  );
}

function PreviewPlannedChip({ session }: { session: ClientPlannedSession }) {
  const accent = session.intensity ? intensityAccent[session.intensity] : NEUTRAL_ACCENT;
  const label = session.title ?? activityTypeLabels[session.type];

  return (
    <div
      title={label}
      className={cn(
        'border-analysis-border bg-analysis-surface-alt/50 flex items-center gap-1 truncate rounded-[6px] border border-dashed px-1.5 py-0.5 text-[10px]',
      )}
    >
      <ActivityTypeIndicator type={session.type} variant="code" />
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      <span className="text-muted-foreground truncate">{label}</span>
    </div>
  );
}

function PreviewDayCell({
  cell,
  linkedActivityIds,
  dayLabel,
}: {
  cell: CalendarDay;
  linkedActivityIds: Set<string>;
  dayLabel: string;
}) {
  const items = useMemo(() => {
    const activities = cell.activities.filter((activity) => !linkedActivityIds.has(activity.id));
    const planned = groupPlannedSessions(cell.planned).flatMap((item) =>
      item.kind === 'single' ? [item.session] : item.sessions,
    );
    return { activities, planned };
  }, [cell.activities, cell.planned, linkedActivityIds]);

  const totalCount = items.activities.length + items.planned.length;
  const visibleActivities = items.activities.slice(0, MAX_ITEMS);
  const remainingSlots = Math.max(0, MAX_ITEMS - visibleActivities.length);
  const visiblePlanned = items.planned.slice(0, remainingSlots);
  const hiddenCount = totalCount - visibleActivities.length - visiblePlanned.length;

  return (
    <div
      className={cn(
        'border-analysis-border/60 rounded-analysis flex min-h-24 min-w-0 flex-col border p-1.5',
        cell.isToday && 'bg-primary/5 ring-primary/15 ring-1',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <span className="text-muted-foreground text-[10px] font-medium uppercase">{dayLabel}</span>
        <span
          className={cn(
            'text-data text-xs font-medium tabular-nums',
            cell.isToday ? 'text-primary' : 'text-foreground',
          )}
        >
          {cell.date.getDate()}
        </span>
      </div>
      <div className="space-y-1">
        {visibleActivities.map((activity) => (
          <PreviewActivityChip key={activity.id} activity={activity} />
        ))}
        {visiblePlanned.map((session) => (
          <PreviewPlannedChip key={session.id} session={session} />
        ))}
        {hiddenCount > 0 ? (
          <p className="text-muted-foreground px-0.5 text-[10px]">
            +{hiddenCount} autre{hiddenCount > 1 ? 's' : ''}
          </p>
        ) : null}
        {totalCount === 0 ? (
          <p className="text-muted-foreground px-0.5 text-[10px]">Repos</p>
        ) : null}
      </div>
    </div>
  );
}

export function TrainingWeekCalendarPreview({
  activities,
  className,
  loading = false,
  plannedSessions,
}: {
  activities: ClientActivity[];
  className?: string;
  loading?: boolean;
  plannedSessions: ClientPlannedSession[];
}) {
  const today = new Date();
  const rangeStart = subDays(today, DAYS_BEFORE);
  const rangeEnd = addDays(today, DAYS_AFTER);
  const windowDays = useMemo(
    () => buildCalendarWindow(today, activities, plannedSessions),
    [activities, plannedSessions],
  );
  const linkedActivityIds = useMemo(
    () =>
      new Set(
        plannedSessions
          .map((session) => session.activityId)
          .filter((id): id is string => Boolean(id)),
      ),
    [plannedSessions],
  );

  const plannedInWindow = windowDays.reduce((sum, day) => sum + day.planned.length, 0);
  const doneInWindow = windowDays.reduce((sum, day) => sum + day.activities.length, 0);

  return (
    <section
      className={cn(
        'analysis-panel rounded-analysis-lg flex h-fit w-full flex-col px-4 py-4 sm:px-5 sm:py-5',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <EyebrowLabel variant="dashboard">Autour d&apos;aujourd&apos;hui</EyebrowLabel>
          {loading ? (
            <div className="mt-1.5">
              <SkeletonDataValue heightClassName="h-3" widthClassName="w-44" />
            </div>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-[11px] capitalize">
              {windowRangeLabel(rangeStart, rangeEnd)}
              {' · '}
              {plannedInWindow} planifiée{plannedInWindow > 1 ? 's' : ''}
              {' · '}
              {doneInWindow} réalisée{doneInWindow > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {windowDays.map((cell) =>
          loading ? (
            <div
              key={format(cell.date, 'yyyy-MM-dd')}
              className={cn(
                'border-analysis-border/60 rounded-analysis flex min-h-24 min-w-0 flex-col border p-1.5',
                cell.isToday && 'bg-primary/5 ring-primary/15 ring-1',
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-[10px] font-medium uppercase">
                  {format(cell.date, 'EEE', { locale: fr })}
                </span>
                <span
                  className={cn(
                    'text-data text-xs font-medium tabular-nums',
                    cell.isToday ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-1.5 pt-0.5">
                <SkeletonDataValue heightClassName="h-4" widthClassName="w-full" />
                <SkeletonDataValue heightClassName="h-4" widthClassName="w-16" />
              </div>
            </div>
          ) : (
            <PreviewDayCell
              key={format(cell.date, 'yyyy-MM-dd')}
              cell={cell}
              dayLabel={format(cell.date, 'EEE', { locale: fr })}
              linkedActivityIds={linkedActivityIds}
            />
          ),
        )}
      </div>

      <div className="mt-4 flex justify-end border-t pt-3">
        <LinkButton href="/training/calendar" size="sm" variant="outline">
          <CalendarRange data-icon="inline-start" />
          Ouvrir le calendrier
        </LinkButton>
      </div>
    </section>
  );
}
