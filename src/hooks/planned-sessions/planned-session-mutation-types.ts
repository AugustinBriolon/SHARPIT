import type { ActivityType, SessionIntensity } from '@prisma/client';

export interface PlannedSessionPayload {
  type: ActivityType;
  date: Date;
  startTime?: string | null;
  title?: string | null;
  description?: string | null;
  strengthPrescription?: unknown | null;
  endurancePrescription?: unknown | null;
  accessories?: string[] | null;
  durationMin?: number | null;
  load?: number | null;
  intensity?: SessionIntensity | null;
  goalId?: string | null;
  completed?: boolean;
  exposureSetting?: 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null;
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationType?: 'TRACK' | 'ROAD' | 'TRAIL' | 'POOL' | 'GYM' | 'TRAINER' | 'UNKNOWN' | null;
  /** Origin CoachingDecision id — ACCEPTED action recorded server-side when present. */
  decisionId?: string | null;
}

export interface BrickLegPayload {
  type: ActivityType;
  title?: string | null;
  description?: string | null;
  durationMin?: number | null;
  load?: number | null;
  intensity?: SessionIntensity | null;
}

export interface CreateBrickPayload {
  date: Date;
  startTime?: string | null;
  /** Option B — stamped on every brick leg. */
  goalId?: string | null;
  legs: BrickLegPayload[];
}

/** `silent` suppresses the generic toast when the caller raises its own. */
export type PlannedSessionUpdateVars = {
  id: string;
  data: Partial<PlannedSessionPayload>;
  silent?: boolean;
};
