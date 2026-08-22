'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClientGoal } from '@/lib/query/types';
import type { ThreadCoachLine } from '@/lib/training/thread/thread-coach-line';
import type { ThreadAdherence, ThreadWeek } from '@/lib/training/thread/thread-model';
import { cn } from '@/lib/utils';

function Rule() {
  return <span className="bg-ink-surface-foreground/15 w-px self-stretch" aria-hidden />;
}

function Figure({
  label,
  value,
  suffix = null,
}: {
  label: string;
  value: string;
  suffix?: string | null;
}) {
  return (
    <div>
      <p className="text-ink-surface-foreground/55 text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="text-data text-ink-surface-foreground mt-1 text-xl font-semibold tabular-nums">
        {value}
        {suffix ? (
          <span className="text-ink-surface-foreground/50 text-sm font-normal"> {suffix}</span>
        ) : null}
      </p>
    </div>
  );
}

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
  adherence,
}: {
  goal: ClientGoal | null;
  coachLine: ThreadCoachLine | null;
  currentWeek: ThreadWeek | null;
  previousWeek: ThreadWeek | null;
  adherence: ThreadAdherence;
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
    <section className="surface-ink rounded-analysis-lg overflow-hidden px-5 py-5 sm:px-6 lg:flex lg:items-center lg:justify-between lg:gap-8">
      <div className="min-w-0 lg:max-w-[46ch]">
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
      </div>

      <div className="mt-4 flex flex-wrap items-stretch gap-x-5 gap-y-3">
        {done != null ? (
          <Figure label="Charge 7 j" suffix={planned ? `/${planned}` : null} value={String(done)} />
        ) : null}

        {step != null ? (
          <>
            <Rule />
            <Figure label="vs semaine passée" value={`${signOf(step)}${Math.abs(step)} %`} />
          </>
        ) : null}

        {adherence.ratio != null ? (
          <>
            <Rule />
            <Figure
              label="Séances tenues"
              value={`${adherence.completed}/${adherence.prescribed}`}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
