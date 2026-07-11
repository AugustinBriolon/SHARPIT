import {
  resolveConfidenceHrefFromDecision,
  resolveLimitingFactorHrefFromDecision,
} from '@/lib/decision/projection';

/**
 * Canonical drill-down routes for Digital Twin dimensions on Today.
 */
export const TWIN_DRILL_DOWN = {
  sleep: '/today/sleep',
  recovery: '/today/recovery',
  effort: '/today/effort',
  adaptation: '/today/adaptation',
  physical: '/biology?tab=suivi',
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

export const TRAJECTORY_DRILL_DOWNS: { dimension: TwinDimension; href: string }[] = [
  { dimension: 'sleep', href: TWIN_DRILL_DOWN.sleep },
  { dimension: 'recovery', href: TWIN_DRILL_DOWN.recovery },
  { dimension: 'effort', href: TWIN_DRILL_DOWN.effort },
  { dimension: 'adaptation', href: TWIN_DRILL_DOWN.adaptation },
];

export { resolveConfidenceHrefFromDecision, resolveLimitingFactorHrefFromDecision };
