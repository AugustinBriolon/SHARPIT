'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClientGoal } from '@/lib/query/types';
import type { ThreadCoachLine } from '@/lib/training/thread/thread-coach-line';
import type { ThreadAdherence, ThreadWeek } from '@/lib/training/thread/thread-model';
import { cn } from '@/lib/utils';
import {
  buildGoalBannerFigures,
  buildGoalCountdown,
  shouldShowGoalBanner,
  signOf,
} from '@/components/training/thread/thread-goal-banner-helpers';

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

function GoalBannerHeader({ goal, countdown }: { goal: ClientGoal; countdown: string | null }) {
  return (
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
  );
}

function GoalBannerFigures({
  done,
  planned,
  step,
  adherence,
}: {
  done: number;
  planned: number | null;
  step: number | null;
  adherence: ThreadAdherence;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-stretch gap-x-5 gap-y-3">
      <Figure label="Charge 7 j" suffix={planned ? `/${planned}` : null} value={String(done)} />

      {step !== null ? (
        <>
          <Rule />
          <Figure label="vs semaine passée" value={`${signOf(step)}${Math.abs(step)} %`} />
        </>
      ) : null}

      {adherence.ratio !== null ? (
        <>
          <Rule />
          <Figure label="Séances tenues" value={`${adherence.completed}/${adherence.prescribed}`} />
        </>
      ) : null}
    </div>
  );
}

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
  const countdown = goal?.targetDate ? buildGoalCountdown(goal.targetDate) : null;

  const { done, planned, step } = buildGoalBannerFigures({
    currentWeek,
    previousWeek,
  });

  if (!shouldShowGoalBanner({ goal, coachLine, done })) {
    return null;
  }

  return (
    <section className="surface-ink rounded-analysis-lg overflow-hidden px-5 py-5 sm:px-6 lg:flex lg:items-center lg:justify-between lg:gap-8">
      <div className="min-w-0 lg:max-w-[46ch]">
        {goal ? <GoalBannerHeader countdown={countdown} goal={goal} /> : null}

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

      {done !== null ? (
        <GoalBannerFigures adherence={adherence} done={done} planned={planned} step={step} />
      ) : null}
    </section>
  );
}
