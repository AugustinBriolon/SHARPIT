import Link from 'next/link';
import type { PlanPhase } from '@prisma/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Target } from 'lucide-react';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { DestinationAdvancementNote } from '@/components/plan/hub/destination-advancement-note';
import type { MacroPhaseRail } from '@/lib/plan/trajectory/plan-macro-rail';
import type { PlanGoalView } from '@/lib/plan/trajectory/plan-goal';
import { MOI_OBJECTIFS_PATH } from '@/lib/moi/paths';
import { cn } from '@/lib/utils';

/** Compact rail labels — full names overflow on 5-column mobile grids. */
const PHASE_RAIL_SHORT: Record<PlanPhase, string> = {
  BASE: 'Base',
  BUILD: 'Dév.',
  PEAK: 'Spéc.',
  TAPER: 'Affût.',
  RACE: 'Course',
};

function GoalProgressRail({ progress }: { progress: number }) {
  return (
    <div className="mt-4">
      <div
        aria-label={`Progression ${progress} %`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="bg-ink-surface-foreground/15 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
      >
        <div
          className="bg-highlight dark:bg-ink-surface-foreground h-full rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function MacroRail({ rail }: { rail: MacroPhaseRail }) {
  return (
    <ol
      className="mt-5 grid gap-x-1.5 gap-y-2"
      style={{ gridTemplateColumns: `repeat(${rail.runs.length}, minmax(0, 1fr))` }}
    >
      {rail.runs.map((run, index) => (
        <li
          key={`${run.phase}-${index}`}
          aria-current={run.current ? 'step' : undefined}
          aria-label={run.label}
          title={run.label}
          className={cn(
            'min-w-0 overflow-hidden border-t-2 pt-1.5 text-[10px] leading-tight',
            run.current
              ? 'border-highlight text-ink-surface-foreground dark:border-ink-surface-foreground font-semibold'
              : 'border-ink-surface-foreground/25 text-ink-surface-foreground/55',
          )}
        >
          <span className="block truncate sm:hidden">{PHASE_RAIL_SHORT[run.phase]}</span>
          <span className="hidden truncate sm:block">{run.label}</span>
        </li>
      ))}
    </ol>
  );
}

function railCaption(rail: MacroPhaseRail): { week: string; aside: string | null } {
  const week = `Semaine ${rail.weekInRun} du bloc`;
  if (rail.isDeload) {
    return { week, aside: 'Récupération' };
  }
  return { week, aside: rail.focus };
}

function DestinationGoal({ goal }: { goal: PlanGoalView }) {
  const facts = [
    goal.targetDate ? format(goal.targetDate, 'd MMMM yyyy', { locale: fr }) : null,
    goal.detail,
  ].filter(Boolean);

  return (
    <div className="mt-3 flex items-start gap-4">
      {goal.countdown ? (
        <p className="text-data text-highlight dark:text-ink-surface-foreground shrink-0 text-4xl leading-none font-semibold tabular-nums">
          {goal.countdown}
        </p>
      ) : null}
      <div className="min-w-0">
        <h2
          className="text-ink-surface-foreground text-lg leading-snug font-medium"
          id="plan-destination"
        >
          <Link
            className="hover:text-highlight dark:hover:text-ink-surface-foreground/80"
            href={MOI_OBJECTIFS_PATH}
          >
            {goal.title}
          </Link>
        </h2>
        {facts.length > 0 ? (
          <p className="text-data text-ink-surface-foreground/55 mt-1 text-[11px]">
            {facts.join(' · ')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DestinationRail({ rail }: { rail: MacroPhaseRail }) {
  const caption = railCaption(rail);
  return (
    <>
      <MacroRail rail={rail} />
      <p className="text-highlight dark:text-ink-surface-foreground mt-2 flex flex-col gap-1 text-[11px] leading-snug sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <span className="shrink-0">{caption.week}</span>
        {caption.aside ? (
          <span className="min-w-0 text-pretty sm:text-right">{caption.aside}</span>
        ) : null}
      </p>
    </>
  );
}

export function PlanDestinationPlateSkeleton() {
  return <div className="surface-ink rounded-analysis-lg h-40 animate-pulse" aria-busy />;
}

export function PlanDestinationPlate({
  goal,
  rail,
}: {
  goal: PlanGoalView | null;
  rail: MacroPhaseRail | null;
}) {
  if (!goal) {
    return (
      <InkEmptyState
        description="Sans échéance, le plan ne peut ni se hiérarchiser ni se projeter. Définis une course ou une cible mesurable."
        icon={Target}
        title="Aucun objectif actif"
        action={
          <Link className="explore-link" href={MOI_OBJECTIFS_PATH}>
            Définir un objectif
          </Link>
        }
      />
    );
  }

  return (
    <section aria-labelledby="plan-destination">
      <div className="surface-ink rounded-analysis-lg px-5 py-5">
        <p className="text-label text-ink-surface-foreground/55">Objectif</p>
        <DestinationGoal goal={goal} />
        {goal.progress !== null ? <GoalProgressRail progress={goal.progress} /> : null}
        {rail ? <DestinationRail rail={rail} /> : null}
        <DestinationAdvancementNote />
      </div>
    </section>
  );
}
