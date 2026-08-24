'use client';

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { CursorFollowHint, type CursorHintState } from '@/components/ui/cursor-follow-hint';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import {
  type ActivityForConsistency,
  buildActivityConsistencyStats,
  PROGRAM_WEEK_COUNT,
  programWeekBarPct,
  type ProgramWeek,
} from '@/lib/activity/list/activity-consistency';
import { cn } from '@/lib/utils';

const LOADING_ANCHOR = new Date('2026-01-01T12:00:00');
const STRIP_HEIGHT_PX = 64;

function Reading({ value, unit, caption }: { value: string; unit: string; caption: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-baseline gap-1.5">
        <span className="text-data text-foreground text-2xl font-semibold tabular-nums">
          {value}
        </span>
        <span className="text-muted-foreground text-xs">{unit}</span>
      </p>
      <p className="text-muted-foreground mt-0.5 text-[11px]">{caption}</p>
    </div>
  );
}

function weekLabel(week: ProgramWeek): string {
  const start = parseISO(week.weekStart);
  const range = format(start, 'd MMM', { locale: fr });
  if (week.sessionCount === 0) {
    return week.isCurrent
      ? `Semaine du ${range}, encore ouverte`
      : `Semaine du ${range}, aucune séance`;
  }
  const sessions = week.sessionCount === 1 ? '1 séance' : `${week.sessionCount} séances`;
  return `Semaine du ${range}, ${sessions}`;
}

function weekHint(week: ProgramWeek): { title: string; lines: string[] } {
  const start = parseISO(week.weekStart);
  const range = format(start, 'd MMM', { locale: fr });
  const title = `Semaine du ${range}`;
  if (week.sessionCount === 0) {
    return { title, lines: [week.isCurrent ? 'Encore ouverte' : 'Aucune séance'] };
  }
  const sessions = week.sessionCount === 1 ? '1 séance' : `${week.sessionCount} séances`;
  return { title, lines: [sessions] };
}

function ProgramWeekStrip({ weeks }: { weeks: ProgramWeek[] }) {
  const [hotKey, setHotKey] = useState<string | null>(null);
  const [hint, setHint] = useState<CursorHintState>(null);
  const peak = Math.max(...weeks.map((week) => week.sessionCount), 0);
  const shown =
    weeks.find((week) => week.weekStart === hotKey) ??
    weeks.find((week) => week.isCurrent) ??
    weeks.at(-1);
  const scrubbing = hotKey != null;

  const probe = (week: ProgramWeek, x: number, y: number) => {
    setHotKey(week.weekStart);
    setHint({ x, y, ...weekHint(week) });
  };
  const clearProbe = () => {
    setHotKey(null);
    setHint(null);
  };

  return (
    <div>
      <div
        aria-label="Huit dernières semaines du programme"
        className="flex w-full items-end gap-1.5"
        role="group"
        style={{ height: STRIP_HEIGHT_PX }}
        onMouseLeave={clearProbe}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            clearProbe();
          }
        }}
      >
        {weeks.map((week) => {
          const filled = week.sessionCount > 0;
          const active = shown?.weekStart === week.weekStart;
          return (
            <button
              key={week.weekStart}
              aria-label={weekLabel(week)}
              aria-pressed={active}
              style={{ height: `${programWeekBarPct(week.sessionCount, peak)}%` }}
              type="button"
              className={cn(
                'min-w-0 flex-1 cursor-pointer rounded-[3px] p-0 transition-opacity duration-150',
                'focus-visible:ring-primary/35 focus-visible:ring-1 focus-visible:outline-hidden',
                filled && 'bg-primary border-0',
                !filled && !week.isCurrent && 'bg-muted-foreground/20 border-0',
                week.isCurrent &&
                  !filled &&
                  'border-primary/40 border border-dashed bg-transparent',
                scrubbing && !active && 'opacity-40',
              )}
              onMouseEnter={(event) => probe(week, event.clientX, event.clientY)}
              onMouseMove={(event) => probe(week, event.clientX, event.clientY)}
              onFocus={(event) => {
                const box = event.currentTarget.getBoundingClientRect();
                probe(week, box.left + box.width / 2, box.top);
              }}
            />
          );
        })}
      </div>
      <CursorFollowHint hint={hint} />
    </div>
  );
}

export function ActivityConsistencyPanel({
  activities,
  className,
  loading = false,
}: {
  activities: ActivityForConsistency[];
  className?: string;
  loading?: boolean;
}) {
  const stats = useMemo(
    () => buildActivityConsistencyStats(activities, loading ? LOADING_ANCHOR : new Date()),
    [activities, loading],
  );

  return (
    <section className={cn('flex h-full min-w-0 flex-col px-0.5', className)}>
      <h2 className="text-label">Régularité</h2>
      <div
        className={cn(
          'chip-surface-lg mt-2 flex min-h-0 w-full flex-1 flex-col gap-3',
          'rounded-2xl px-3.5 py-3',
        )}
      >
        {loading ? (
          <div className="flex justify-between gap-6">
            <SkeletonDataValue heightClassName="h-7" widthClassName="w-16" />
            <SkeletonDataValue heightClassName="h-7" widthClassName="w-20" />
          </div>
        ) : (
          <div className="flex justify-between gap-6">
            <Reading
              unit={stats.thisWeekSessionCount === 1 ? 'séance' : 'séances'}
              value={String(stats.thisWeekSessionCount)}
              caption={
                stats.activeThisWeek ? 'faites cette semaine' : 'cette semaine encore ouverte'
              }
            />
            <Reading
              caption={stats.activeThisWeek ? 'de suite' : 'celle-ci encore ouverte'}
              unit={stats.heldWeeks === 1 ? 'semaine tenue' : 'semaines tenues'}
              value={String(stats.heldWeeks)}
            />
          </div>
        )}

        {loading ? (
          <div
            className="flex w-full items-end gap-1.5"
            style={{ height: STRIP_HEIGHT_PX }}
            aria-hidden
          >
            {Array.from({ length: PROGRAM_WEEK_COUNT }, (_, index) => (
              <div
                key={index}
                className="bg-muted/60 min-w-0 flex-1 animate-pulse rounded-[3px]"
                style={{ height: `${40 + (index % 4) * 12}%` }}
              />
            ))}
          </div>
        ) : (
          <ProgramWeekStrip weeks={stats.programWeeks} />
        )}
      </div>
    </section>
  );
}
