import { differenceInCalendarDays, format, subDays } from 'date-fns';

/**
 * Fixed-size windows anchored on today, so the day strip and the calendar ask for
 * the same cache entries and scrolling back only fetches the new window.
 */
export const DATA_DAYS_CHUNK_DAYS = 28;

export interface DayRange {
  from: string;
  to: string;
}

export type DataDayStatus = 'data' | 'empty' | 'unknown';

export interface DataDaysLookup {
  status: (dayKey: string) => DataDayStatus;
}

function chunkIndex(day: Date, anchor: Date): number {
  return Math.max(0, Math.floor(differenceInCalendarDays(anchor, day) / DATA_DAYS_CHUNK_DAYS));
}

function chunkRange(index: number, anchor: Date): DayRange {
  const to = subDays(anchor, index * DATA_DAYS_CHUNK_DAYS);
  return {
    from: format(subDays(to, DATA_DAYS_CHUNK_DAYS - 1), 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd'),
  };
}

/** Chunks covering `[from, to]`, newest first. Days after `anchor` have no data to ask for. */
export function dataDaysChunkRanges(from: Date, to: Date, anchor: Date): DayRange[] {
  const newest = chunkIndex(to, anchor);
  const oldest = chunkIndex(from, anchor);
  const ranges: DayRange[] = [];
  for (let index = newest; index <= oldest; index += 1) {
    ranges.push(chunkRange(index, anchor));
  }
  return ranges;
}

/** Merges range lists keeping the first occurrence — ranges come from the same anchor. */
export function mergeDayRanges(...lists: readonly DayRange[][]): DayRange[] {
  const seen = new Map<string, DayRange>();
  for (const range of lists.flat()) {
    seen.set(`${range.from}:${range.to}`, seen.get(`${range.from}:${range.to}`) ?? range);
  }
  return [...seen.values()];
}

/** `data[i]` is the answer for `ranges[i]`, or undefined while it loads or after a failure. */
export function buildDataDaysLookup(
  ranges: readonly DayRange[],
  data: readonly (readonly string[] | undefined)[],
): DataDaysLookup {
  const dataDays = new Set(data.flatMap((days) => days ?? []));
  const loaded = ranges.filter((_, index) => data[index] !== undefined);

  return {
    status: (dayKey) => {
      if (dataDays.has(dayKey)) {
        return 'data';
      }
      const isKnown = loaded.some((range) => dayKey >= range.from && dayKey <= range.to);
      return isKnown ? 'empty' : 'unknown';
    },
  };
}
