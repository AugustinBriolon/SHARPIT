import type { PowerCurvePoint, RunBestCategory } from './records';

/**
 * Prédiction de performance & estimation des seuils à partir des records déjà
 * calculés (meilleurs temps de course, courbe de puissance).
 *
 * Tout est déterministe et pur (aucune IA, aucune base) : on extrapole les
 * meilleurs efforts réels via la formule de Riegel pour la course, et on dérive
 * la FTP / l'allure seuil depuis les meilleurs efforts soutenus.
 */

/** Exposant de la loi d'endurance de Riegel : T2 = T1 · (D2/D1)^1.06. */
const RIEGEL_EXPONENT = 1.06;

/** Distances cibles standard pour les prédictions de course (mètres). */
const RACE_TARGETS: { meters: number; label: string }[] = [
  { meters: 5000, label: '5 km' },
  { meters: 10000, label: '10 km' },
  { meters: 21097, label: 'Semi' },
  { meters: 42195, label: 'Marathon' },
];

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtPaceSecPerKm(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

interface RunReference {
  meters: number;
  seconds: number;
  label: string;
}

/** Niveau de confiance selon l'écart entre la distance de référence et la cible. */
export type PredictionConfidence = 'high' | 'medium' | 'low';

export interface RunPrediction {
  meters: number;
  label: string;
  seconds: number;
  displayTime: string;
  paceSecPerKm: number;
  pace: string;
  referenceLabel: string;
  confidence: PredictionConfidence;
}

/** Référence d'effort réel (meilleur #1) par distance, triée. */
function collectRunReferences(runBests: RunBestCategory[]): RunReference[] {
  return runBests
    .map((cat) => {
      const [best] = cat.entries;
      if (!best || best.value <= 0) return null;
      return { meters: cat.meters, seconds: best.value, label: cat.label };
    })
    .filter((r): r is RunReference => r != null)
    .sort((a, b) => a.meters - b.meters);
}

function confidenceFromRatio(ratio: number): PredictionConfidence {
  const r = ratio >= 1 ? ratio : 1 / ratio;
  if (r <= 1.6) return 'high';
  if (r <= 3) return 'medium';
  return 'low';
}

/**
 * Prédit les temps de course sur les distances standard.
 * Pour chaque cible, on choisit la référence réelle la plus proche (échelle log)
 * afin de minimiser l'erreur d'extrapolation.
 */
export function predictRunRaces(runBests: RunBestCategory[]): RunPrediction[] {
  const refs = collectRunReferences(runBests);
  if (refs.length === 0) return [];

  return RACE_TARGETS.map(({ meters, label }) => {
    const ref = refs.reduce((best, cur) =>
      Math.abs(Math.log(cur.meters / meters)) < Math.abs(Math.log(best.meters / meters))
        ? cur
        : best,
    );

    const seconds = ref.seconds * (meters / ref.meters) ** RIEGEL_EXPONENT;
    const paceSecPerKm = (seconds / meters) * 1000;

    return {
      meters,
      label,
      seconds: Math.round(seconds),
      displayTime: fmtTime(seconds),
      paceSecPerKm: Math.round(paceSecPerKm),
      pace: fmtPaceSecPerKm(paceSecPerKm),
      referenceLabel: ref.label,
      confidence: confidenceFromRatio(meters / ref.meters),
    };
  });
}

/**
 * Allure seuil estimée (s/km) ≈ allure soutenable ~1 h.
 * On extrapole la distance couverte en 3600 s depuis la meilleure référence,
 * puis on en déduit l'allure.
 */
export function estimateRunThresholdPace(runBests: RunBestCategory[]): number | null {
  const refs = collectRunReferences(runBests);
  if (refs.length === 0) return null;

  // Référence la plus proche d'un effort d'1 h (la plus longue est la plus
  // représentative du seuil).
  const ref = refs[refs.length - 1];
  const distanceIn1h = ref.meters * (3600 / ref.seconds) ** (1 / RIEGEL_EXPONENT);
  if (distanceIn1h <= 0) return null;
  return Math.round((3600 / distanceIn1h) * 1000);
}

export interface FtpEstimate {
  watts: number;
  source: string;
}

/** Facteur appliqué au meilleur effort d'une durée pour estimer la FTP. */
const FTP_FACTORS: { seconds: number; factor: number; label: string }[] = [
  { seconds: 3600, factor: 0.97, label: 'meilleur 60 min' },
  { seconds: 1800, factor: 0.95, label: 'meilleur 30 min' },
  { seconds: 1200, factor: 0.95, label: 'meilleur 20 min' },
  { seconds: 600, factor: 0.9, label: 'meilleur 10 min' },
];

/** Estime la FTP vélo depuis la courbe de puissance (meilleure source dispo). */
export function estimateFtp(powerCurve: PowerCurvePoint[]): FtpEstimate | null {
  const byDuration = new Map(powerCurve.map((p) => [p.seconds, p.watts]));
  for (const { seconds, factor, label } of FTP_FACTORS) {
    const watts = byDuration.get(seconds);
    if (watts && watts > 0) {
      return { watts: Math.round(watts * factor), source: label };
    }
  }
  return null;
}
