import { slicePmcWindow } from '@sharpit/app/lib/training/pmc/pmc';
import type { PmcPoint } from '@sharpit/app/lib/training/pmc/pmc-history';

/** Days of the fitness curve sent to a native client — six weeks, the CTL time constant. */
export const TRAINING_LOAD_WINDOW_DAYS = 42;
/** Weeks of load totals, the current one last. */
export const TRAINING_LOAD_WEEKS = 8;

export type V1TrainingLoadResponse = {
  apiVersion: 1;
  trainingDayId: string;
  /** Fitness (CTL), fatigue (ATL) and form (TSB) per day, oldest first. */
  days: Array<{ date: string; tss: number; ctl: number; atl: number; tsb: number }>;
  /** Training Stress summed over each rolling week ending on the reference day. */
  weeks: Array<{ weekEnd: string; tss: number }>;
};

/**
 * The expert reading's load layer for native clients: the same PMC points and daily stress
 * the web's Effort page reads, projected to plain numbers — no labels, no chart styling.
 */
export function projectV1TrainingLoad(
  trainingDayId: string,
  pmcPoints: PmcPoint[],
  dailyStress: { load: number; date: Date }[],
): V1TrainingLoadResponse {
  const refDate = new Date(`${trainingDayId}T12:00:00.000Z`);
  const days = slicePmcWindow(pmcPoints, TRAINING_LOAD_WINDOW_DAYS, refDate).map(
    ({ date, tss, ctl, atl, tsb }) => ({ date, tss, ctl, atl, tsb }),
  );
  return { apiVersion: 1, trainingDayId, days, weeks: weeklyTotals(refDate, dailyStress) };
}

function weeklyTotals(refDate: Date, dailyStress: { load: number; date: Date }[]) {
  const weeks: V1TrainingLoadResponse['weeks'] = [];
  for (let w = TRAINING_LOAD_WEEKS - 1; w >= 0; w -= 1) {
    const weekEnd = new Date(refDate);
    weekEnd.setUTCDate(refDate.getUTCDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setUTCDate(weekEnd.getUTCDate() - 6);
    weekStart.setUTCHours(0, 0, 0, 0);
    weekEnd.setUTCHours(23, 59, 59, 999);
    const tss = dailyStress
      .filter((entry) => entry.date >= weekStart && entry.date <= weekEnd)
      .reduce((sum, entry) => sum + entry.load, 0);
    weeks.push({ weekEnd: weekEnd.toISOString().slice(0, 10), tss: Math.round(tss) });
  }
  return weeks;
}
