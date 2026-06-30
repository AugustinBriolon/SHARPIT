import type { RecoveryTone } from '@/lib/recovery';

/**
 * Coach de sommeil : analyse déterministe des phases de sommeil (Garmin) et
 * recommandation d'heure de coucher.
 *
 * Repères physiologiques utilisés (adulte) :
 *  - Sommeil profond : ~13-23 % du temps de sommeil (récupération physique).
 *  - Sommeil paradoxal (REM) : ~20-25 % (mémoire, récupération cognitive).
 *  - Durée cible : 7h30-8h30. On vise 8h par défaut.
 *  - Régularité des horaires : pilier majeur de la qualité du sommeil.
 */

const TARGET_DURATION_MIN = 480; // 8 h
const FALL_ASLEEP_BUFFER_MIN = 20; // marge d'endormissement
// État récent (durée, phases, score, stress) : on reste sur la dernière semaine.
const RECENT_WINDOW_NIGHTS = 7;
// Habitudes (coucher conseillé & régularité) : fenêtre large + médiane, pour ne
// pas être faussé par une période atypique (vacances, déplacements…).
const HABIT_WINDOW_NIGHTS = 30;

export interface SleepEntryInput {
  date: Date;
  sleepMinutes: number | null;
  sleepScore: number | null;
  sleepDeepMin: number | null;
  sleepLightMin: number | null;
  sleepRemMin: number | null;
  sleepAwakeMin: number | null;
  sleepBedtimeMin: number | null;
  sleepWakeMin: number | null;
  sleepRespiration: number | null;
  sleepAvgStress: number | null;
  sleepScoreFeedback: string | null;
}

export interface SleepPhase {
  key: 'deep' | 'rem' | 'light' | 'awake';
  label: string;
  minutes: number;
  percent: number; // part du temps au lit (pour la barre)
  color: string;
  ideal: string | null;
  tone: RecoveryTone;
}

export interface SleepInsight {
  tone: RecoveryTone;
  title: string;
  detail: string;
}

export interface SleepLatest {
  date: Date;
  score: number | null;
  scoreTone: RecoveryTone;
  durationMin: number | null;
  bedtimeMin: number | null;
  wakeMin: number | null;
  phases: SleepPhase[];
}

export interface SleepCoachView {
  hasData: boolean;
  /** Au moins une nuit avec phases, score ou horaires coucher/réveil. */
  hasDetailedData: boolean;
  latest: SleepLatest | null;
  avg: {
    score: number | null;
    durationMin: number | null;
    deepPct: number | null;
    remPct: number | null;
    nights: number;
  };
  regularityMin: number | null;
  recommendedBedtimeMin: number | null;
  targetDurationMin: number;
  insights: SleepInsight[];
}

const PHASE_COLORS = {
  deep: '#1e3a8a',
  rem: '#7c3aed',
  light: '#38bdf8',
  awake: '#f59e0b',
} as const;

export function formatClock(min: number | null): string {
  if (min == null) return '—';
  const norm = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(min: number | null): string {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h${String(m).padStart(2, '0')}`;
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Écart absolu médian (MAD) : mesure de dispersion robuste aux valeurs
 * aberrantes, contrairement à l'écart-type. Sert d'indicateur de régularité.
 */
function medianAbsoluteDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = median(values)!;
  return median(values.map((v) => Math.abs(v - m)));
}

/** Normalise une heure de coucher pour la moyenne autour de minuit
 * (les couchers après minuit, ex 00:30 = 30 min, deviennent 1470). */
function normalizeBedtime(min: number): number {
  return min < 720 ? min + 1440 : min;
}

function scoreTone(score: number | null): RecoveryTone {
  if (score == null) return 'neutral';
  if (score >= 80) return 'good';
  if (score >= 60) return 'moderate';
  return 'low';
}

function buildPhases(entry: SleepEntryInput): SleepPhase[] {
  const deep = entry.sleepDeepMin ?? 0;
  const rem = entry.sleepRemMin ?? 0;
  const light = entry.sleepLightMin ?? 0;
  const awake = entry.sleepAwakeMin ?? 0;
  const inBed = deep + rem + light + awake;
  const sleep = deep + rem + light;
  if (inBed === 0) return [];

  const pct = (v: number) => Math.round((v / inBed) * 100);
  const deepPct = sleep > 0 ? (deep / sleep) * 100 : 0;
  const remPct = sleep > 0 ? (rem / sleep) * 100 : 0;

  const deepTone: RecoveryTone = deepPct >= 13 ? 'good' : deepPct >= 9 ? 'moderate' : 'low';
  const remTone: RecoveryTone = remPct >= 20 ? 'good' : remPct >= 15 ? 'moderate' : 'low';

  return [
    {
      key: 'deep',
      label: 'Profond',
      minutes: deep,
      percent: pct(deep),
      color: PHASE_COLORS.deep,
      ideal: '13-23 %',
      tone: deepTone,
    },
    {
      key: 'rem',
      label: 'Paradoxal (REM)',
      minutes: rem,
      percent: pct(rem),
      color: PHASE_COLORS.rem,
      ideal: '20-25 %',
      tone: remTone,
    },
    {
      key: 'light',
      label: 'Léger',
      minutes: light,
      percent: pct(light),
      color: PHASE_COLORS.light,
      ideal: null,
      tone: 'neutral',
    },
    {
      key: 'awake',
      label: 'Éveillé',
      minutes: awake,
      percent: pct(awake),
      color: PHASE_COLORS.awake,
      ideal: null,
      tone: awake > 45 ? 'moderate' : 'neutral',
    },
  ];
}

function buildInsights(params: {
  avgDuration: number | null;
  avgDeepPct: number | null;
  avgRemPct: number | null;
  regularity: number | null;
  avgBedtime: number | null;
  recommendedBedtime: number | null;
  avgStress: number | null;
}): SleepInsight[] {
  const insights: SleepInsight[] = [];
  const {
    avgDuration,
    avgDeepPct,
    avgRemPct,
    regularity,
    avgBedtime,
    recommendedBedtime,
    avgStress,
  } = params;

  if (avgDuration != null && avgDuration < 420) {
    insights.push({
      tone: 'low',
      title: 'Durée de sommeil insuffisante',
      detail: `Tu dors en moyenne ${formatDuration(
        Math.round(avgDuration),
      )} par nuit. Vise 7h30-8h30 : avance ton coucher de 30 à 60 min pour laisser plus de place au sommeil profond et au REM.`,
    });
  } else if (avgDuration != null && avgDuration < 450) {
    insights.push({
      tone: 'moderate',
      title: 'Durée un peu juste',
      detail: `Moyenne de ${formatDuration(
        Math.round(avgDuration),
      )}. Gagner 15-30 min de sommeil améliorerait nettement ta récupération.`,
    });
  }

  if (avgDeepPct != null && avgDeepPct < 13) {
    insights.push({
      tone: avgDeepPct < 9 ? 'low' : 'moderate',
      title: 'Sommeil profond bas',
      detail: `Profond à ${Math.round(
        avgDeepPct,
      )} % (cible 13-23 %). Le profond se joue en début de nuit : évite l'alcool et les repas lourds le soir, baisse la température de la chambre (~18 °C) et évite les séances très intenses juste avant le coucher.`,
    });
  }

  if (avgRemPct != null && avgRemPct < 18) {
    insights.push({
      tone: avgRemPct < 15 ? 'low' : 'moderate',
      title: 'Sommeil paradoxal (REM) bas',
      detail: `REM à ${Math.round(
        avgRemPct,
      )} % (cible 20-25 %). Le REM est concentré en fin de nuit : dors suffisamment longtemps, garde des horaires réguliers et limite l'alcool qui le fragmente.`,
    });
  }

  if (regularity != null && regularity > 60) {
    insights.push({
      tone: 'moderate',
      title: 'Horaires irréguliers',
      detail: `Ton heure de coucher varie de ±${Math.round(
        regularity,
      )} min. Un coucher et un lever réguliers (même le week-end) stabilisent ton horloge interne et la qualité du sommeil.`,
    });
  }

  if (
    avgBedtime != null &&
    recommendedBedtime != null &&
    normalizeBedtime(avgBedtime) - normalizeBedtime(recommendedBedtime) > 45
  ) {
    insights.push({
      tone: 'moderate',
      title: 'Coucher tardif',
      detail: `Tu te couches vers ${formatClock(
        avgBedtime,
      )} en moyenne, plus tard que l'heure recommandée (${formatClock(
        recommendedBedtime,
      )}). Avancer le coucher protège surtout ton sommeil profond.`,
    });
  }

  if (avgStress != null && avgStress > 30) {
    insights.push({
      tone: 'moderate',
      title: 'Stress nocturne élevé',
      detail: `Stress moyen de ${Math.round(
        avgStress,
      )} pendant le sommeil. Une routine de décompression (respiration, lecture, pas d'écran 30 min avant) peut aider à abaisser ton stress nocturne.`,
    });
  }

  if (!insights.length) {
    insights.push({
      tone: 'good',
      title: 'Sommeil de qualité',
      detail:
        "Durée, phases et régularité sont dans les clous. Continue sur cette lancée : c'est un pilier de ta progression.",
    });
  }

  return insights.slice(0, 4);
}

export function analyzeSleep(entries: SleepEntryInput[]): SleepCoachView {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Nuits exploitables (fenêtre "habitudes") avec au moins des phases ou un score.
  const nights = sorted
    .filter(
      (e) =>
        e.sleepScore != null ||
        e.sleepDeepMin != null ||
        e.sleepRemMin != null ||
        e.sleepMinutes != null,
    )
    .slice(0, HABIT_WINDOW_NIGHTS);

  const empty: SleepCoachView = {
    hasData: false,
    hasDetailedData: false,
    latest: null,
    avg: {
      score: null,
      durationMin: null,
      deepPct: null,
      remPct: null,
      nights: 0,
    },
    regularityMin: null,
    recommendedBedtimeMin: null,
    targetDurationMin: TARGET_DURATION_MIN,
    insights: [],
  };

  if (!nights.length) return empty;

  const recent7 = nights.slice(0, RECENT_WINDOW_NIGHTS);

  const avgScore = avg(recent7.map((n) => n.sleepScore).filter((v): v is number => v != null));
  const avgDuration = avg(recent7.map((n) => n.sleepMinutes).filter((v): v is number => v != null));

  const deepPcts: number[] = [];
  const remPcts: number[] = [];
  for (const n of recent7) {
    const sleep = (n.sleepDeepMin ?? 0) + (n.sleepLightMin ?? 0) + (n.sleepRemMin ?? 0);
    if (sleep > 0) {
      if (n.sleepDeepMin != null) deepPcts.push((n.sleepDeepMin / sleep) * 100);
      if (n.sleepRemMin != null) remPcts.push((n.sleepRemMin / sleep) * 100);
    }
  }
  const avgDeepPct = avg(deepPcts);
  const avgRemPct = avg(remPcts);

  // Coucher conseillé & régularité : calculés sur la fenêtre "habitudes" (jusqu'à
  // HABIT_WINDOW_NIGHTS nuits) avec la médiane, pour ignorer les nuits atypiques.
  const bedtimes = nights
    .map((n) => n.sleepBedtimeMin)
    .filter((v): v is number => v != null)
    .map(normalizeBedtime);
  const wakes = nights.map((n) => n.sleepWakeMin).filter((v): v is number => v != null);
  const stresses = recent7.map((n) => n.sleepAvgStress).filter((v): v is number => v != null);

  const regularity = medianAbsoluteDeviation(bedtimes);
  const medianBedtimeNorm = median(bedtimes);
  const avgBedtime = medianBedtimeNorm != null ? medianBedtimeNorm % 1440 : null;
  const medianWake = median(wakes);

  let recommendedBedtime: number | null = null;
  if (medianWake != null) {
    const raw = medianWake - TARGET_DURATION_MIN - FALL_ASLEEP_BUFFER_MIN;
    recommendedBedtime = ((raw % 1440) + 1440) % 1440;
  }

  const [latestNight] = nights;
  const latest: SleepLatest = {
    date: latestNight.date,
    score: latestNight.sleepScore,
    scoreTone: scoreTone(latestNight.sleepScore),
    durationMin: latestNight.sleepMinutes,
    bedtimeMin: latestNight.sleepBedtimeMin,
    wakeMin: latestNight.sleepWakeMin,
    phases: buildPhases(latestNight),
  };

  const insights = buildInsights({
    avgDuration,
    avgDeepPct,
    avgRemPct,
    regularity,
    avgBedtime,
    recommendedBedtime,
    avgStress: avg(stresses),
  });

  const hasDetailedData = nights.some(
    (n) =>
      n.sleepScore != null ||
      n.sleepDeepMin != null ||
      n.sleepBedtimeMin != null ||
      n.sleepWakeMin != null,
  );

  return {
    hasData: true,
    hasDetailedData,
    latest,
    avg: {
      score: avgScore != null ? Math.round(avgScore) : null,
      durationMin: avgDuration != null ? Math.round(avgDuration) : null,
      deepPct: avgDeepPct != null ? Math.round(avgDeepPct) : null,
      remPct: avgRemPct != null ? Math.round(avgRemPct) : null,
      nights: nights.length,
    },
    regularityMin: regularity != null ? Math.round(regularity) : null,
    recommendedBedtimeMin: recommendedBedtime,
    targetDurationMin: TARGET_DURATION_MIN,
    insights,
  };
}
