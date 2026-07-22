/**
 * Maps a ScenarioDefinition to a PlannedSession persistence operation.
 * Pure — no I/O. Shared by server apply and client optimistic patches.
 */

import type { SessionIntensity } from '@prisma/client';
import {
  INTENSITY_REDUCTION_TSS_FACTOR,
  type ScenarioDefinition,
  type ScenarioKind,
} from '@/core/scenario/types';
import { trainingDayIdToDate } from '@/lib/training/training-day';
import type { PlannedSessionExposureSetting } from '@/core/planned-session/types';

export type ScenarioApplyUpdateData = {
  date?: Date;
  intensity?: SessionIntensity | null;
  load?: number | null;
  exposureSetting?: PlannedSessionExposureSetting;
};

export type ScenarioApplyOp =
  | { op: 'none' }
  | { op: 'remove'; sessionId: string }
  | { op: 'update'; sessionId: string; data: ScenarioApplyUpdateData };

const INTENSITY_ORDER: SessionIntensity[] = [
  'RECOVERY',
  'ENDURANCE',
  'TEMPO',
  'THRESHOLD',
  'VO2MAX',
  'RACE',
];

export function stepDownIntensity(intensity: SessionIntensity | null): SessionIntensity | null {
  if (!intensity) return intensity;
  const index = INTENSITY_ORDER.indexOf(intensity);
  if (index <= 0) return intensity;
  return INTENSITY_ORDER[index - 1];
}

/** Build the DB mutation implied by a generated scenario definition. */
export function buildScenarioApplyOp(definition: ScenarioDefinition): ScenarioApplyOp {
  if (definition.kind === 'KEEP_PLAN' || !definition.targetSessionId) {
    return { op: 'none' };
  }

  if (definition.kind === 'REMOVE_SESSION') {
    return { op: 'remove', sessionId: definition.targetSessionId };
  }

  const modified = definition.modifiedSessions.find(
    (s) => s.sessionId === definition.targetSessionId,
  );
  if (!modified) return { op: 'none' };

  switch (definition.kind) {
    case 'REDUCE_INTENSITY':
      return {
        op: 'update',
        sessionId: definition.targetSessionId,
        data: {
          intensity: modified.intensity,
          load: modified.tss,
        },
      };

    case 'INDOOR':
      return {
        op: 'update',
        sessionId: definition.targetSessionId,
        data: { exposureSetting: 'INDOOR' },
      };

    case 'DELAY_SESSION':
    case 'MOVE_EARLIER':
      return {
        op: 'update',
        sessionId: definition.targetSessionId,
        data: { date: trainingDayIdToDate(modified.trainingDayId) },
      };

    default:
      return { op: 'none' };
  }
}

/** Client-side optimistic patch when modified slices are not available. */
export function optimisticSessionFieldsForKind(
  kind: ScenarioKind,
  current: {
    date: Date;
    intensity: SessionIntensity | null;
    load: number | null;
  },
): ScenarioApplyUpdateData | 'remove' | null {
  switch (kind) {
    case 'KEEP_PLAN':
      return null;
    case 'REMOVE_SESSION':
      return 'remove';
    case 'REDUCE_INTENSITY':
      return {
        intensity: stepDownIntensity(current.intensity),
        load:
          current.load != null ? Math.round(current.load * INTENSITY_REDUCTION_TSS_FACTOR) : null,
      };
    case 'INDOOR':
      return { exposureSetting: 'INDOOR' };
    case 'DELAY_SESSION': {
      const next = new Date(current.date);
      next.setDate(next.getDate() + 1);
      return { date: next };
    }
    case 'MOVE_EARLIER': {
      const prev = new Date(current.date);
      prev.setDate(prev.getDate() - 1);
      return { date: prev };
    }
    default:
      return null;
  }
}
