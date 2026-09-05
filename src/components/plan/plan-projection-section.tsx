'use client';

import Link from 'next/link';
import { format, startOfWeek } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useWeeklyCoachingBriefViewModel } from '@/hooks/use-data';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import type { ProjectedAthleteCardViewModel } from '@/core/presentation/projected-athlete-view-model';
import type { WeeklyBriefLoad } from '@/core/presentation/weekly-coaching-brief-view-model';
import { athleteVisibleCopy } from '@/lib/plan/athlete-visible-copy';
import { briefHubLine } from '@/lib/plan/plan-brief-line';
import { formatTrainingLoad, isExpertMode, type DisplayMode } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';

const WEEK_OPTS = { weekStartsOn: 1 as const };
const PROJECTION_HORIZON = 7;
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
  expert,
}: {
  caution: NonNullable<ProjectedAthleteCardViewModel['caution']>;
  expert: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="chip-surface text-data rounded-analysis inline-flex px-2.5 py-1 text-xs font-medium">
        {athleteVisibleCopy(caution.label)}
      </p>
      {expert ? (
        <p className="text-muted-foreground text-sm leading-relaxed">{caution.body}</p>
      ) : null}
    </div>
  );
}

/** Section chrome stays put while the projection resolves. */
export function PlanProjectionSectionSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <section aria-labelledby="plan-projection" className="space-y-3">
      <ProjectionHeader embedded={embedded} />
      <div className="analysis-panel-alt rounded-analysis-lg h-24 animate-pulse" aria-busy />
    </section>
  );
}

function ProjectionUnavailable({
  message,
  embedded = false,
}: {
  message: string;
  embedded?: boolean;
}) {
  return (
    <section aria-labelledby="plan-projection" className="space-y-3">
      <ProjectionHeader embedded={embedded} />
      <InkEmptyState
        description={message}
        icon={TrendingUp}
        title="Projection indisponible"
        compact
      />
    </section>
  );
}

function ProjectionHeader({ embedded }: { embedded?: boolean }) {
  if (embedded) {
    return (
      <span className="sr-only" id="plan-projection">
        Projection
      </span>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-section-title" id="plan-projection">
        Projection
      </h2>
      <Link className="explore-link shrink-0" href="/plan/semaine">
        {PROJECTION_HORIZON} jours
      </Link>
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
  const expert = isExpertMode(mode);
  const bilan = briefHubLine(brief);
  return (
    <div className="analysis-panel rounded-analysis-lg space-y-3 px-4 py-4">
      <p className="text-section-title leading-snug text-pretty">{vm.synthesisSentence}</p>
      {expert && brief?.load ? <LoadCeiling load={brief.load} mode={mode} /> : null}
      {vm.caution ? <ProjectionCaution caution={vm.caution} expert={expert} /> : null}
      <Link className="explore-link" href="/plan/bilan">
        {bilan ?? 'Voir le bilan'}
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
export function PlanProjectionSection({
  now,
  embedded = false,
}: {
  now: Date;
  embedded?: boolean;
}) {
  const { mode } = useDisplayMode();
  const projection = useProjectedAthleteViewModel(PROJECTION_HORIZON);
  const brief = useWeeklyCoachingBriefViewModel(format(startOfWeek(now, WEEK_OPTS), 'yyyy-MM-dd'));

  const vm = projection.data;

  if (!vm) {
    return projection.isPending ? (
      <PlanProjectionSectionSkeleton embedded={embedded} />
    ) : (
      <ProjectionUnavailable embedded={embedded} message={UNAVAILABLE_FALLBACK} />
    );
  }

  if (!vm.visible) {
    return (
      <ProjectionUnavailable
        embedded={embedded}
        message={vm.emptyStateMessage ?? UNAVAILABLE_FALLBACK}
      />
    );
  }

  return (
    <section aria-labelledby="plan-projection" className="space-y-3">
      <ProjectionHeader embedded={embedded} />
      <ProjectionReading brief={brief.data} mode={mode} vm={vm} />
    </section>
  );
}
