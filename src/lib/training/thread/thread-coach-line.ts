import type { ThreadEntry, ThreadWeek } from './thread-model';
import { isSet } from '@/lib/util/value';

/**
 * One sentence about the week, naming the session it turns on.
 *
 * Generated, never canned. A line that reads "Continue comme ça" on every screen
 * costs a paragraph of attention and returns nothing, so this only speaks when it
 * can point at something: the heaviest session still owed this week is what the
 * rest of the week is arranged around, and saying which one it is tells the
 * athlete where the week can actually break.
 */

export type ThreadCoachLine = {
  readonly text: string;
  /** The session the sentence is about, so the thread can mark it. */
  readonly pivotEntryId: string | null;
};

function outstanding(week: ThreadWeek): ThreadEntry[] {
  return week.days.flatMap((day) => day.entries).filter((entry) => entry.kind === 'planned');
}

function entryPlannedWeight(entry: ThreadEntry): number {
  return entry.planned?.load ?? entry.planned?.durationMin ?? 0;
}

/** The heaviest session still owed — by load, falling back to duration. */
export function findPivotEntry(week: ThreadWeek | null): ThreadEntry | null {
  if (!week) {
    return null;
  }
  const candidates = outstanding(week);
  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((heaviest, entry) =>
    entryPlannedWeight(entry) > entryPlannedWeight(heaviest) ? entry : heaviest,
  );
}

function threadLineWithoutPivot(held: number | null): ThreadCoachLine | null {
  if (!isSet(held)) {
    return null;
  }
  return held >= 0.9
    ? { text: 'Semaine bouclée — la charge prévue est tenue.', pivotEntryId: null }
    : {
        text: `Semaine terminée à ${Math.round(held * 100)} % de la charge prévue.`,
        pivotEntryId: null,
      };
}

export function buildThreadCoachLine(week: ThreadWeek | null): ThreadCoachLine | null {
  if (!week) {
    return null;
  }

  const pivot = findPivotEntry(week);
  const held = week.plannedLoad > 0 ? week.doneLoad / week.plannedLoad : null;

  if (!pivot) {
    return threadLineWithoutPivot(held);
  }

  const lead =
    isSet(held) && held < 0.5
      ? 'Le gros de la semaine est encore devant toi.'
      : 'Ta semaine tient.';

  return {
    text: `${lead} ${pivot.title} est le point de bascule du bloc.`,
    pivotEntryId: pivot.id,
  };
}
