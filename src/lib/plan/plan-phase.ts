import { differenceInCalendarWeeks, startOfWeek } from 'date-fns';
import { format } from 'date-fns';
import type { PlanPhase } from '@prisma/client';
import { phaseLabels } from '@/lib/training/periodization';

const WEEK_OPTS = { weekStartsOn: 1 as const };

export type PlanPhaseSourceWeek = {
  weekStart: Date | string;
  phase: PlanPhase;
  isDeload: boolean;
  focus: string | null;
};

export type PlanPhaseSource = {
  raceDate: Date | string;
  weeks: readonly PlanPhaseSourceWeek[];
};

export type PlanPhaseReading = {
  phaseLabel: string;
  isDeload: boolean;
  weeksToRace: number | null;
  focus: string | null;
};

function mondayKey(value: Date | string): string {
  return format(startOfWeek(new Date(value), WEEK_OPTS), 'yyyy-MM-dd');
}

/**
 * The generated-plan week that contains `now`.
 *
 * Absent when there is no plan, or when this calendar week is outside it:
 * inventing a phase from the nearest week would pretend the plan still covers
 * a week it never wrote.
 */
export function resolvePlanPhase(
  plan: PlanPhaseSource | null | undefined,
  now: Date,
): PlanPhaseReading | null {
  if (!plan) {
    return null;
  }

  const currentKey = mondayKey(now);
  const week = plan.weeks.find((candidate) => mondayKey(candidate.weekStart) === currentKey);
  if (!week) {
    return null;
  }

  const weeksToRace = differenceInCalendarWeeks(
    startOfWeek(new Date(plan.raceDate), WEEK_OPTS),
    startOfWeek(now, WEEK_OPTS),
  );

  return {
    phaseLabel: phaseLabels[week.phase],
    isDeload: week.isDeload,
    weeksToRace: weeksToRace >= 0 ? weeksToRace : null,
    focus: week.focus,
  };
}
