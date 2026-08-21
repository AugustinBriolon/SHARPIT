/**
 * Formatting for dates stored as `@db.Date` — a calendar day, not an instant.
 *
 * Prisma hands those back as a Date at UTC midnight. Formatting one with a
 * local-time formatter reads the wrong day for any athlete west of UTC: midnight
 * UTC is the previous evening there, so a session scheduled on the 22nd reaches
 * the watch on the 21st. These read UTC components, which is where the calendar
 * day actually lives.
 *
 * Not for instants. A timestamp that means "this moment" should be formatted in
 * the athlete's timezone, not in UTC.
 */

/** Calendar day as "YYYY-MM-DD". */
export function dayKeyFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calendar day as "dd/MM", for athlete-facing labels. */
export function shortDayFromDate(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day}/${month}`;
}
