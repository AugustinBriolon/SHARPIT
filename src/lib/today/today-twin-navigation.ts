import {
  resolveConfidenceHrefFromDecision,
  resolveLimitingFactorHrefFromDecision,
} from '@/lib/decision/projection';
import { plannedSessionHref } from '@/lib/planned-session/display/session-analysis-display';

/**
 * Canonical drill-down routes for Digital Twin dimensions on Today.
 */
export const TWIN_DRILL_DOWN = {
  sleep: '/today/sleep',
  recovery: '/today/recovery',
  effort: '/today/effort',
  adaptation: '/today/adaptation',
  physical: '/progress?tab=body',
  sessions: '/training',
  /** The thresholds every load figure is computed against — a setting, so Settings. */
  calibration: '/progress?tab=performance',
  /** Observed best efforts: what the body produced, so Physiologie. */
  records: '/progress?tab=performance',
  planning: '/training/planning',
  activity: (id: string) => `/training/${id}` as const,
  /** Deep-link to Planning with dialog (bookmarks / share). Prefer `useAppModal().openPlannedSession` in-app. */
  plannedSession: plannedSessionHref,
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

/**
 * Which dimension a drill-down link points at.
 *
 * The limiter reaches the home screen as a route, because that is what the
 * decision layer produces. Reading the dimension back out of it belongs here,
 * next to the map that defines the routes, rather than as string matching
 * scattered through whatever component needs to know.
 */
export function twinDimensionFromHref(href: string | null): TwinDimension | null {
  if (!href) return null;
  const match = (Object.keys(TWIN_DIMENSION_LABEL) as TwinDimension[]).find(
    (dimension) => TWIN_DRILL_DOWN[dimension] === href,
  );
  return match ?? null;
}

export const TRAJECTORY_DRILL_DOWNS: { dimension: TwinDimension; href: string }[] = [
  { dimension: 'sleep', href: TWIN_DRILL_DOWN.sleep },
  { dimension: 'recovery', href: TWIN_DRILL_DOWN.recovery },
  { dimension: 'effort', href: TWIN_DRILL_DOWN.effort },
  { dimension: 'adaptation', href: TWIN_DRILL_DOWN.adaptation },
];

export { resolveConfidenceHrefFromDecision, resolveLimitingFactorHrefFromDecision };
