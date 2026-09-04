'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Target } from 'lucide-react';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import type { PlanGoalView } from '@/lib/plan/plan-goal';
import { MOI_OBJECTIFS_PATH } from '@/lib/moi/paths';

const GOALS_HREF = MOI_OBJECTIFS_PATH;

function GoalProgressRail({ progress }: { progress: number }) {
  return (
    <div className="mt-5">
      <div
        aria-label={`Progression ${progress} %`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="bg-ink-surface-foreground/15 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
      >
        <div
          className="bg-highlight dark:bg-ink-surface-foreground h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-data text-ink-surface-foreground/55 mt-1.5 text-[11px] tabular-nums">
        {progress} % parcouru
      </p>
    </div>
  );
}

function GoalCountdown({ value, caption }: { value: string; caption: string | null }) {
  return (
    <div className="border-ink-surface-foreground/15 shrink-0 sm:border-r sm:pr-6">
      <p className="text-data text-highlight dark:text-ink-surface-foreground text-4xl leading-none font-semibold tabular-nums">
        {value}
      </p>
      {caption ? (
        <p className="text-ink-surface-foreground/55 mt-1.5 text-[11px]">{caption}</p>
      ) : null}
    </div>
  );
}

export function PlanGoalBandSkeleton() {
  return <div className="surface-ink rounded-analysis-lg h-32 animate-pulse" aria-busy />;
}

function PlanGoalEmpty() {
  return (
    <section aria-labelledby="plan-goal" className="space-y-3">
      <h2 className="text-label" id="plan-goal">
        Objectif
      </h2>
      <InkEmptyState
        description="Sans échéance, le plan ne peut ni se hiérarchiser ni se projeter. Définis une course ou une cible mesurable pour ancrer la semaine."
        icon={Target}
        title="Aucun objectif actif"
        action={
          <Link className="explore-link" href={GOALS_HREF}>
            Définir un objectif
          </Link>
        }
      />
    </section>
  );
}

/** Date and format, the two facts that qualify the title above them. */
function GoalIdentity({ goal }: { goal: PlanGoalView }) {
  const facts = [
    goal.targetDate ? format(goal.targetDate, 'EEEE d MMMM yyyy', { locale: fr }) : null,
    goal.detail,
  ].filter(Boolean);

  return (
    <div className="min-w-0">
      <Link
        className="text-ink-surface-foreground hover:text-highlight dark:hover:text-ink-surface-foreground/80 text-lg leading-snug font-medium transition-colors"
        href={GOALS_HREF}
      >
        {goal.title}
      </Link>
      <p className="text-data text-ink-surface-foreground/55 mt-1 text-[11px]">
        {facts.join(' · ') || 'Sans échéance'}
      </p>
    </div>
  );
}

/**
 * The goal, as the page's anchor.
 *
 * A countdown carries the plan better than a title does: what changes an
 * athlete's week is how close the date is, not what the race is called.
 */
export function PlanGoalBand({ goal }: { goal: PlanGoalView | null }) {
  if (!goal) {
    return <PlanGoalEmpty />;
  }

  return (
    <section aria-labelledby="plan-goal">
      <div className="surface-ink rounded-analysis-lg px-5 py-5 sm:px-6">
        <h2
          className="text-ink-surface-foreground/55 text-[10px] font-semibold tracking-wide uppercase"
          id="plan-goal"
        >
          Objectif
        </h2>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {goal.countdown ? (
            <GoalCountdown caption={goal.countdownCaption} value={goal.countdown} />
          ) : null}

          <GoalIdentity goal={goal} />
        </div>

        {goal.progress !== null ? <GoalProgressRail progress={goal.progress} /> : null}
      </div>
    </section>
  );
}
