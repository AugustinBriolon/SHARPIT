'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClientGoal } from '@/lib/query/types';
import type { ThreadCoachLine } from '@/lib/training/thread/thread-coach-line';
import type { ThreadWeek } from '@/lib/training/thread/thread-model';
import { cn } from '@/lib/utils';

/** A step of zero is a held week, not a rise — say so rather than printing "+0". */
function signOf(step: number): string {
  if (step > 0) return '+';
  if (step < 0) return '−';
  return '±';
}

/**
 * The race, the sentence about this week, and the two figures that follow from it.
 *
 * Only two figures, and both are here because they change what happens next: the
 * week's load against what was prescribed says whether to hold or ease, and the
 * step from last week says whether the ramp is real. A countdown alone is not
 * actionable, which is why it is a line rather than a headline.
 */
export function ThreadGoalBanner({
  goal,
  coachLine,
  currentWeek,
  previousWeek,
}: {
  goal: ClientGoal | null;
  coachLine: ThreadCoachLine | null;
  currentWeek: ThreadWeek | null;
  previousWeek: ThreadWeek | null;
}) {
  const days = goal?.targetDate
    ? differenceInCalendarDays(new Date(goal.targetDate), new Date())
    : null;

  let countdown: string | null = null;
  if (days != null) {
    if (days === 0) countdown = 'Aujourd’hui';
    else countdown = days > 0 ? `J-${days}` : `J+${Math.abs(days)}`;
  }

  /* A week whose sessions never carried a TSS has no load to report — printing 0
     would say he did nothing on a week he trained. */
  const done = currentWeek?.doneLoadKnown ? currentWeek.doneLoad : null;
  const planned = currentWeek?.plannedLoad ?? null;

  /* Only against a week that actually recorded something — a step measured from a
     rest week reads as a collapse, and there is no decision behind that number. */
  const previousDone = previousWeek?.doneLoad ?? 0;
  const step =
    done != null && previousDone > 0
      ? Math.round(((done - previousDone) / previousDone) * 100)
      : null;

  if (!goal && !coachLine && done == null) return null;

  return (
    <section className="surface-ink rounded-analysis-lg overflow-hidden px-5 py-5 sm:px-6">
      {goal ? (
        <>
          <p className="text-ink-surface-foreground/60 text-data inline-flex items-center gap-2 text-[10px] font-semibold tracking-wide uppercase">
            <span
              className="bg-highlight dark:bg-ink-surface-foreground size-[9px] shrink-0 rounded-full"
              aria-hidden
            />
            Objectif
          </p>

          <p className="text-ink-surface-foreground mt-2 text-lg">
            {countdown ? (
              <span className="text-data text-highlight dark:text-ink-surface-foreground font-semibold">
                {countdown}
              </span>
            ) : null}
            {countdown ? (
              <span className="text-ink-surface-foreground/50" aria-hidden>
                {' · '}
              </span>
            ) : null}
            {goal.title}
          </p>

          {goal.targetDate ? (
            <p className="text-data text-ink-surface-foreground/55 mt-1 text-[11px]">
              {format(new Date(goal.targetDate), 'EEEE d MMM yyyy', { locale: fr })}
              {goal.raceFormat ? ` · ${goal.raceFormat}` : ''}
            </p>
          ) : null}
        </>
      ) : null}

      {coachLine ? (
        <p
          className={cn(
            'border-highlight text-ink-surface-foreground/85 border-l-2 pl-3 text-[13.5px] leading-relaxed',
            goal ? 'mt-4' : '',
          )}
        >
          {coachLine.text}
        </p>
      ) : null}

      {done != null ? (
        <div className="mt-4 flex items-stretch gap-4">
          <div>
            <p className="text-ink-surface-foreground/55 text-[10px] font-semibold tracking-wide uppercase">
              Charge 7 j
            </p>
            <p className="text-data text-ink-surface-foreground mt-1 text-xl font-semibold tabular-nums">
              {done}
              {planned != null && planned > 0 ? (
                <span className="text-ink-surface-foreground/50 text-sm font-normal">
                  {' '}
                  /{planned}
                </span>
              ) : null}
            </p>
          </div>

          {step != null ? (
            <>
              <span className="bg-ink-surface-foreground/15 w-px" aria-hidden />
              <div>
                <p className="text-ink-surface-foreground/55 text-[10px] font-semibold tracking-wide uppercase">
                  vs semaine passée
                </p>
                <p className="text-data text-ink-surface-foreground mt-1 text-xl font-semibold tabular-nums">
                  {signOf(step)}
                  {Math.abs(step)} %
                </p>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
