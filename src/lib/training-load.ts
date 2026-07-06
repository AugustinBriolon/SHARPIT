import { endOfDay, startOfDay, subDays } from 'date-fns';

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
 * Seuils validés (consensus littérature) :
 * - ACWR < 0.8 : Sous-charge, désentraînement progressif
 * - ACWR 0.8-1.3 : "Sweet spot", progression optimale
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
const ACWR_THRESHOLDS = {
  /** En dessous de 0.9 : sous-charge, pas de risque immédiat mais désentraînement progressif */
  UNDERLOAD: 0.9,
  /** Au-dessus de 1.3 : zone de risque accru de blessure selon méta-analyses */
  OVERLOAD_MODERATE: 1.3,
  /** Au-dessus de 1.5 : risque de blessure multiplié par 2-4 selon études */
  OVERLOAD_HIGH: 1.5,
} as const;

export function computeTrainingLoad(
  activities: { load: number | null; date: Date }[],
  refDate: Date = new Date(),
) {
  const end = endOfDay(refDate);
  // Use N-1 so the window spans exactly N calendar days (today inclusive).
  // subDays(ref, N) would make the window N+1 days wide.
  const acuteStart = startOfDay(subDays(refDate, ACUTE_DAYS - 1));
  const chronicStart = startOfDay(subDays(refDate, CHRONIC_DAYS - 1));

  const inRange = (d: Date, start: Date) => {
    const date = new Date(d);
    return date >= start && date <= end;
  };

  // Charge aiguë : somme des 7 derniers jours (TSS total sur la semaine)
  const acuteLoad = activities
    .filter((a) => inRange(a.date, acuteStart))
    .reduce((sum, a) => sum + (a.load ?? 0), 0);

  // Charge chronique : MOYENNE HEBDOMADAIRE sur les 6 dernières semaines (42 jours)
  // On divise la somme des 42 jours par 6 semaines pour obtenir la charge hebdo moyenne
  const chronicTotalLoad = activities
    .filter((a) => inRange(a.date, chronicStart))
    .reduce((sum, a) => sum + (a.load ?? 0), 0);

  const chronicWeeklyAvg = chronicTotalLoad / CHRONIC_WEEKS;

  // ACWR : ratio de la charge aiguë (7j) sur la charge chronique moyenne hebdo
  const acwr = chronicWeeklyAvg > 0 ? acuteLoad / chronicWeeklyAvg : 0;

  // Classification du niveau de fatigue / risque selon seuils validés
  let fatigue: 'Low' | 'Medium' | 'High' = 'Low';
  if (acwr >= ACWR_THRESHOLDS.OVERLOAD_MODERATE) fatigue = 'High';
  else if (acwr >= ACWR_THRESHOLDS.UNDERLOAD) fatigue = 'Medium';

  return {
    weeklyLoad: Math.round(acuteLoad),
    acwr: Number(acwr.toFixed(2)),
    fatigue,
  };
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
  if (!load || load.available || acwr <= 0) return dimensions;

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
