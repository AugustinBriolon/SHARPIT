import type { LimitingFactor, ReasoningData } from '@/hooks/use-today';

/**
 * Canonical drill-down routes for Digital Twin dimensions on Today.
 *
 * Each major inference model maps to exactly one exploration page under /today/*.
 */
export const TWIN_DRILL_DOWN = {
  sleep: '/today/sleep',
  recovery: '/today/recovery',
  effort: '/today/effort',
  adaptation: '/today/adaptation',
  sessions: '/seances',
  planning: '/seances?tab=planning',
  activity: (id: string) => `/training/${id}` as const,
} as const;

export type TwinDimension = 'sleep' | 'recovery' | 'effort' | 'adaptation';

export const TWIN_DIMENSION_LABEL: Record<TwinDimension, string> = {
  sleep: 'Sommeil',
  recovery: 'Récupération',
  effort: 'Effort',
  adaptation: 'Adaptation',
};

export function twinDrillDownHref(dimension: TwinDimension): string {
  return TWIN_DRILL_DOWN[dimension];
}

/** Maps reasoning / limiting-factor system to the owning Twin page. */
export function resolveLimitingFactorHref(
  limitingFactor: LimitingFactor | null | undefined,
): string | null {
  if (!limitingFactor?.system) return null;
  switch (limitingFactor.system) {
    case 'RECOVERY':
      return TWIN_DRILL_DOWN.recovery;
    case 'FATIGUE':
      return TWIN_DRILL_DOWN.effort;
    case 'ADAPTATION':
      return TWIN_DRILL_DOWN.adaptation;
    default:
      return null;
  }
}

/** Confidence strip links to the model driving today's synthesis. */
export function resolveConfidenceHref(reasoning: ReasoningData | null | undefined): string {
  const priority = reasoning?.systemAttentionPriority;
  switch (priority) {
    case 'FATIGUE':
      return TWIN_DRILL_DOWN.effort;
    case 'ADAPTATION':
      return TWIN_DRILL_DOWN.adaptation;
    case 'RECOVERY':
    case 'BALANCED':
    default:
      return TWIN_DRILL_DOWN.recovery;
  }
}

export const TRAJECTORY_DRILL_DOWNS: { dimension: TwinDimension; href: string }[] = [
  { dimension: 'sleep', href: TWIN_DRILL_DOWN.sleep },
  { dimension: 'recovery', href: TWIN_DRILL_DOWN.recovery },
  { dimension: 'effort', href: TWIN_DRILL_DOWN.effort },
  { dimension: 'adaptation', href: TWIN_DRILL_DOWN.adaptation },
];
