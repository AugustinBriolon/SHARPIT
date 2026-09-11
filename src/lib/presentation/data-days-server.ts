import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  getActivityDatesInRange,
  getHealthEntries,
  getNutritionCaloriesInRange,
} from '@/lib/queries';
import {
  collectDataDays,
  dataDaysSourcesFor,
  type DataDaysRequest,
} from '@/lib/presentation/data-days';

/** Days in `[from, to]` that carry data for the requested drill-down domain. */
export async function loadDataDays(
  athleteId: string,
  { domain, from, to }: DataDaysRequest,
): Promise<string[]> {
  const needs = dataDaysSourcesFor(domain);
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  const spanDays = differenceInCalendarDays(toDate, fromDate) + 1;

  const [health, activityDates, nutrition] = await Promise.all([
    // getHealthEntries applies the athlete's wearable source preference.
    needs.health ? getHealthEntries(athleteId, spanDays, toDate) : [],
    needs.activities ? getActivityDatesInRange(athleteId, fromDate, toDate) : [],
    needs.nutrition ? getNutritionCaloriesInRange(athleteId, from, to) : [],
  ]);

  return collectDataDays(domain, { health, activityDates, nutrition }, { from, to });
}
