/**
 * An Apple Health workout's start as SharpIt stores activity starts: the athlete's wall-clock time
 * written as if it were UTC. Garmin's `startTimeLocal` is stored that way, and days are read from
 * a date's UTC components (`day-key.ts`), so a session at 00:30 in Paris stays on its own day.
 *
 * Apple Health gives an instant. Stored as the real UTC instant, a workout sat two hours away from
 * the same session brought by Garmin in Paris summer time: the fingerprint (12 minutes of
 * tolerance) never matched, and the session was counted twice.
 */

const ISO_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3})\d*)?(Z|[+-]\d{2}:?\d{2})$/;

function wallClockParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

/**
 * The wall-clock start as a UTC-encoded date. A start carrying its offset (`…+02:00`) is read as
 * written; one in UTC (`…Z`, sent by app versions that lose the offset) is placed in
 * `fallbackTimeZone`, the athlete's.
 */
export function appleHealthWallClockStart(start: string, fallbackTimeZone: string): Date {
  const match = ISO_WITH_ZONE.exec(start);
  if (!match) {
    return new Date(start);
  }
  const [, year, month, day, hour, minute, second, millis, zone] = match;
  const ms = Number((millis ?? '0').padEnd(3, '0'));
  if (zone !== 'Z') {
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        ms,
      ),
    );
  }
  const wall = wallClockParts(new Date(start), fallbackTimeZone);
  return new Date(
    Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second, ms),
  );
}
