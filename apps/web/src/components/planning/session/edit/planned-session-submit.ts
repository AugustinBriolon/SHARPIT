'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { ClientPlannedSession } from '@/lib/query/types';
import type { usePlannedSessionFormState } from '@/components/planning/session/edit/use-planned-session-form-state';
import type { usePlannedSessionLocationQueries } from '@/components/planning/session/edit/use-planned-session-dialog-effects';
import type { usePlannedSessionMutations } from '@/hooks/use-data';
import { queryKeys } from '@/lib/query/keys';
import {
  buildBrickCreatePayload,
  buildSessionCreateData,
  buildSessionUpdateData,
  validateSessionDescription,
  validateStrengthRows,
  type LocationInput,
} from '@/components/planning/session/edit/planned-session-submit-helpers';
import type {
  CreateMode,
  BrickLegForm,
} from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { StrengthPrescriptionDraftRow } from '@/components/planning/session/edit/strength-prescription-editor';
import type { EnduranceDraftBlock } from '@/lib/planned-session/endurance/endurance-draft';
import type { EquipmentItemId } from '@/lib/equipment/catalog';
import { ActivityType, SessionIntensity } from '@prisma/client';

type FormState = ReturnType<typeof usePlannedSessionFormState>;
type LocationQueries = ReturnType<typeof usePlannedSessionLocationQueries>;
type Mutations = ReturnType<typeof usePlannedSessionMutations>;

export async function submitPlannedSessionDialogForm({
  e,
  form,
  guardDisabled,
  session,
  homeQuery,
  travelQuery,
  queryClient,
  onClose,
  update,
  create,
  createBrick,
}: {
  e: React.FormEvent<HTMLFormElement>;
  form: FormState;
  guardDisabled: boolean;
  session?: ClientPlannedSession | null;
  homeQuery: LocationQueries['homeQuery'];
  travelQuery: LocationQueries['travelQuery'];
  queryClient: ReturnType<typeof useQueryClient>;
  onClose: () => void;
  update: Mutations['update'];
  create: Mutations['create'];
  createBrick: Mutations['createBrick'];
}) {
  e.preventDefault();
  form.setError(null);
  await submitPlannedSessionForm({
    formData: new FormData(e.currentTarget),
    guardDisabled,
    isEdit: form.isEdit,
    session,
    createMode: form.createMode,
    type: form.type,
    intensity: form.intensity,
    goalId: form.goalId,
    locationInput: {
      showOutdoorContext: form.showOutdoorContext,
      exposure: form.exposure,
      locationSource: form.locationSource,
      home: homeQuery.data?.home,
      travel: travelQuery.data?.active,
      customPlace: form.customPlace,
    },
    strengthRows: form.strengthRows,
    enduranceBlocks: form.enduranceBlocks,
    accessories: form.accessories,
    legs: form.legs,
    queryClient,
    onError: form.setError,
    onClose,
    setMode: form.setMode,
    update,
    create,
    createBrick,
  });
}

export async function deletePlannedSessionDialog({
  session,
  guardDisabled,
  confirm,
  form,
  remove,
  onClose,
}: {
  session: ClientPlannedSession;
  guardDisabled: boolean;
  confirm: (opts: {
    title: string;
    description: string;
    confirmLabel: string;
    variant: 'destructive';
  }) => Promise<boolean>;
  form: FormState;
  remove: Mutations['remove'];
  onClose: () => void;
}) {
  if (guardDisabled) {
    return;
  }
  const confirmed = await confirm({
    title: 'Supprimer cette séance planifiée ?',
    description: 'Cette action est définitive.',
    confirmLabel: 'Supprimer',
    variant: 'destructive',
  });
  if (!confirmed) {
    return;
  }
  form.setError(null);
  remove.mutate(session.id, {
    onError: (err) => {
      form.setError(err instanceof Error ? err.message : 'Erreur');
    },
  });
  onClose();
}

type PlannedSessionMutations = ReturnType<typeof usePlannedSessionMutations>;

export type SubmitPlannedSessionFormInput = {
  formData: FormData;
  guardDisabled: boolean;
  isEdit: boolean;
  session?: ClientPlannedSession | null;
  createMode: CreateMode;
  type: ActivityType;
  intensity: SessionIntensity;
  goalId: string;
  locationInput: LocationInput;
  strengthRows: StrengthPrescriptionDraftRow[];
  enduranceBlocks: EnduranceDraftBlock[];
  accessories: EquipmentItemId[];
  legs: BrickLegForm[];
  queryClient: QueryClient;
  onError: (message: string) => void;
  onClose: () => void;
  setMode: (mode: 'read' | 'edit') => void;
  update: PlannedSessionMutations['update'];
  create: PlannedSessionMutations['create'];
  createBrick: PlannedSessionMutations['createBrick'];
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
