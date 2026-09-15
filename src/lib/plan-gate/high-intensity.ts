/**
 * Shared intensity sets for legacy plan-gate rules.
 * Aligned with Plan soft intensity-gate (Science Sport): TEMPO is hard under RECOVER/CAUTION.
 *
 * @see src/lib/plan/trajectory/intensity-gate.ts
 * @see docs/science/reliability-grid-v0.md §6
 */

import { HARD_SESSION_INTENSITIES } from '@/lib/plan/trajectory/intensity-gate';

/** High / hard intensities withheld under RECOVER / CAUTION (includes TEMPO). */
export const PLAN_GATE_HIGH_INTENSITY = new Set<string>(HARD_SESSION_INTENSITIES);
