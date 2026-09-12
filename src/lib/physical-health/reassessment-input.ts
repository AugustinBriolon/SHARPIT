/**
 * What a follow-up asks the athlete, and what their answer means.
 *
 * Two things are collected, never one: how much it hurts, and what they could
 * still do. The engine treats them as different evidence — pain 2/10 with a
 * session abandoned is not pain 7/10 with the session completed — but the UI
 * used to record only severity and let the impact be guessed from it.
 *
 * Pure: no I/O, no React.
 */

export type ReassessmentTrend = 'better' | 'same' | 'worse';

/** Athlete-facing impact choices. The engine's five levels are not a UI menu. */
export type ImpactChoice = 'normal' | 'reduced' | 'stopped';

export type FunctionalImpactValue = 'NONE' | 'MILD' | 'MODERATE' | 'LIMITING' | 'STOPPED';

/** One tap moves the reading by this much — a follow-up is a nudge, not a re-diagnosis. */
export const TREND_SEVERITY_STEP = 2;

const TREND_LABELS: Record<ReassessmentTrend, string> = {
  better: 'Mieux',
  same: 'Pareil',
  worse: 'Moins bien',
};

const IMPACT_LABELS: Record<ImpactChoice, string> = {
  normal: 'Entraînement normal',
  reduced: 'Entraînement réduit',
  stopped: 'Entraînement arrêté',
};

const IMPACT_TO_ENUM: Record<ImpactChoice, FunctionalImpactValue> = {
  normal: 'NONE',
  reduced: 'MODERATE',
  stopped: 'STOPPED',
};

export function trendLabel(trend: ReassessmentTrend): string {
  return TREND_LABELS[trend];
}

export function impactLabel(choice: ImpactChoice): string {
  return IMPACT_LABELS[choice];
}

export function impactToFunctionalImpact(choice: ImpactChoice): FunctionalImpactValue {
  return IMPACT_TO_ENUM[choice];
}

export function clampSeverity(value: number): number {
  return Math.min(10, Math.max(0, Math.round(value)));
}

/**
 * Severity implied by a one-tap trend. "Pareil" keeps the current reading
 * rather than resetting it, so answering quickly still records the truth.
 */
export function severityForTrend(current: number | null, trend: ReassessmentTrend): number {
  const base = current ?? 5;
  if (trend === 'same') {
    return clampSeverity(base);
  }
  const delta = trend === 'better' ? -TREND_SEVERITY_STEP : TREND_SEVERITY_STEP;
  return clampSeverity(base + delta);
}

/** The impact a trend suggests, so one tap fills both fields without lying. */
export function impactForTrend(
  trend: ReassessmentTrend,
  current: ImpactChoice | null,
): ImpactChoice {
  if (trend === 'better') {
    return current === 'stopped' ? 'reduced' : 'normal';
  }
  if (trend === 'worse') {
    return current === 'normal' ? 'reduced' : 'stopped';
  }
  return current ?? 'normal';
}

/** Reading back an existing observation into the three-choice UI. */
export function impactChoiceFromFunctionalImpact(
  value: FunctionalImpactValue | null | undefined,
): ImpactChoice | null {
  if (!value) {
    return null;
  }
  if (value === 'NONE' || value === 'MILD') {
    return 'normal';
  }
  return value === 'STOPPED' ? 'stopped' : 'reduced';
}
