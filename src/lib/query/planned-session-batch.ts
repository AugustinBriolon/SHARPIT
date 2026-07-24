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

export function optimisticPlannedSession(
  payload: PlannedSessionBatchPayload,
  brick?: { groupId: string; order: number },
): ClientPlannedSession {
  const now = new Date();
  return {
    id: tempId(),
    type: payload.type,
    date: payload.date,
    startTime: payload.startTime ?? null,
    title: payload.title ?? null,
    description: payload.description ?? null,
    strengthPrescription: payload.strengthPrescription ?? null,
    durationMin: payload.durationMin ?? null,
    load: payload.load ?? null,
    intensity: payload.intensity ?? null,
    completed: payload.completed ?? false,
    goalId: payload.goalId ?? null,
    brickGroupId: brick?.groupId ?? null,
    brickOrder: brick?.order ?? null,
    activityId: null,
    analysis: null,
    analyzedAt: null,
    googleEventId: null,
    createdAt: now,
    updatedAt: now,
    activity: null,
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
  if (n <= 0) return 'Planning mis à jour';
  if (n === 1) return '1 ajustement appliqué';
  return `${n} ajustements appliqués`;
}
