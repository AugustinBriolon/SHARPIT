import { ActivityType } from '@prisma/client';
import { eachDayOfInterval, format, startOfDay, startOfWeek, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ActivityForAnalytics {
  date: Date;
  type: ActivityType;
  duration: number | null;
  load: number | null;
  bikeMetrics: { tss: number | null } | null;
}

/**
 * Facteurs d'estimation de charge (TSS) quand aucune métrique précise disponible.
 * Basé sur intensité moyenne typique de chaque discipline.
 *
 * Formule : TSS estimé = (durée_min × facteur)
 *
 * Note : Ce sont des APPROXIMATIONS grossières. TSS réel devrait être calculé depuis :
 * - Vélo : puissance (NP / FTP)
 * - Course/Autre : fréquence cardiaque (avgHR / LTHR)
 *
 * Sources :
 * - Coggan & Allen (2006) "Training and Racing with a Power Meter"
 * - Friel, J. (2009) "The Triathlete's Training Bible" (hrTSS)
 *
 * LIMITATIONS :
 * - Suppose intensité moyenne constante (réalité : très variable)
 * - Pas de distinction selon zones (Z2 vs VO2max)
 * - Erreur peut atteindre ±30% selon profil réel séance
 * - À utiliser uniquement quand pas de données FC/puissance
 *
 * Voir SCIENCE.md section "Training Stress Score (TSS)" pour détails complets.
 */
const LOAD_FACTOR: Record<ActivityType, number> = {
  /** Course : 1.0 TSS/min (intensité moyenne type tempo/seuil pour séance typique) */
  RUN: 1.0,
  /** Vélo : 0.85 TSS/min (légèrement moins intense que course en moyenne) */
  BIKE: 0.85,
  /** Natation : 1.1 TSS/min (plus exigeant métaboliquement à puissance perçue équivalente) */
  SWIM: 1.1,
  /** Musculation : 0.7 TSS/min (repos entre séries, charge intermittente) */
  STRENGTH: 0.7,
};

export function estimateActivityLoad(activity: ActivityForAnalytics): number {
  if (activity.load != null && activity.load > 0) return activity.load;
  if (activity.bikeMetrics?.tss != null && activity.bikeMetrics.tss > 0) {
    return activity.bikeMetrics.tss;
  }
  if (!activity.duration) return 0;
  const minutes = activity.duration / 60;
  return Math.round(minutes * LOAD_FACTOR[activity.type]);
}

export interface PmcPoint {
  date: string;
  label: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

/**
 * Constantes du modèle Performance Management Chart (PMC).
 *
 * Le modèle utilise des moyennes mobiles exponentiellement pondérées (EWMA)
 * pour suivre l'adaptation à l'entraînement.
 *
 * Sources : Coggan (2003), TrainingPeaks, WKO5
 * Voir SCIENCE.md section "Performance Management Chart (PMC)" pour détails complets.
 */
const PMC_MODEL = {
  /**
   * τ (tau) pour CTL : 42 jours
   * Chronic Training Load = "forme" à long terme, fitness de base.
   * Constante de temps 42 jours = environ 6 semaines d'adaptation.
   */
  CTL_TAU: 42,

  /**
   * τ (tau) pour ATL : 7 jours
   * Acute Training Load = "fatigue" récente immédiate.
   * Constante de temps 7 jours = charge de la semaine en cours.
   */
  ATL_TAU: 7,
} as const;

/**
 * Calcule la série temporelle du Performance Management Chart (PMC) :
 * CTL / ATL / TSB sur une période donnée.
 *
 * Modèle mathématique (EWMA - Exponentially Weighted Moving Average) :
 * - CTL(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / τ_ctl
 * - ATL(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / τ_atl
 * - TSB(t) = CTL(t) - ATL(t)
 *
 * Où :
 * - CTL = Chronic Training Load ("forme", fitness de base)
 * - ATL = Acute Training Load ("fatigue" récente)
 * - TSB = Training Stress Balance ("fraîcheur", TSB = CTL - ATL)
 * - TSS = Training Stress Score (charge quotidienne)
 * - τ = constante de temps (42j pour CTL, 7j pour ATL)
 *
 * Interprétation TSB :
 * - TSB > +15 : Frais, affûté (bon pour course)
 * - TSB -10 à +5 : Zone optimale progression
 * - TSB -10 à -30 : Fatigue accumulée (surveiller récupération)
 * - TSB < -30 : Surcharge importante (risque surentraînement)
 *
 * LIMITATIONS :
 * - Suppose réponse linéaire (réalité plus complexe)
 * - Constantes τ non individualisées (peuvent varier selon athlète)
 * - Ne remplace pas l'écoute du ressenti, HRV, sommeil
 *
 * Sources :
 * - Banister et al. (1975, 1991) — Modèle impulse-response original
 * - Coggan, A. (2003) — Popularisation via TrainingPeaks
 * - Busso, T. (2003) "Variable dose-response relationship between exercise training
 *   and performance" — Med Sci Sports Exerc
 */
export function computePmcSeries(
  activities: ActivityForAnalytics[],
  days = 180,
  refDate?: Date,
): PmcPoint[] {
  const end = startOfDay(refDate ?? new Date());
  const start = subDays(end, days);

  // Initialiser TSS quotidien à 0 pour chaque jour de la période
  const dailyTss = new Map<string, number>();
  for (const day of eachDayOfInterval({ start, end })) {
    dailyTss.set(format(day, 'yyyy-MM-dd'), 0);
  }

  // Agréger charge quotidienne (somme des TSS des activités du jour)
  for (const activity of activities) {
    const key = format(startOfDay(activity.date), 'yyyy-MM-dd');
    if (!dailyTss.has(key)) continue;
    dailyTss.set(key, (dailyTss.get(key) ?? 0) + estimateActivityLoad(activity));
  }

  // Calcul itératif du modèle EWMA
  let ctl = 0; // Chronic Training Load (forme)
  let atl = 0; // Acute Training Load (fatigue)
  const series: PmcPoint[] = [];

  for (const [date, tss] of [...dailyTss.entries()].sort()) {
    // Mise à jour CTL : moyenne pondérée sur 42 jours
    ctl += (tss - ctl) / PMC_MODEL.CTL_TAU;

    // Mise à jour ATL : moyenne pondérée sur 7 jours
    atl += (tss - atl) / PMC_MODEL.ATL_TAU;

    series.push({
      date,
      label: format(new Date(date), 'd MMM', { locale: fr }),
      tss,
      ctl: Math.round(ctl),
      atl: Math.round(atl),
      tsb: Math.round(ctl - atl), // Training Stress Balance = forme - fatigue
    });
  }

  return series;
}

export interface WeeklyVolumePoint {
  week: string;
  label: string;
  total: number;
  RUN: number;
  BIKE: number;
  SWIM: number;
  STRENGTH: number;
}

export function computeWeeklyVolume(
  activities: ActivityForAnalytics[],
  weeks = 16,
): WeeklyVolumePoint[] {
  const end = startOfDay(new Date());
  const start = startOfWeek(subDays(end, weeks * 7), { weekStartsOn: 1 });

  const buckets = new Map<string, WeeklyVolumePoint>();

  for (const activity of activities) {
    if (activity.date < start) continue;
    const weekStart = startOfWeek(activity.date, { weekStartsOn: 1 });
    const key = format(weekStart, 'yyyy-MM-dd');
    if (!buckets.has(key)) {
      buckets.set(key, {
        week: key,
        label: format(weekStart, 'd MMM', { locale: fr }),
        total: 0,
        RUN: 0,
        BIKE: 0,
        SWIM: 0,
        STRENGTH: 0,
      });
    }
    const hours = (activity.duration ?? 0) / 3600;
    const bucket = buckets.get(key)!;
    bucket[activity.type] += hours;
    bucket.total += hours;
  }

  return [...buckets.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((b) => ({
      ...b,
      total: Number(b.total.toFixed(1)),
      RUN: Number(b.RUN.toFixed(1)),
      BIKE: Number(b.BIKE.toFixed(1)),
      SWIM: Number(b.SWIM.toFixed(1)),
      STRENGTH: Number(b.STRENGTH.toFixed(1)),
    }));
}

export interface SportDistribution {
  type: ActivityType;
  label: string;
  hours: number;
  count: number;
  percent: number;
}

export function computeSportDistribution(
  activities: ActivityForAnalytics[],
  days = 90,
): SportDistribution[] {
  const since = subDays(startOfDay(new Date()), days);
  const filtered = activities.filter((a) => a.date >= since);

  const totals: Record<ActivityType, { hours: number; count: number }> = {
    RUN: { hours: 0, count: 0 },
    BIKE: { hours: 0, count: 0 },
    SWIM: { hours: 0, count: 0 },
    STRENGTH: { hours: 0, count: 0 },
  };

  let totalHours = 0;
  for (const activity of filtered) {
    const hours = (activity.duration ?? 0) / 3600;
    totals[activity.type].hours += hours;
    totals[activity.type].count += 1;
    totalHours += hours;
  }

  const labels: Record<ActivityType, string> = {
    RUN: 'Course',
    BIKE: 'Vélo',
    SWIM: 'Natation',
    STRENGTH: 'Musculation',
  };

  return (Object.keys(totals) as ActivityType[])
    .map((type) => ({
      type,
      label: labels[type],
      hours: Number(totals[type].hours.toFixed(1)),
      count: totals[type].count,
      percent: totalHours > 0 ? Math.round((totals[type].hours / totalHours) * 100) : 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.hours - a.hours);
}

export interface AnalyticsSummary {
  ctl: number;
  atl: number;
  tsb: number;
  weeklyHours: number;
  weeklyLoad: number;
  totalActivities: number;
  periodDays: number;
}

export function computeAnalyticsSummary(
  activities: ActivityForAnalytics[],
  pmc: PmcPoint[],
): AnalyticsSummary {
  const latest = pmc[pmc.length - 1];
  const weekAgo = subDays(startOfDay(new Date()), 7);

  const weekActivities = activities.filter((a) => a.date >= weekAgo);
  const weeklyHours = weekActivities.reduce((s, a) => s + (a.duration ?? 0), 0) / 3600;
  const weeklyLoad = weekActivities.reduce((s, a) => s + estimateActivityLoad(a), 0);

  return {
    ctl: latest?.ctl ?? 0,
    atl: latest?.atl ?? 0,
    tsb: latest?.tsb ?? 0,
    weeklyHours: Number(weeklyHours.toFixed(1)),
    weeklyLoad: Math.round(weeklyLoad),
    totalActivities: activities.length,
    periodDays: 180,
  };
}

export const CHART_COLORS: Record<ActivityType | 'ctl' | 'atl' | 'tsb', string> = {
  RUN: '#ea580c',
  BIKE: '#0891b2',
  SWIM: '#2563eb',
  STRENGTH: '#7c3aed',
  ctl: '#0891b2',
  atl: '#ea580c',
  tsb: '#7c3aed',
};
