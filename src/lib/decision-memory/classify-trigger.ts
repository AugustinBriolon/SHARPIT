/**
 * Adaptation experience — trigger classification.
 *
 * Labels *which category of Gate rule* fired for a proposal, from the already-computed
 * ruleCode. It never re-evaluates or duplicates a rule's own logic — purely a presentation
 * lookup over codes the Gate already produced (src/lib/plan-gate/rules/*.ts).
 */

import type { GateSessionResult } from '@/lib/plan-gate/types';

export type AdaptTriggerCategory =
  'PHYSIOLOGICAL_STATE' | 'SAFETY_POLICY' | 'CALENDAR' | 'GOAL' | 'ATHLETE_ACTION';

/** Maps every Gate ruleCode to the category an athlete would recognize as "why did this change". */
const RULE_CATEGORY: Record<string, AdaptTriggerCategory> = {
  // decision-compatibility.ts, weekly-load.ts, recovery-spacing.ts, intensity-distribution.ts
  // — all react to fatigue/load/recovery signals already inferred by Core.
  DECISION_INSUFFICIENT_DATA: 'PHYSIOLOGICAL_STATE',
  DECISION_INTENSITY_CONFLICT: 'PHYSIOLOGICAL_STATE',
  FATIGUE_REST_ONLY: 'PHYSIOLOGICAL_STATE',
  FATIGUE_LIGHT_ONLY: 'PHYSIOLOGICAL_STATE',
  WEEKLY_LOAD_EXCEEDED: 'PHYSIOLOGICAL_STATE',
  INSUFFICIENT_RECOVERY_SPACING: 'PHYSIOLOGICAL_STATE',
  INTENSITY_DISTRIBUTION_EXCEEDED: 'PHYSIOLOGICAL_STATE',

  // physical-health.ts, completed-conflict.ts, malformed-and-duplicate.ts — hard safety/integrity constraints.
  PHYSICAL_HEALTH_BLOCKED: 'SAFETY_POLICY',
  PHYSICAL_HEALTH_UNABLE: 'SAFETY_POLICY',
  PHYSICAL_HEALTH_LIMITED: 'SAFETY_POLICY',
  PHYSICAL_HEALTH_REDUCED: 'SAFETY_POLICY',
  COMPLETED_SESSION_IMMUTABLE: 'SAFETY_POLICY',
  COMPLETED_SESSION_CONFLICT: 'SAFETY_POLICY',
  MALFORMED_PROPOSAL: 'SAFETY_POLICY',
  PAST_DATE: 'SAFETY_POLICY',
  DUPLICATE_SESSION: 'SAFETY_POLICY',

  // calendar-conflict.ts
  CALENDAR_CONFLICT: 'CALENDAR',

  // goal-phase-coherence.ts, data-sufficiency.ts
  BEYOND_GOAL_HORIZON: 'GOAL',
  TAPER_LOAD_INCREASE: 'GOAL',
  MISSING_THRESHOLDS: 'GOAL',
};

/**
 * Classifies why a proposed change happened. No Gate findings at all means nothing
 * detected triggered it — the athlete or coach initiated it directly.
 */
export function classifyAdaptTrigger(gateResult: GateSessionResult | null): AdaptTriggerCategory {
  if (!gateResult || gateResult.findings.length === 0) return 'ATHLETE_ACTION';

  const categories = gateResult.findings.map((f) => RULE_CATEGORY[f.ruleCode] ?? 'ATHLETE_ACTION');

  // Most severe finding first (findings are not pre-sorted by severity, so scan in
  // GateStatus severity order to pick the category that actually decided gateResult.status).
  const severityOrder = ['REJECTED', 'REQUIRES_CONFIRMATION', 'WARNING'] as const;
  for (const severity of severityOrder) {
    const index = gateResult.findings.findIndex((f) => f.severity === severity);
    if (index !== -1) return categories[index];
  }

  return categories[0];
}
