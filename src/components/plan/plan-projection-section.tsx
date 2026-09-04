'use client';

import Link from 'next/link';
import { format, startOfWeek } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useWeeklyCoachingBriefViewModel } from '@/hooks/use-data';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import type { WeeklyBriefLoad } from '@/core/presentation/weekly-coaching-brief-view-model';
import { formatTrainingLoad, type DisplayMode } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';

const WEEK_OPTS = { weekStartsOn: 1 as const };
const PROJECTION_HORIZON = 7;
const BRIEF_HREF = '/training/weekly-review';
/** Two is a decision aid. A full list is a document, and it stops being read. */
const MAX_CHANGE_DRIVERS = 2;
const UNAVAILABLE_FALLBACK =
  'La projection demande un historique de charge et de récupération continu. Enregistre quelques séances pour qu’elle devienne fiable.';

/**
 * Whether the plan overshoots what the athlete can currently absorb.
 *
 * Planned load alone says nothing: 320 is a light week for one athlete and a
 * dig for another. Beside the tolerated ceiling it becomes a decision.
 */
function LoadCeiling({ load, mode }: { load: WeeklyBriefLoad; mode: DisplayMode }) {
  // Without a prescribed load there is nothing to compare: "demande 0 pour un
  // plafond de 286" reads as a measurement when it only means "rien de posé".
  if (load.toleratedCeiling === null || load.plannedLoad <= 0) {
    return null;
  }
  const over = load.plannedLoad > load.toleratedCeiling;

  return (
    <p className="text-muted-foreground text-xs leading-relaxed">
      Cette semaine demande{' '}
      <span className="text-instrument text-foreground font-medium">
        {formatTrainingLoad(load.plannedLoad, mode)}
      </span>{' '}
      pour un plafond toléré de{' '}
      <span className="text-instrument text-foreground font-medium">
        {formatTrainingLoad(load.toleratedCeiling, mode)}
      </span>
      {over ? '. Le plan passe au-dessus : alléger une séance dure protège la suite.' : '.'}
    </p>
  );
}

function ProjectionCaution({
  caution,
}: {
  caution: NonNullable<ProjectedAthleteCardViewModel['caution']>;
}) {
  return (
    <div className="annotation-clinical space-y-1">
      <p className="text-foreground text-xs font-medium">{caution.label}</p>
      <p className="text-muted-foreground text-xs leading-relaxed">{caution.body}</p>
    </div>
  );
}

function ChangeDrivers({ drivers }: { drivers: readonly string[] }) {
  if (drivers.length === 0) {
    return null;
  }
  return (
    <div className="space-y-1.5">
      <p className="text-label">Ce qui ferait bouger le plan</p>
      <ul className="text-muted-foreground space-y-1 text-xs leading-relaxed">
        {drivers.slice(0, MAX_CHANGE_DRIVERS).map((driver) => (
          <li key={driver} className="before:text-analysis-border before:mr-2 before:content-['-']">
            {driver}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Section chrome stays put while the projection resolves. */
export function PlanProjectionSectionSkeleton() {
  return (
    <section aria-labelledby="plan-projection" className="space-y-3">
      <ProjectionHeader />
      <div className="analysis-panel-alt rounded-analysis-lg h-24 animate-pulse" aria-busy />
    </section>
  );
}

function ProjectionUnavailable({ message }: { message: string }) {
  return (
    <section aria-labelledby="plan-projection" className="space-y-3">
      <ProjectionHeader />
      <InkEmptyState
        description={message}
        icon={TrendingUp}
        title="Projection indisponible"
        compact
      />
    </section>
  );
}

function ProjectionHeader() {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-section-title" id="plan-projection">
        Projection
      </h2>
      <span className="text-label shrink-0">{PROJECTION_HORIZON} jours</span>
    </div>
  );
}

function ProjectionReading({
  brief,
  mode,
  vm,
}: {
  brief: ReturnType<typeof useWeeklyCoachingBriefViewModel>['data'];
  mode: DisplayMode;
  vm: ProjectedAthleteCardViewModel;
}) {
  return (
    <div className="analysis-panel rounded-analysis-lg space-y-3 px-4 py-4">
      <p className="text-foreground text-sm leading-relaxed">{vm.synthesisSentence}</p>

      {brief?.load ? <LoadCeiling load={brief.load} mode={mode} /> : null}
      {vm.caution ? <ProjectionCaution caution={vm.caution} /> : null}
      {brief?.whatWouldChange ? <ChangeDrivers drivers={brief.whatWouldChange} /> : null}

      <Link className="explore-link" href={BRIEF_HREF}>
        Bilan hebdo
      </Link>
    </div>
  );
}

/**
 * What holding this plan does to the athlete, and what would change it.
 *
 * A plan is only readable against its expected effect: the list of sessions
 * says what to do, the projection says whether doing it is a good idea.
 */
export function PlanProjectionSection({ now }: { now: Date }) {
  const { mode } = useDisplayMode();
  const projection = useProjectedAthleteViewModel(PROJECTION_HORIZON);
  const brief = useWeeklyCoachingBriefViewModel(format(startOfWeek(now, WEEK_OPTS), 'yyyy-MM-dd'));

  const vm = projection.data;

  if (!vm) {
    return projection.isPending ? (
      <PlanProjectionSectionSkeleton />
    ) : (
      <ProjectionUnavailable message={UNAVAILABLE_FALLBACK} />
    );
  }

  if (!vm.visible) {
    return <ProjectionUnavailable message={vm.emptyStateMessage ?? UNAVAILABLE_FALLBACK} />;
  }

  return (
    <section aria-labelledby="plan-projection" className="space-y-3">
      <ProjectionHeader />
      <ProjectionReading brief={brief.data} mode={mode} vm={vm} />
    </section>
  );
}
