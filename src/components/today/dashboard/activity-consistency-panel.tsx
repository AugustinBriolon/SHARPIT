'use client';

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
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
/** Visual bar column height; columns stay thumb-tall for scrubbing. */
const STRIP_HEIGHT_PX = 64;
const STRIP_HIT_MIN_PX = 44;

function Reading({
  value,
  unit,
  caption,
  emphasis = 'primary',
}: {
  value: string;
  unit: string;
  caption: string;
  emphasis?: 'primary' | 'secondary';
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-data font-semibold tabular-nums',
            emphasis === 'primary' && 'text-foreground text-2xl',
            emphasis === 'secondary' && 'text-foreground/90 text-xl',
          )}
        >
          {value}
        </span>
        <span className="text-muted-foreground text-xs">{unit}</span>
      </p>
      <p className="text-muted-foreground mt-0.5 text-[0.6875rem] leading-snug">{caption}</p>
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

function weekReadout(week: ProgramWeek): string {
  const hint = weekHint(week);
  return `${hint.title} · ${hint.lines.join(' · ')}`;
}

/**
 * Decorative scrub strip inside the card Link — no nested buttons.
 * Hover updates the persistent readout; click anywhere still follows /training.
 */
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
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[0.6875rem] leading-none">Séances / semaine</p>
      <ul className="sr-only">
        {weeks.map((week) => (
          <li key={week.weekStart}>{weekLabel(week)}</li>
        ))}
      </ul>
      <div
        className="flex w-full items-stretch gap-1.5"
        style={{ minHeight: Math.max(STRIP_HEIGHT_PX, STRIP_HIT_MIN_PX) }}
        aria-hidden
        onMouseLeave={clearProbe}
      >
        {weeks.map((week) => {
          const filled = week.sessionCount > 0;
          const active = shown?.weekStart === week.weekStart;
          const barPct = programWeekBarPct(week.sessionCount, peak);
          return (
            <div
              key={week.weekStart}
              className={cn(
                'flex min-h-11 min-w-0 flex-1 flex-col justify-end rounded-[3px]',
                'transition-opacity duration-150',
                scrubbing && !active && 'opacity-40',
              )}
              onMouseEnter={(event) => probe(week, event.clientX, event.clientY)}
              onMouseMove={(event) => probe(week, event.clientX, event.clientY)}
            >
              <span
                style={{ height: `${barPct}%`, minHeight: filled ? undefined : 6 }}
                className={cn(
                  'w-full rounded-[3px]',
                  filled && 'bg-primary border-0',
                  !filled && !week.isCurrent && 'bg-muted-foreground/20 border-0',
                  week.isCurrent &&
                    !filled &&
                    'border-primary/40 border border-dashed bg-transparent',
                )}
              />
            </div>
          );
        })}
      </div>
      {shown ? (
        <p className="text-muted-foreground text-data text-[0.6875rem] tabular-nums">
          {weekReadout(shown)}
        </p>
      ) : null}
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

  const quietHistory =
    !loading &&
    stats.thisWeekSessionCount === 0 &&
    stats.heldWeeks === 0 &&
    stats.programWeeks.every((week) => week.sessionCount === 0);

  return (
    <section className={cn('flex h-full min-w-0 flex-col px-0.5', className)}>
      <h2 className="text-label">Régularité</h2>
      {loading ? (
        <div
          className={cn(
            'chip-surface-lg mt-2 flex min-h-0 w-full flex-1 flex-col gap-2.5',
            'rounded-2xl px-3.5 py-3',
          )}
        >
          <div className="flex justify-between gap-6">
            <SkeletonDataValue heightClassName="h-7" widthClassName="w-16" />
            <SkeletonDataValue heightClassName="h-7" widthClassName="w-20" />
          </div>
          <div className="space-y-1.5">
            <div className="bg-muted/40 h-3 w-24 animate-pulse rounded" />
            <div
              className="flex w-full items-end gap-1.5"
              style={{ minHeight: Math.max(STRIP_HEIGHT_PX, STRIP_HIT_MIN_PX) }}
              aria-hidden
            >
              {Array.from({ length: PROGRAM_WEEK_COUNT }, (_, index) => (
                <div key={index} className="flex min-h-11 min-w-0 flex-1 flex-col justify-end">
                  <div
                    className="bg-muted/60 w-full animate-pulse rounded-[3px]"
                    style={{ height: `${40 + (index % 4) * 12}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Link
          href="/training"
          title="Voir l’historique d’entraînement"
          className={cn(
            'chip-surface-lg hover:border-primary/35 group mt-2 flex min-h-0 w-full flex-1 flex-col gap-2.5',
            'rounded-2xl px-3.5 py-3 transition-[border-color,background-color] duration-150 ease-out',
            'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 justify-between gap-6">
              <Reading
                emphasis="primary"
                unit={stats.thisWeekSessionCount === 1 ? 'séance' : 'séances'}
                value={String(stats.thisWeekSessionCount)}
                caption={
                  stats.activeThisWeek ? 'faites cette semaine' : 'cette semaine encore ouverte'
                }
              />
              <Reading
                caption={stats.activeThisWeek ? 'de suite' : 'celle-ci encore ouverte'}
                emphasis="secondary"
                unit={stats.heldWeeks === 1 ? 'semaine tenue' : 'semaines tenues'}
                value={String(stats.heldWeeks)}
              />
            </div>
            <span
              className="text-muted-foreground/70 text-data mt-1 shrink-0 text-xs tracking-wider transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </div>

          <ProgramWeekStrip weeks={stats.programWeeks} />

          {quietHistory ? (
            <div className="border-border/50 flex items-end justify-between gap-3 border-t pt-2.5">
              <p className="text-muted-foreground text-xs leading-snug">Voir l’historique</p>
              <span className="text-primary text-xs font-medium">→</span>
            </div>
          ) : null}
        </Link>
      )}
    </section>
  );
}
