import { isSameDay, subDays } from 'date-fns';
import {
  mapRestorativeSleepRatioToRaw,
  sleepDebtModifier,
} from '@/core/inference/recovery/scoring';

export const SLEEP_TARGET_MIN = 450; // 7h 30m

export function formatSleepDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function computeRestorativeRatio(
  deepMin: number | null,
  remMin: number | null,
  totalMin: number | null,
): number | null {
  if (deepMin == null || remMin == null || totalMin == null || totalMin <= 0) return null;
  return Math.round(((deepMin + remMin) / totalMin) * 100);
}

/** Dette cumulée 7 nuits (alignée sur recovery-extractor). */
export function computeSleepDebt7d(
  entries: { date: Date | string; sleepMinutes: number | null }[],
  refDate: Date = new Date(),
  targetMin: number = SLEEP_TARGET_MIN,
): number | null {
  const last7 = entries.filter((e) => {
    const d = new Date(e.date);
    return d >= subDays(refDate, 6) && e.sleepMinutes != null;
  });
  if (last7.length === 0) return null;
  const totalActual = last7.reduce((sum, e) => sum + (e.sleepMinutes ?? 0), 0);
  return targetMin * last7.length - totalActual;
}

export type SleepScoreBreakdown = {
  restorativeRatio: number | null;
  rawScore: number | null;
  debtMin: number | null;
  debtModifier: number;
  sharpitScore: number | null;
};

export function buildSleepScoreBreakdown(
  deepMin: number | null,
  remMin: number | null,
  totalMin: number | null,
  debtMin: number | null,
): SleepScoreBreakdown {
  const restorativeRatio = computeRestorativeRatio(deepMin, remMin, totalMin);
  const rawScore =
    restorativeRatio != null ? mapRestorativeSleepRatioToRaw(restorativeRatio) : null;
  // Dette : contexte coach uniquement — n'impacte plus le score de la nuit.
  const debtModifier = debtMin != null && debtMin > 30 ? sleepDebtModifier(debtMin) : 1;
  const sharpitScore = rawScore != null ? Math.round(Math.min(100, Math.max(0, rawScore))) : null;

  return { restorativeRatio, rawScore, debtMin, debtModifier, sharpitScore };
}

export type SleepHealthEntry = {
  date: Date | string;
  sleepMinutes: number | null;
  sleepDeepMin?: number | null;
  sleepRemMin?: number | null;
};

/** Score SHARPIT sommeil pour un jour — même formule que /today/sleep. */
export function computeSharpitSleepScoreForDay(
  entries: SleepHealthEntry[],
  refDate: Date = new Date(),
  targetMin: number = SLEEP_TARGET_MIN,
): number | null {
  const entry = entries.find((e) => isSameDay(new Date(e.date), refDate));
  if (!entry) return null;
  const debt = computeSleepDebt7d(entries, refDate, targetMin);
  return buildSleepScoreBreakdown(
    entry.sleepDeepMin ?? null,
    entry.sleepRemMin ?? null,
    entry.sleepMinutes ?? null,
    debt,
  ).sharpitScore;
}

export function restorativeRatioLabel(ratio: number): string {
  if (ratio >= 55) return 'au-dessus de la norme';
  if (ratio >= 40) return 'dans la norme adulte (40–55 %)';
  if (ratio >= 32) return 'légèrement sous la norme';
  return 'sous la norme';
}

export type SleepAdequacyLevel =
  'EXCELLENT' | 'ADEQUATE' | 'INSUFFICIENT' | 'SEVERELY_INSUFFICIENT';

/** Aligné sur classifySleepAdequacy du moteur recovery. */
export function mapSleepScoreToAdequacy(score: number | null): SleepAdequacyLevel {
  if (score === null) return 'INSUFFICIENT';
  if (score >= 90) return 'EXCELLENT';
  if (score >= 70) return 'ADEQUATE';
  if (score >= 40) return 'INSUFFICIENT';
  return 'SEVERELY_INSUFFICIENT';
}
