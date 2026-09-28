/**
 * A coach adjustment turned into planned-session writes: the coach's prescriptions normalized
 * for storage and the description rebuilt from them. One mapping for the web's adapter and the
 * native apply route (`/api/v1/coach/adapt/apply`), so an adjustment is stored the same way
 * whichever client applies it.
 */
import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { AdaptChange } from '@sharpit/app/lib/coach/plan/adapt-types';
import { resolveEnduranceFieldsForPersist } from '@sharpit/app/lib/planned-session/endurance/coach-endurance-prescription';
import { resolveStrengthFieldsForPersist } from '@sharpit/app/lib/planned-session/strength/strength-prescription';

/** The fields an adjustment writes on a planned session. */
export type AdaptSessionWrite = {
  type: ActivityType;
  date: Date;
  title?: string | null;
  description?: string | null;
  strengthPrescription?: unknown | null;
  endurancePrescription?: unknown | null;
  durationMin?: number | null;
  load?: number | null;
  intensity?: SessionIntensity | null;
  goalId?: string | null;
  decisionId?: string | null;
};

export type AdaptBatchOp =
  | { op: 'create'; payload: AdaptSessionWrite }
  | { op: 'update'; id: string; data: Partial<AdaptSessionWrite> }
  | { op: 'remove'; id: string };

/** What an adjustment reads of the session it modifies. */
export type AdaptExistingSession = {
  type: ActivityType;
  description: string | null;
  intensity: SessionIntensity | null;
};

function applyScalarModifyFields(change: AdaptChange, data: Partial<AdaptSessionWrite>): void {
  if (change.type) {
    data.type = change.type;
  }
  if (change.intensity) {
    data.intensity = change.intensity;
  }
  if (change.title !== null) {
    data.title = change.title;
  }
  if (change.description !== null) {
    data.description = change.description;
  }
  if (change.durationMin !== null) {
    data.durationMin = change.durationMin;
  }
  if (change.load !== null) {
    data.load = change.load;
  }
  if (change.date) {
    data.date = new Date(`${change.date}T12:00:00`);
  }
}

function shouldApplyStrengthFields(change: AdaptChange): boolean {
  return (
    change.strengthPrescription !== null || (change.type !== null && change.type !== 'STRENGTH')
  );
}

function applyStrengthModifyFields(
  change: AdaptChange,
  data: Partial<AdaptSessionWrite>,
  existing: AdaptExistingSession | undefined,
): void {
  if (!shouldApplyStrengthFields(change)) {
    return;
  }
  const strength = resolveStrengthFieldsForPersist({
    type: change.type ?? existing?.type ?? 'STRENGTH',
    description: change.description ?? existing?.description,
    strengthPrescription: change.strengthPrescription,
  });
  data.description = strength.description;
  data.strengthPrescription = strength.strengthPrescription;
}

function resolveEnduranceType(
  change: AdaptChange,
  existing: AdaptExistingSession | undefined,
): ActivityType {
  return change.type ?? existing?.type ?? 'RUN';
}

function resolveEnduranceModifyInput(
  change: AdaptChange,
  data: Partial<AdaptSessionWrite>,
  existing: AdaptExistingSession | undefined,
) {
  return {
    type: resolveEnduranceType(change, existing),
    description: data.description ?? change.description ?? existing?.description,
    intensity: change.intensity ?? existing?.intensity,
    endurancePrescription: change.endurancePrescription,
  };
}

function applyEnduranceModifyFields(
  change: AdaptChange,
  data: Partial<AdaptSessionWrite>,
  existing: AdaptExistingSession | undefined,
): void {
  if (change.endurancePrescription === null) {
    return;
  }
  const endurance = resolveEnduranceFieldsForPersist(
    resolveEnduranceModifyInput(change, data, existing),
  );
  data.description = endurance.description;
  data.endurancePrescription = endurance.endurancePrescription;
}

function buildModifyPayload(
  change: AdaptChange,
  sessionsById: Map<string, AdaptExistingSession>,
): AdaptBatchOp | null {
  if (change.action !== 'MODIFY' || !change.sessionId) {
    return null;
  }

  const data: Partial<AdaptSessionWrite> = {};
  applyScalarModifyFields(change, data);

  const existing = sessionsById.get(change.sessionId);
  applyStrengthModifyFields(change, data, existing);
  applyEnduranceModifyFields(change, data, existing);

  data.decisionId = change.decisionId;
  return { op: 'update', id: change.sessionId, data };
}

function buildAddPayload(change: AdaptChange, defaultGoalId: string | null): AdaptBatchOp | null {
  if (change.action !== 'ADD' || !change.date || !change.type) {
    return null;
  }

  const strength = resolveStrengthFieldsForPersist({
    type: change.type,
    description: change.description,
    strengthPrescription: change.strengthPrescription,
  });
  const endurance = resolveEnduranceFieldsForPersist({
    type: change.type,
    description: strength.description,
    intensity: change.intensity,
    endurancePrescription: change.endurancePrescription,
  });

  return {
    op: 'create',
    payload: {
      type: change.type,
      date: new Date(`${change.date}T12:00:00`),
      title: change.title,
      description: endurance.description,
      strengthPrescription: strength.strengthPrescription,
      endurancePrescription: endurance.endurancePrescription,
      durationMin: change.durationMin,
      load: change.load,
      intensity: change.intensity,
      goalId: defaultGoalId,
      decisionId: change.decisionId,
    },
  };
}

export function buildAdaptBatchOps(
  changes: AdaptChange[],
  sessionsById: Map<string, AdaptExistingSession>,
  defaultGoalId: string | null,
): AdaptBatchOp[] {
  const ops: AdaptBatchOp[] = [];

  for (const change of changes) {
    if (change.action === 'REMOVE' && change.sessionId) {
      ops.push({ op: 'remove', id: change.sessionId });
      continue;
    }

    const modifyOp = buildModifyPayload(change, sessionsById);
    if (modifyOp) {
      ops.push(modifyOp);
      continue;
    }

    const addOp = buildAddPayload(change, defaultGoalId);
    if (addOp) {
      ops.push(addOp);
    }
  }

  return ops;
}
