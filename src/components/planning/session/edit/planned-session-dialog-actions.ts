'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { ClientPlannedSession } from '@/lib/query/types';
import {
  buildLocationInput,
  submitPlannedSessionForm,
} from '@/components/planning/session/edit/planned-session-form-submit';
import type { usePlannedSessionFormState } from '@/components/planning/session/edit/use-planned-session-form-state';
import type { usePlannedSessionLocationQueries } from '@/components/planning/session/edit/use-planned-session-location-queries';
import type { usePlannedSessionMutations } from '@/hooks/use-data';

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
    locationInput: buildLocationInput({
      showOutdoorContext: form.showOutdoorContext,
      exposure: form.exposure,
      locationSource: form.locationSource,
      home: homeQuery.data?.home,
      travel: travelQuery.data?.active,
      customPlace: form.customPlace,
    }),
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
