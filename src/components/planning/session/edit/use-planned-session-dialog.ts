'use client';

import { useMemo } from 'react';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useDemoPlannedSessionOverlay } from '@/hooks/use-demo-session-link-overlay';
import {
  usePlannedSessionMutations,
  usePlannedSessionPresentation,
  usePlannedSessions,
  useSessionRationalePresentation,
  useTrainingPlan,
} from '@/hooks/use-data';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import type { MorningProposalCompareInput } from '@/lib/today/morning-proposal-compare';
import { useQueryClient } from '@tanstack/react-query';
import { usePlannedSessionLinkableGoals } from '@/components/planning/session/edit/use-planned-session-linkable-goals';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { usePlannedSessionLocationQueries } from '@/components/planning/session/edit/use-planned-session-location-queries';
import { EMPTY_GOALS } from '@/components/planning/session/edit/planned-session-dialog-helpers';
import { usePlannedSessionFormState } from '@/components/planning/session/edit/use-planned-session-form-state';
import {
  usePlannedSessionDefaultGoalEffect,
  usePlannedSessionTravelLocationEffect,
} from '@/components/planning/session/edit/use-planned-session-dialog-effects';
import {
  deletePlannedSessionDialog,
  submitPlannedSessionDialogForm,
} from '@/components/planning/session/edit/planned-session-dialog-actions';
import { usePlannedSessionOutdoorLocationSync } from '@/components/planning/session/edit/use-planned-session-outdoor-location-sync';

function useLivePlannedSession(
  session: ClientPlannedSession | null | undefined,
  plannedSessions: ClientPlannedSession[] | undefined,
): ClientPlannedSession | null {
  return useDemoPlannedSessionOverlay(
    useMemo(() => {
      if (!session?.id) {
        return session ?? null;
      }
      return plannedSessions?.find((item) => item.id === session.id) ?? session;
    }, [plannedSessions, session]),
  ) as ClientPlannedSession | null;
}

function usePlannedSessionDialogEffects({
  form,
  session,
  goals,
  planGoalId,
  locationQueries,
}: {
  form: ReturnType<typeof usePlannedSessionFormState>;
  session?: ClientPlannedSession | null;
  goals: ClientGoal[];
  planGoalId: string | null | undefined;
  locationQueries: ReturnType<typeof usePlannedSessionLocationQueries>;
}) {
  usePlannedSessionDefaultGoalEffect({
    isEdit: form.isEdit,
    session,
    planGoalId,
    goals,
    setGoalId: form.setGoalId,
  });

  usePlannedSessionTravelLocationEffect({
    isEdit: form.isEdit,
    session,
    activeTravel: locationQueries.travelQuery.data?.active,
    setExposure: form.setExposure,
    setLocationSource: form.setLocationSource,
    setCustomPlace: form.setCustomPlace,
  });
}

function usePlannedSessionDialogHandlers({
  form,
  session,
  offlineGuard,
  locationQueries,
  queryClient,
  onClose,
  mutations,
  confirm,
}: {
  form: ReturnType<typeof usePlannedSessionFormState>;
  session?: ClientPlannedSession | null;
  offlineGuard: ReturnType<typeof useOfflineGuard>;
  locationQueries: ReturnType<typeof usePlannedSessionLocationQueries>;
  queryClient: ReturnType<typeof useQueryClient>;
  onClose: () => void;
  mutations: ReturnType<typeof usePlannedSessionMutations>;
  confirm: ReturnType<typeof useConfirmDialog>['confirm'];
}) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    await submitPlannedSessionDialogForm({
      e,
      form,
      guardDisabled: offlineGuard.guardDisabled,
      session,
      homeQuery: locationQueries.homeQuery,
      travelQuery: locationQueries.travelQuery,
      queryClient,
      onClose,
      update: mutations.update,
      create: mutations.create,
      createBrick: mutations.createBrick,
    });
  }

  async function handleDelete() {
    if (!session) {
      return;
    }
    await deletePlannedSessionDialog({
      session,
      guardDisabled: offlineGuard.guardDisabled,
      confirm,
      form,
      remove: mutations.remove,
      onClose,
    });
  }

  return { handleSubmit, handleDelete };
}

function buildPlannedSessionDialogReturn({
  form,
  session,
  liveSession,
  linkableGoals,
  offlineGuard,
  pending,
  locationQueries,
  contextQuery,
  dialog,
  handleSubmit,
  handleDelete,
  onClose,
}: {
  form: ReturnType<typeof usePlannedSessionFormState>;
  session?: ClientPlannedSession | null;
  liveSession: ClientPlannedSession | null;
  linkableGoals: ReturnType<typeof usePlannedSessionLinkableGoals>;
  offlineGuard: ReturnType<typeof useOfflineGuard>;
  pending: boolean;
  locationQueries: ReturnType<typeof usePlannedSessionLocationQueries>;
  contextQuery: ReturnType<typeof usePlannedSessionPresentation>;
  dialog: ReturnType<typeof useConfirmDialog>['dialog'];
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDelete: () => Promise<void>;
  onClose: () => void;
}) {
  return {
    ...form,
    session,
    liveSession,
    linkableGoals,
    guardDisabled: offlineGuard.guardDisabled,
    pending,
    offline: offlineGuard.offline,
    offlineLabel: offlineGuard.offlineLabel,
    homeQuery: locationQueries.homeQuery,
    travelQuery: locationQueries.travelQuery,
    contextQuery,
    confirmDialog: dialog,
    handleSubmit,
    handleDelete,
    onClose,
  };
}

function computePlannedSessionDialogPending(
  mutations: ReturnType<typeof usePlannedSessionMutations>,
) {
  return (
    mutations.create.isPending ||
    mutations.createBrick.isPending ||
    mutations.update.isPending ||
    mutations.remove.isPending
  );
}

function usePlannedSessionDialogCore({
  session,
  defaultDate,
  goals,
  onClose,
}: {
  session?: ClientPlannedSession | null;
  defaultDate?: Date;
  goals: ClientGoal[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const form = usePlannedSessionFormState(session, defaultDate);
  const mutations = usePlannedSessionMutations();
  const plannedQuery = usePlannedSessions();
  const planQuery = useTrainingPlan();
  const liveSession = useLivePlannedSession(session, plannedQuery.data);
  const { confirm, dialog } = useConfirmDialog();
  const offlineGuard = useOfflineGuard();
  const contextQuery = usePlannedSessionPresentation(form.isEdit ? session?.id : null);
  useSessionRationalePresentation(form.isEdit ? session?.id : null);
  const linkableGoals = usePlannedSessionLinkableGoals(goals, session);
  const locationQueries = usePlannedSessionLocationQueries();

  usePlannedSessionOutdoorLocationSync({
    session: liveSession,
    activeTravel: locationQueries.travelQuery.data?.active ?? null,
  });

  usePlannedSessionDialogEffects({
    form,
    session,
    goals,
    planGoalId: planQuery.data?.goalId,
    locationQueries,
  });

  const { handleSubmit, handleDelete } = usePlannedSessionDialogHandlers({
    form,
    session,
    offlineGuard,
    locationQueries,
    queryClient,
    onClose,
    mutations,
    confirm,
  });

  return {
    form,
    session,
    liveSession,
    linkableGoals,
    offlineGuard,
    locationQueries,
    contextQuery,
    dialog,
    handleSubmit,
    handleDelete,
    onClose,
    pending: computePlannedSessionDialogPending(mutations),
  };
}

export function usePlannedSessionDialog({
  session,
  defaultDate,
  goals = EMPTY_GOALS,
  onClose,
}: {
  session?: ClientPlannedSession | null;
  defaultDate?: Date;
  goals?: ClientGoal[];
  onClose: () => void;
  omitLinkedActivityNavigation?: boolean;
  morningProposal?: MorningProposalCompareInput;
}) {
  const core = usePlannedSessionDialogCore({ session, defaultDate, goals, onClose });

  return buildPlannedSessionDialogReturn({
    form: core.form,
    session: core.session,
    liveSession: core.liveSession,
    linkableGoals: core.linkableGoals,
    offlineGuard: core.offlineGuard,
    pending: core.pending,
    locationQueries: core.locationQueries,
    contextQuery: core.contextQuery,
    dialog: core.dialog,
    handleSubmit: core.handleSubmit,
    handleDelete: core.handleDelete,
    onClose: core.onClose,
  });
}
