import type { CompositionMetricId } from '@/lib/composition-metric-guides';
import type { CorpsTone } from '@/lib/metric-tone';

/** Métriques avec comparaison « vs 7j préc. » sur la page composition. */
export type WeeklyDeltaMetricId = 'weightKg' | 'bmi' | 'bodyFatPct' | 'musclePct' | 'visceralFat';

/** Seuils de dérive hebdomadaire (alignés sur body-insights). */
export const WEEKLY_DRIFT_MIN = 0.3;
export const WEEKLY_DRIFT_STRONG = 0.8;

/**
 * Variation absolue plausibles sur 7 jours — au-delà : statut « verify »
 * (conditions de mesure, pas alerte santé).
 */
export const WEEKLY_VERIFY_THRESHOLD: Record<WeeklyDeltaMetricId, number> = {
  weightKg: 2,
  bmi: 1.5,
  bodyFatPct: 4,
  musclePct: 5,
  visceralFat: 4,
};

export const MEASUREMENT_VERIFY_HINT =
  'Écart inhabituel en 7 j — vérifie posture, pieds nus et centrés, et le moment de la pesée avant d’interpréter.';

export const AGE_DELTA_WATCH_YEARS = 3;
export const AGE_DELTA_ATTENTION_YEARS = 6;

/**
 * Sévérité douleur / posture (0–10, auto-évaluation sur Suivi physique).
 * Échelle distincte des deltas composition : 2/10 ≠ +2 kg sur 7 jours.
 * Seuils volontairement conservateurs — pas d'alerte sur léger inconfort (0–3).
 */
export const PHYSICAL_SEVERITY_WATCH_MIN = 4;
export const PHYSICAL_SEVERITY_ATTENTION_MIN = 7;

const SEVERITY: Record<CorpsTone, number> = {
  neutral: 0,
  ok: 1,
  watch: 2,
  verify: 3,
  attention: 4,
};

export type WeeklyDeltaStatus = {
  tone: CorpsTone;
  measurementHint: string | null;
};

export type WeeklyDeltaPresentation = {
  deltaDisplay: string | null;
  deltaTone: CorpsTone;
  deltaHint: string | null;
};

export function buildWeeklyDeltaPresentation(
  metricId: WeeklyDeltaMetricId,
  delta7d: number | null | undefined,
  formatDelta: (delta: number) => string | undefined,
): WeeklyDeltaPresentation {
  if (delta7d == null) {
    return { deltaDisplay: null, deltaTone: 'ok', deltaHint: null };
  }
  const { tone, measurementHint } = resolveWeeklyDeltaStatus(metricId, delta7d);
  return {
    deltaDisplay: formatDelta(delta7d) ?? null,
    deltaTone: tone,
    deltaHint: measurementHint,
  };
}

export function maxCorpsTone(a: CorpsTone, b: CorpsTone): CorpsTone {
  return SEVERITY[b] > SEVERITY[a] ? b : a;
}

export function isDeltaStatusTone(tone: CorpsTone): boolean {
  return tone === 'watch' || tone === 'verify' || tone === 'attention';
}

export function toWeeklyDeltaMetricId(metricId: CompositionMetricId): WeeklyDeltaMetricId | null {
  switch (metricId) {
    case 'bmi':
    case 'bodyFatPct':
    case 'musclePct':
    case 'visceralFat':
      return metricId;
    default:
      return null;
  }
}

/**
 * Statut unique à partir d'un delta 7j : ampleur, direction, plausibilité physiologique.
 * Utilisé pour le texte « vs 7j préc. » et pour élever le ton de la valeur affichée.
 */
export function resolveWeeklyDeltaStatus(
  metricId: WeeklyDeltaMetricId,
  delta7d: number,
): WeeklyDeltaStatus {
  const abs = Math.abs(delta7d);

  if (abs >= WEEKLY_VERIFY_THRESHOLD[metricId]) {
    return { tone: 'verify', measurementHint: MEASUREMENT_VERIFY_HINT };
  }

  switch (metricId) {
    case 'weightKg': {
      if (abs < WEEKLY_DRIFT_MIN) return { tone: 'ok', measurementHint: null };
      if (delta7d > 0) {
        return {
          tone: delta7d >= WEEKLY_DRIFT_STRONG ? 'attention' : 'watch',
          measurementHint: null,
        };
      }
      return { tone: 'ok', measurementHint: null };
    }
    case 'bodyFatPct':
    case 'visceralFat': {
      if (delta7d < WEEKLY_DRIFT_MIN) return { tone: 'ok', measurementHint: null };
      return {
        tone: delta7d >= WEEKLY_DRIFT_STRONG ? 'attention' : 'watch',
        measurementHint: null,
      };
    }
    case 'musclePct': {
      if (delta7d > -WEEKLY_DRIFT_MIN) return { tone: 'ok', measurementHint: null };
      return {
        tone: delta7d <= -WEEKLY_DRIFT_STRONG ? 'attention' : 'watch',
        measurementHint: null,
      };
    }
    case 'bmi': {
      if (abs < WEEKLY_DRIFT_MIN) return { tone: 'ok', measurementHint: null };
      return {
        tone: abs >= WEEKLY_DRIFT_STRONG ? 'attention' : 'watch',
        measurementHint: null,
      };
    }
    default:
      return { tone: 'ok', measurementHint: null };
  }
}

export function resolveMetricValueTone(
  zoneTone: CorpsTone,
  metricId: CompositionMetricId,
  delta7d: number | null | undefined,
): CorpsTone {
  const weeklyId = toWeeklyDeltaMetricId(metricId);
  if (weeklyId == null || delta7d == null) return zoneTone;
  const { tone: deltaTone } = resolveWeeklyDeltaStatus(weeklyId, delta7d);
  return maxCorpsTone(zoneTone, deltaTone);
}

/** Comparaison âge métrique vs âge chronologique (profil athlète). */
export function corpsToneFromAgeDelta(
  metricAge: number,
  chronologicalAgeYears: number | null,
): CorpsTone | null {
  if (chronologicalAgeYears == null) return null;
  const delta = metricAge - chronologicalAgeYears;
  if (delta >= AGE_DELTA_ATTENTION_YEARS) return 'attention';
  if (delta >= AGE_DELTA_WATCH_YEARS) return 'watch';
  return 'ok';
}

/** Statut visuel d'une note de sévérité 0–10 (Suivi physique). */
export function corpsToneFromPhysicalSeverity(severity: number | null | undefined): CorpsTone {
  if (severity == null) return 'neutral';
  if (severity >= PHYSICAL_SEVERITY_ATTENTION_MIN) return 'attention';
  if (severity >= PHYSICAL_SEVERITY_WATCH_MIN) return 'watch';
  return 'ok';
}
