'use client';

import { Check, Layers } from 'lucide-react';
import { Fragment } from 'react';
import { isSet } from '@sharpit/shared/value';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { activityTypeLabels, formatDuration } from '@sharpit/app/lib/format';
import { formatPlannedDuration, intensityLabels } from '@sharpit/app/lib/planned-session/sessions';
import type { BrickLegSummary } from '@sharpit/app/lib/planned-session/brick/brick-sessions';
import { cn } from '@sharpit/app/lib/utils';
import { NavArrowRight } from '@/components/icons/nav-arrows';
import { formatTransition } from '@sharpit/app/lib/today/dashboard/today-brick-lines';

/**
 * One brick, one surface — legs always visible (no disclosure).
 * Opening a planned leg lands on its planned-session dialog; a done leg, on its activity, when
 * the host can open one. A done leg shows what it was — duration, RPE, the athlete's feeling —
 * and the transition before it.
 */
export function BrickOverviewCard({
  legs,
  subtitle,
  badge,
  primary = false,
  onOpenLeg,
  transitionsSec,
  onOpenActivity,
}: {
  legs: BrickLegSummary[];
  subtitle?: string | null;
  /** Small pill next to the title — e.g. "Point de bascule". */
  badge?: string | null;
  /** Highlights the brick when it is the next owed block of the day. */
  primary?: boolean;
  onOpenLeg: (legId: string) => void;
  /** Seconds from each leg's end to the next's start, once done (T2, …). */
  transitionsSec?: ReadonlyArray<number | null> | null;
  /** Opens a done leg's activity; without it, every leg opens as planned. */
  onOpenActivity?: (activityId: string) => void;
}) {
  const openLeg = (leg: BrickLegSummary) => {
    if (leg.completed && leg.activityId && onOpenActivity) {
      onOpenActivity(leg.activityId);
      return;
    }
    onOpenLeg(leg.id);
  };
  const allDone = legs.length > 0 && legs.every((leg) => leg.completed);
  const sequence = legs.map((leg) => activityTypeLabels[leg.type]).join(' → ');

  return (
    <div
      className={cn(
        'chip-surface-lg rounded-analysis-lg overflow-hidden',
        primary && 'ring-primary/25 ring-1',
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-3">
        <Layers className="text-primary size-4 shrink-0" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-foreground truncate text-sm font-medium">Brick · {sequence}</span>
            {badge ? (
              <span className="border-primary/40 text-primary text-data w-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px]">
                {badge}
              </span>
            ) : null}
            {primary ? (
              <span className="bg-highlight text-highlight-foreground text-data rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                Prioritaire
              </span>
            ) : null}
          </span>
          {subtitle ? (
            <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
          ) : null}
        </span>
        {allDone ? <Check className="text-primary size-4 shrink-0" aria-hidden /> : null}
      </div>

      <ul className="border-analysis-border/40 divide-analysis-border/40 divide-y border-t">
        {legs.map((leg, index) => (
          <Fragment key={leg.id}>
            {index > 0 && isSet(transitionsSec?.[index - 1]) ? (
              <BrickTransitionRow index={index} seconds={transitionsSec![index - 1]!} />
            ) : null}
            <li>
              <BrickLegRow leg={leg} onOpen={() => openLeg(leg)} />
            </li>
          </Fragment>
        ))}
      </ul>
    </div>
  );
}

function Dot() {
  return (
    <span className="opacity-30" aria-hidden>
      ·
    </span>
  );
}

/** The actual duration once done, else the planned one. */
function legDurationLabel(leg: BrickLegSummary): string | null {
  if (leg.actual?.durationSec) {
    return formatDuration(leg.actual.durationSec);
  }
  return leg.durationMin !== null ? formatPlannedDuration(leg.durationMin) : null;
}

/** Planned duration and intensity, or, once done, the actual duration and RPE. */
function BrickLegMeta({ leg }: { leg: BrickLegSummary }) {
  const actual = leg.actual ?? null;
  const duration = legDurationLabel(leg);
  return (
    <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
      {duration ? <span className="tabular-nums">{duration}</span> : null}
      {!actual && leg.intensity ? (
        <>
          <Dot />
          <span>{intensityLabels[leg.intensity]}</span>
        </>
      ) : null}
      {isSet(actual?.rpe) ? (
        <>
          <Dot />
          <span className="tabular-nums">RPE {actual!.rpe}</span>
        </>
      ) : null}
      {leg.completed ? (
        <>
          <Dot />
          <span className="text-primary inline-flex items-center gap-0.5">
            <Check className="size-3" aria-hidden />
            Réalisée
          </span>
        </>
      ) : null}
    </span>
  );
}

function BrickLegRow({ leg, onOpen }: { leg: BrickLegSummary; onOpen: () => void }) {
  const feeling = leg.actual?.feeling?.trim();
  return (
    <button
      className="hover:bg-primary/5 focus-visible:ring-primary/35 flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
      type="button"
      onClick={onOpen}
    >
      <ActivityTypeIndicator type={leg.type} variant="code" />
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-sm">{leg.title}</span>
        <BrickLegMeta leg={leg} />
        {feeling ? (
          <span className="text-muted-foreground mt-0.5 block text-xs italic">« {feeling} »</span>
        ) : null}
      </span>
      <NavArrowRight className="text-muted-foreground/50 size-4 shrink-0" aria-hidden />
    </button>
  );
}

/** The time between two legs — T2 after the first, and so on. */
function BrickTransitionRow({ index, seconds }: { index: number; seconds: number }) {
  return (
    <li className="text-muted-foreground flex items-center gap-2 px-3 py-1.5 text-xs">
      <span className="text-data font-medium">T{index + 1}</span>
      <span>Transition</span>
      <span className="text-foreground ml-auto tabular-nums">{formatTransition(seconds)}</span>
    </li>
  );
}
