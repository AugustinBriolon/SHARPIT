import { featureRepository } from '@/lib/engines/feature-engine';
import { getActivitiesForPmc } from '@/lib/queries';
import { toTrainingDayId, type PmcDayPoint } from '@/lib/training/pmc';
import {
  aggregateDailyTssPreferringCore,
  computeAthletePmc,
  type CoreSessionTss,
  type PmcPoint,
  toPmcPoints,
} from '@/lib/training/pmc-history';

/**
 * The athlete's PMC series, computed from the Core's Training Stress.
 *
 * Single entry point for every server-side PMC read, so no surface can end up on a
 * different load source than another. The Core derives TSS through its tiered
 * cascade — power, then heart rate, then pace, then session RPE, then duration —
 * and only falls back to the per-activity estimate for days it does not cover.
 *
 * @see docs/adr/ADR-011-pmc-state-and-window-semantics.md
 */

export interface LoadAthletePmcOptions {
  /** Last day of the series. Defaults to today. */
  refDate?: Date;
}

export async function loadAthletePmcSeries(
  athleteId: string,
  options?: LoadAthletePmcOptions,
): Promise<PmcDayPoint[]> {
  const refDate = options?.refDate;
  const activities = await getActivitiesForPmc(athleteId);
  if (activities.length === 0) {
    return [];
  }

  const coreSessions = await loadCoreSessionTss(
    athleteId,
    activities[0].date,
    refDate ?? new Date(),
  );

  return computeAthletePmc(activities, { refDate, coreSessions });
}

/** Latest state only — what most callers actually need. */
export async function loadAthletePmcAnchor(
  athleteId: string,
  options?: LoadAthletePmcOptions,
): Promise<PmcDayPoint | null> {
  const series = await loadAthletePmcSeries(athleteId, options);
  return series.at(-1) ?? null;
}

/** Chart-ready points across the whole history; slice for display. */
export async function loadAthletePmcPoints(
  athleteId: string,
  options?: LoadAthletePmcOptions,
): Promise<PmcPoint[]> {
  return toPmcPoints(await loadAthletePmcSeries(athleteId, options));
}

/**
 * One entry per training day, carrying the Core's Training Stress.
 *
 * Feeds `computeTrainingLoad` (ACWR, rolling weekly load, monotony) from the same
 * source as the PMC. Both used to read `Activity.load` independently, which meant
 * the ACWR gauge and the fitness chart could disagree about the same week.
 */
export async function loadDailyTrainingStressEntries(
  athleteId: string,
  options?: LoadAthletePmcOptions,
): Promise<{ load: number; date: Date }[]> {
  const refDate = options?.refDate ?? new Date();
  const activities = await getActivitiesForPmc(athleteId);
  if (activities.length === 0) {
    return [];
  }

  const coreSessions = await loadCoreSessionTss(athleteId, activities[0].date, refDate);
  const dailyTss = aggregateDailyTssPreferringCore(activities, coreSessions);

  return [...dailyTss.entries()].map(([trainingDayId, load]) => ({
    load,
    // Midday avoids a timezone shift when the consumer re-derives the training day.
    date: new Date(`${trainingDayId}T12:00:00.000Z`),
  }));
}

async function loadCoreSessionTss(
  athleteId: string,
  from: Date,
  to: Date,
): Promise<CoreSessionTss[]> {
  const records = await featureRepository.findSessionFeaturesByRange(
    athleteId,
    toTrainingDayId(from),
    toTrainingDayId(to),
  );

  return records.flatMap((record) => {
    const { trainingDayId, data } = record;
    const tssScore = data?.tssScore;
    // A null score means extraction could not produce one; that day falls back to
    // the per-activity estimate rather than counting the session as zero load.
    if (
      trainingDayId === undefined ||
      trainingDayId === null ||
      typeof tssScore !== 'number' ||
      !Number.isFinite(tssScore)
    ) {
      return [];
    }
    return [{ trainingDayId, tssScore }];
  });
}
