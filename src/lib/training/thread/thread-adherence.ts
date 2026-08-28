import type { ThreadAdherence, ThreadWeek } from './thread-model';

/**
 * Sessions held against sessions asked for.
 *
 * Counts sessions, not load: a week can hit its TSS by turning an interval
 * session into a long easy ride and still have missed the point of the block.
 * "14/16" is a promise kept or not; "312 TSS" is a volume.
 *
 * Only weeks that have already started are counted — grading a plan on sessions
 * not yet due would make every Monday look like a failure.
 */
function countWeekSessions(week: ThreadWeek): { completed: number; prescribed: number } {
  let completed = 0;
  let prescribed = 0;
  for (const day of week.days) {
    for (const entry of day.entries) {
      if (entry.kind === 'paired') {
        completed += 1;
        prescribed += 1;
      } else if (entry.kind === 'planned') {
        prescribed += 1;
      }
    }
  }
  return { completed, prescribed };
}

export function buildThreadAdherence(weeks: readonly ThreadWeek[]): ThreadAdherence {
  let completed = 0;
  let prescribed = 0;
  let worstWeekLabel: string | null = null;
  let worstRatio = Number.POSITIVE_INFINITY;

  for (const week of weeks) {
    if (week.isFuture) {
      continue;
    }

    const weekCounts = countWeekSessions(week);
    completed += weekCounts.completed;
    prescribed += weekCounts.prescribed;

    if (weekCounts.prescribed > 0) {
      const ratio = weekCounts.completed / weekCounts.prescribed;
      if (ratio < worstRatio) {
        worstRatio = ratio;
        worstWeekLabel = week.label;
      }
    }
  }

  return {
    completed,
    prescribed,
    ratio: prescribed > 0 ? completed / prescribed : null,
    // A window where nothing was ever missed has no dip to name.
    worstWeekLabel: worstRatio < 1 ? worstWeekLabel : null,
  };
}
