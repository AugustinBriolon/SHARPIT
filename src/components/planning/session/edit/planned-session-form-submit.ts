import type { ClientPlannedSession } from '@/lib/query/types';
import { queryKeys } from '@/lib/query/keys';
import type { QueryClient } from '@tanstack/react-query';
import {
  buildBrickCreatePayload,
  buildSessionCreateData,
  buildSessionUpdateData,
  validateSessionDescription,
  validateStrengthRows,
} from '@/components/planning/session/edit/planned-session-submit-helpers';
import type {
  CreateMode,
  BrickLegForm,
} from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { StrengthPrescriptionDraftRow } from '@/components/planning/session/edit/strength-prescription-editor';
import type { EnduranceDraftBlock } from '@/lib/planned-session/endurance/endurance-draft';
import type { EquipmentItemId } from '@/lib/equipment/catalog';
import { ActivityType, SessionIntensity } from '@prisma/client';
import { buildLocationInput } from '@/components/planning/session/edit/planned-session-location-input';

export type SubmitPlannedSessionFormInput = {
  formData: FormData;
  guardDisabled: boolean;
  isEdit: boolean;
  session?: ClientPlannedSession | null;
  createMode: CreateMode;
  type: ActivityType;
  intensity: SessionIntensity;
  goalId: string;
  locationInput: ReturnType<typeof buildLocationInput>;
  strengthRows: StrengthPrescriptionDraftRow[];
  enduranceBlocks: EnduranceDraftBlock[];
  accessories: EquipmentItemId[];
  legs: BrickLegForm[];
  queryClient: QueryClient;
  onError: (message: string) => void;
  onClose: () => void;
  setMode: (mode: 'read' | 'edit') => void;
  update: { mutate: (args: unknown, opts?: { onError?: (err: unknown) => void }) => void };
  create: { mutate: (args: unknown, opts?: { onError?: (err: unknown) => void }) => void };
  createBrick: { mutate: (args: unknown, opts?: { onError?: (err: unknown) => void }) => void };
};

function submitExistingSession(
  input: SubmitPlannedSessionFormInput,
  onMutationError: (err: unknown) => void,
): boolean {
  if (!input.isEdit || !input.session) {
    return false;
  }
  const data = buildSessionUpdateData({
    formData: input.formData,
    session: input.session,
    type: input.type,
    intensity: input.intensity,
    goalId: input.goalId,
    ...input.locationInput,
    strengthRows: input.strengthRows,
    enduranceBlocks: input.enduranceBlocks,
    accessories: input.accessories,
  });
  const descError = validateSessionDescription(input.type, data.description);
  if (descError) {
    input.onError(descError);
    return true;
  }
  input.update.mutate({ id: input.session.id, data }, { onError: onMutationError });
  void input.queryClient.invalidateQueries({
    queryKey: queryKeys.plannedSessionPresentation(input.session.id),
  });
  input.setMode('read');
  return true;
}

function submitBrickSession(
  input: SubmitPlannedSessionFormInput,
  onMutationError: (err: unknown) => void,
): boolean {
  if (input.createMode !== 'brick') {
    return false;
  }
  if (input.legs.length < 2) {
    input.onError('Un brick nécessite au moins 2 sports (ex. vélo + course).');
    return true;
  }
  input.createBrick.mutate(buildBrickCreatePayload(input.formData, input.goalId, input.legs), {
    onError: onMutationError,
  });
  input.onClose();
  return true;
}

function submitSingleSession(
  input: SubmitPlannedSessionFormInput,
  onMutationError: (err: unknown) => void,
) {
  const data = buildSessionCreateData({
    formData: input.formData,
    type: input.type,
    intensity: input.intensity,
    goalId: input.goalId,
    ...input.locationInput,
    strengthRows: input.strengthRows,
    enduranceBlocks: input.enduranceBlocks,
    accessories: input.accessories,
  });
  const descError = validateSessionDescription(input.type, data.description);
  if (descError) {
    input.onError(descError);
    return;
  }
  input.create.mutate(data, { onError: onMutationError });
  input.onClose();
}

export async function submitPlannedSessionForm(input: SubmitPlannedSessionFormInput) {
  if (input.guardDisabled) {
    return;
  }

  const strengthError = validateStrengthRows(input.createMode, input.type, input.strengthRows);
  if (strengthError) {
    input.onError(strengthError);
    return;
  }

  const onMutationError = (err: unknown) => {
    input.onError(err instanceof Error ? err.message : 'Erreur');
  };

  if (submitExistingSession(input, onMutationError)) {
    return;
  }
  if (submitBrickSession(input, onMutationError)) {
    return;
  }
  submitSingleSession(input, onMutationError);
}

export { buildLocationInput } from '@/components/planning/session/edit/planned-session-location-input';
