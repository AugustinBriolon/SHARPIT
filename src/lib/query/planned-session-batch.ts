import { tempId } from '@/lib/query/optimistic';
import type { ClientPlannedSession } from '@/lib/query/types';
import type { ActivityType, SessionIntensity } from '@prisma/client';

/** Payload shape shared with planned-session mutations (client-side). */
export interface PlannedSessionBatchPayload {
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
  decisionId?: string | null;
}

export type PlannedSessionBatchOp =
  | { op: 'create'; payload: PlannedSessionBatchPayload }
  | { op: 'update'; id: string; data: Partial<PlannedSessionBatchPayload> }
  | { op: 'remove'; id: string };

function plannedSessionDefaults(now: Date) {
  return {
    activityId: null,
    analysis: null,
    analyzedAt: null,
    googleEventId: null,
    garminWorkoutId: null,
    garminWorkoutScheduledDate: null,
    garminWorkoutPushedAt: null,
    createdAt: now,
    updatedAt: now,
    activity: null,
  };
}

function asNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function payloadSessionFields(payload: PlannedSessionBatchPayload) {
  return {
    startTime: asNull(payload.startTime),
    title: asNull(payload.title),
    description: asNull(payload.description),
    strengthPrescription: asNull(payload.strengthPrescription),
    accessories: asNull(payload.accessories),
    durationMin: asNull(payload.durationMin),
    load: asNull(payload.load),
    intensity: asNull(payload.intensity),
    completed: payload.completed ?? false,
    goalId: asNull(payload.goalId),
  };
}

export function optimisticPlannedSession(
  payload: PlannedSessionBatchPayload,
  brick?: { groupId: string; order: number },
): ClientPlannedSession {
  const now = new Date();
  return {
    id: tempId(),
    type: payload.type,
    date: payload.date,
    ...payloadSessionFields(payload),
    brickGroupId: brick?.groupId ?? null,
    brickOrder: brick?.order ?? null,
    ...plannedSessionDefaults(now),
  } as unknown as ClientPlannedSession;
}

/** Apply ADD / MODIFY / REMOVE ops to a planned-session list in one pass (optimistic). */
export function applyPlannedSessionBatchOps(
  prev: ClientPlannedSession[],
  ops: PlannedSessionBatchOp[],
): ClientPlannedSession[] {
  let next = prev;
  for (const op of ops) {
    if (op.op === 'create') {
      next = [...next, optimisticPlannedSession(op.payload)];
      continue;
    }
    if (op.op === 'remove') {
      next = next.filter((s) => s.id !== op.id);
      continue;
    }
    next = next.map((s) =>
      s.id === op.id ? ({ ...s, ...op.data, updatedAt: new Date() } as ClientPlannedSession) : s,
    );
  }
  return next;
}

export function plannedSessionBatchSuccessMessage(ops: PlannedSessionBatchOp[]): string {
  const n = ops.length;
  if (n <= 0) {
    return 'Planning mis à jour';
  }
  if (n === 1) {
    return '1 ajustement appliqué';
  }
  return `${n} ajustements appliqués`;
}
