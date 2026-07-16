/**
 * Travel dates are calendar days, not instants — they must round-trip identically
 * regardless of which timezone the server process happens to run in (dev machine vs
 * production). `date-fns`'s `startOfDay`/`formatISO` read the *server's* local
 * timezone, which silently shifted stored dates by a day when write and read ran
 * under different offsets. These helpers anchor everything to UTC instead, matching
 * the convention already established in `training-day.ts`.
 */

/** Floors a Date to UTC midnight of its own UTC calendar day. */
export function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Re-anchors a UTC calendar date onto the viewer's local Date fields so `date-fns`'s
 * `format` (which reads local getters) renders the same calendar day regardless of
 * the viewer's timezone offset.
 */
export function asLocalCalendarDate(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
