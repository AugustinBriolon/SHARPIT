import { format, startOfWeek } from 'date-fns';
import type { PlanPhase } from '@prisma/client';
import { phaseLabels } from '@/lib/training/periodization';
import type { PlanPhaseSource, PlanPhaseSourceWeek } from '@/lib/plan/plan-phase';

const WEEK_OPTS = { weekStartsOn: 1 as const };

export type MacroPhaseRun = {
  phase: PlanPhase;
  label: string;
  current: boolean;
};

export type MacroPhaseRail = {
  runs: MacroPhaseRun[];
  weekInRun: number;
  focus: string | null;
  isDeload: boolean;
};

function mondayKey(value: Date | string): string {
  return format(startOfWeek(new Date(value), WEEK_OPTS), 'yyyy-MM-dd');
}

function sortWeeks(weeks: readonly PlanPhaseSourceWeek[]): PlanPhaseSourceWeek[] {
  return [...weeks].sort((left, right) =>
    mondayKey(left.weekStart).localeCompare(mondayKey(right.weekStart)),
  );
}

function groupRuns(weeks: readonly PlanPhaseSourceWeek[]): PlanPhaseSourceWeek[][] {
  const runs: PlanPhaseSourceWeek[][] = [];
  for (const week of weeks) {
    const last = runs.at(-1);
    if (last && last[0]?.phase === week.phase) {
      last.push(week);
    } else {
      runs.push([week]);
    }
  }
  return runs;
}

/**
 * Consecutive phase runs on the generated plan, with the current week located.
 *
 * Absent when there is no plan, or when this Monday is outside it.
 */
export function buildMacroPhaseRail(
  plan: PlanPhaseSource | null | undefined,
  now: Date,
): MacroPhaseRail | null {
  if (!plan || plan.weeks.length === 0) {
    return null;
  }

  const currentKey = mondayKey(now);
  const weeks = sortWeeks(plan.weeks);
  const current = weeks.find((week) => mondayKey(week.weekStart) === currentKey);
  if (!current) {
    return null;
  }

  const runs = groupRuns(weeks);
  const currentRun = runs.find((run) =>
    run.some((week) => mondayKey(week.weekStart) === currentKey),
  );
  if (!currentRun) {
    return null;
  }

  const weekInRun = currentRun.findIndex((week) => mondayKey(week.weekStart) === currentKey) + 1;

  return {
    runs: runs.map((run) => ({
      phase: run[0].phase,
      label: phaseLabels[run[0].phase],
      current: run[0].phase === current.phase && run === currentRun,
    })),
    weekInRun,
    focus: current.focus,
    isDeload: current.isDeload,
  };
}
