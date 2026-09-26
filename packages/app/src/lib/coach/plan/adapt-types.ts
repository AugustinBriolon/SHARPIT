import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { CoachEndurancePrescription } from '@sharpit/app/lib/planned-session/endurance/coach-endurance-prescription';
import type { GateResult } from '@sharpit/app/lib/plan-gate/types';
import type { CoachStrengthPrescription } from '@sharpit/app/lib/planned-session/strength/strength-prescription';

/** The coach's plan adaptation contract, shared by the route and the web hook. */
export type AdaptAction = 'MODIFY' | 'REMOVE' | 'ADD';

export interface AdaptChange {
  action: AdaptAction;
  sessionId: string | null;
  date: string | null;
  type: ActivityType | null;
  intensity: SessionIntensity | null;
  title: string | null;
  description: string | null;
  strengthPrescription?: CoachStrengthPrescription | null;
  endurancePrescription?: CoachEndurancePrescription | null;
  durationMin: number | null;
  load: number | null;
  reason: string;
  /** Origin CoachingDecision id — null for REMOVE changes and non-gated proposals. */
  decisionId: string | null;
}

export interface AdaptPlanResult {
  summary: string;
  changes: AdaptChange[];
  gate: GateResult;
}
