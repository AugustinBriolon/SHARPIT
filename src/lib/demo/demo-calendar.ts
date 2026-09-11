/**
 * Demo calendar anchors — always Europe/Paris training-day ids and UTC
 * midnight `@db.Date` values. Never `startOfDay(new Date())` (server-local),
 * which silently shifts the seeded day west of UTC.
 */

import { dayKeyFromDate } from '@/lib/date/day-key';
import { addTrainingDays, trainingDayIdForNow } from '@/lib/training/training-day';
import { toUtcDateOnly } from '@/lib/travel-context/calendar-date';

/** Today's training day for the demo athlete (Paris, 4h cutoff). */
export function demoAnchorTrainingDayId(now: Date = new Date()): string {
  return trainingDayIdForNow({}, now);
}

/** Calendar day N days before the demo anchor, as a training-day id. */
export function demoTrainingDayIdDaysAgo(daysAgo: number, now: Date = new Date()): string {
  return addTrainingDays(demoAnchorTrainingDayId(now), -daysAgo);
}

/**
 * Prisma `@db.Date` for a training-day id — UTC midnight of that calendar day.
 * Matches how journal day-signals and health backfill look up rows.
 */
export function demoDateFromTrainingDayId(trainingDayId: string): Date {
  return toUtcDateOnly(new Date(`${trainingDayId}T12:00:00.000Z`));
}

/** True when a stored `@db.Date` is the demo's current training day. */
export function isDemoHealthDateCurrent(date: Date, now: Date = new Date()): boolean {
  return dayKeyFromDate(date) === demoAnchorTrainingDayId(now);
}
