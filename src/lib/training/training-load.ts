import { format as formatDate } from 'date-fns';
import { addTrainingDays, computeTrainingDayId } from './training-day';

/**
 * Calcul de la charge d'entraînement via le ratio Acute:Chronic Workload Ratio (ACWR).
 *
 * ACWR = Charge aiguë (7 derniers jours) / Charge chronique moyenne hebdomadaire
 *
 * Modèle : Rolling Average ACWR
 * Sources :
 * - Gabbett, T.J. (2016). "The training-injury prevention paradox" — British Journal of Sports Medicine
 * - Blanch & Gabbett (2016). Validation initiale ACWR dans sports collectifs
 * - Carey et al. (2017). Revue systématique, identification seuils risque
 *
 * Seuils appliqués (voir ACWR_THRESHOLDS — cette liste doit rester alignée) :
 * - ACWR < 0.9 : Sous-charge, désentraînement progressif
 * - ACWR 0.9-1.3 : "Sweet spot", progression optimale
 * - ACWR 1.3-1.5 : Zone d'alerte, augmentation risque blessure
 * - ACWR > 1.5 : Zone de danger élevé (×2 à ×4 risque blessure selon études)
 *
 * LIMITATIONS :
 * - Développé sur sports collectifs (rugby, football) — extrapolation à l'endurance moins validée
 * - Sensible aux semaines de récupération (peut donner faux positif après deload)
 * - Ne tient pas compte du type de charge (intensité vs volume)
 * - Pas de consensus sur fenêtre optimale : 7:21, 7:28, ou 7:42 jours ?
 *
 * Recommandation : À utiliser en complément d'autres signaux (HRV, RPE, douleurs).
 * Pour endurance pure, le modèle CTL/ATL/TSB (analytics.ts) est plus robuste.
 */

/** Période aiguë : 7 derniers jours (charge récente immédiate) */
const ACUTE_DAYS = 7;

/** Période chronique : 42 derniers jours (charge de référence sur 6 semaines) */
const CHRONIC_DAYS = 42;

/** Nombre de semaines dans la période chronique (42j / 7j = 6 semaines) */
const CHRONIC_WEEKS = CHRONIC_DAYS / 7;

/**
 * Seuils ACWR basés sur Gabbett et al. (2016) et consensus littérature.
 * Source : Carey et al. (2017) — Systematic review of ACWR in sports
 */
export const ACWR_THRESHOLDS = {
  /** En dessous de 0.9 : sous-charge, pas de risque immédiat mais désentraînement progressif */
  UNDERLOAD: 0.9,
  /** Au-dessus de 1.3 : zone de risque accru de blessure selon méta-analyses */
  OVERLOAD_MODERATE: 1.3,
  /** Au-dessus de 1.5 : risque de blessure multiplié par 2-4 selon études */
  OVERLOAD_HIGH: 1.5,
} as const;

function dayIdToEpochDays(trainingDayId: string): number {
  const [year, month, day] = trainingDayId.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return Math.floor(d.getTime() / 86_400_000);
}

function isWithinWindow(trainingDayId: string, anchorDayId: string, windowDays: number) {
  const anchorEpoch = dayIdToEpochDays(anchorDayId);
  const dayEpoch = dayIdToEpochDays(trainingDayId);
  const diff = anchorEpoch - dayEpoch;
  return diff >= 0 && diff < windowDays;
}

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Rolling acute/chronic load from per-day training stress.
 *
 * Entries are grouped by training day, so callers may pass either raw activities
 * or one synthetic entry per day. Prefer `loadDailyTrainingStressEntries`, which
 * supplies the Core's Training Stress: passing `Activity.load` directly means this
 * runs on a column that mixed Garmin's TSS with its EPOC training load for every
 * row written before the two were separated. See ADR-011.
 */
function fatigueFromAcwr(acwr: number): 'Low' | 'Medium' | 'High' {
  if (acwr >= ACWR_THRESHOLDS.OVERLOAD_MODERATE) {
    return 'High';
  }
  if (acwr >= ACWR_THRESHOLDS.UNDERLOAD) {
    return 'Medium';
  }
  return 'Low';
}

function sumLoadInWindow(
  loadByTrainingDay: Map<string, number>,
  refTrainingDayId: string,
  windowDays: number,
): number {
  return Array.from(loadByTrainingDay.entries())
    .filter(([trainingDayId]) => isWithinWindow(trainingDayId, refTrainingDayId, windowDays))
    .reduce((sum, [, load]) => sum + load, 0);
}

export type TrainingLoadResult = {
  dailyLoad: number;
  weeklyLoad: number;
  acwr: number;
  fatigue: 'Low' | 'Medium' | 'High';
  loadMonotony: number | null;
  loadStrain: number | null;
};

function buildTrainingLoadResult(input: {
  loadByTrainingDay: Map<string, number>;
  refTrainingDayId: string;
  acuteLoad: number;
  dailyLoad: number;
  chronicWeeklyAvg: number;
}): TrainingLoadResult {
  const { loadByTrainingDay, refTrainingDayId, acuteLoad, dailyLoad, chronicWeeklyAvg } = input;
  const dailyLoads7d = Array.from({ length: ACUTE_DAYS }, (_, index) => {
    const dayId = addTrainingDays(refTrainingDayId, -(ACUTE_DAYS - 1 - index));
    return loadByTrainingDay.get(dayId) ?? 0;
  });

  const avgDailyLoad = mean(dailyLoads7d);
  const sdDailyLoad = stdDev(dailyLoads7d);
  const loadMonotony = sdDailyLoad > 0 ? avgDailyLoad / sdDailyLoad : null;
  const loadStrain = (loadMonotony !== undefined && loadMonotony !== null) ? acuteLoad * loadMonotony : null;
  const acwr = chronicWeeklyAvg > 0 ? acuteLoad / chronicWeeklyAvg : 0;

  return {
    dailyLoad: Math.round(dailyLoad),
    weeklyLoad: Math.round(acuteLoad),
    acwr: Number(acwr.toFixed(2)),
    fatigue: fatigueFromAcwr(acwr),
    loadMonotony: (loadMonotony !== undefined && loadMonotony !== null) ? Number(loadMonotony.toFixed(2)) : null,
    loadStrain: (loadStrain !== undefined && loadStrain !== null) ? Math.round(loadStrain) : null,
  };
}

export function computeTrainingLoad(
  activities: { load: number | null; date: Date }[],
  refDate: Date = new Date(),
) {
  const refTrainingDayId = formatDate(refDate, 'yyyy-MM-dd');
  const loadByTrainingDay = new Map<string, number>();
  for (const activity of activities) {
    const trainingDayId = computeTrainingDayId(new Date(activity.date));
    loadByTrainingDay.set(
      trainingDayId,
      (loadByTrainingDay.get(trainingDayId) ?? 0) + (activity.load ?? 0),
    );
  }

  const acuteLoad = sumLoadInWindow(loadByTrainingDay, refTrainingDayId, ACUTE_DAYS);
  const dailyLoad = loadByTrainingDay.get(refTrainingDayId) ?? 0;
  const chronicTotalLoad = sumLoadInWindow(loadByTrainingDay, refTrainingDayId, CHRONIC_DAYS);
  const chronicWeeklyAvg = chronicTotalLoad / CHRONIC_WEEKS;

  return buildTrainingLoadResult({
    loadByTrainingDay,
    refTrainingDayId,
    acuteLoad,
    dailyLoad,
    chronicWeeklyAvg,
  });
}

type FatigueDimensionResult = {
  score: number | null;
  status: string;
  available: boolean;
};

/** Complète la dimension charge quand le moteur fatigue n'a pas d'ACWR en features. */
export function enrichFatigueLoadDimension<T extends Record<string, FatigueDimensionResult>>(
  dimensions: T,
  acwr: number,
): T {
  const { load } = dimensions;
  if (!load || load.available || acwr <= 0) {
    return dimensions;
  }

  const score = Math.round(Math.max(Math.min((acwr / 1.5) * 100, 100), 0));
  return {
    ...dimensions,
    load: {
      score,
      available: true,
      status: `ACWR ${acwr.toFixed(2)}`,
    },
  };
}
