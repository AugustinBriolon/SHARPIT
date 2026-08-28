'use client';

import { useSessionRationalePresentation } from '@/hooks/use-data';
import { useGarminPushStaleness } from '@/hooks/use-garmin-push-staleness';
import { useEndurancePreview } from '@/hooks/use-endurance-preview';
import { useGarminWorkoutPush } from '@/hooks/use-garmin-workout-push';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { useDisplayMode } from '@/providers/display-mode-provider';
import {
  buildPlannedSessionChips,
  buildPlannedSessionContextMeta,
  buildPlannedSessionDateLabel,
  buildPlannedSessionDerouleFlags,
  buildPlannedSessionPrescription,
  buildPlannedSessionRationaleFlags,
  buildRealizedSessionChips,
} from '@/components/planning/session/read/planned-session-read-helpers';

export function usePlannedSessionReadData({
  session,
  goals,
  context,
  contextPending = false,
}: {
  session: ClientPlannedSession;
  goals: ClientGoal[];
  context: PlannedSessionViewModel['context'] | null | undefined;
  contextPending?: boolean;
}) {
  const { mode } = useDisplayMode();
  const garminPush = useGarminWorkoutPush(session);
  const watchStaleness = useGarminPushStaleness({
    type: session.type,
    durationMin: session.durationMin,
    intensity: session.intensity,
    endurancePrescription: session.endurancePrescription,
    garminWorkoutThresholds: session.garminWorkoutThresholds,
    garminWorkoutId: garminPush.watchPush.workoutId,
  });

  const isRealized = Boolean(session.activityId ?? session.activity);
  const goal = goals.find((g) => g.id === session.goalId);
  const dateLabel = buildPlannedSessionDateLabel(session);
  const chips = buildPlannedSessionChips({ session, goalTitle: goal?.title, mode });
  const realizedChips = buildRealizedSessionChips({ session, mode });
  const contextMeta = buildPlannedSessionContextMeta({
    session,
    context,
    contextPending,
    goalTitle: goal?.title,
  });

  const rationaleQuery = useSessionRationalePresentation(session.id);
  const rationaleFlags = buildPlannedSessionRationaleFlags({
    isRealized,
    rationaleVm: rationaleQuery.data,
    rationalePending: rationaleQuery.isPending,
  });

  const prescriptionData = buildPlannedSessionPrescription(session);
  const derouleFlags = buildPlannedSessionDerouleFlags({
    session,
    isRealized,
    hasStrengthPrescription: prescriptionData.prescription !== null,
  });
  const endurancePreview = useEndurancePreview(session);

  return {
    garminPush,
    watchStaleness,
    isRealized,
    goal,
    dateLabel,
    ...contextMeta,
    ...rationaleFlags,
    chips,
    realizedChips,
    ...prescriptionData,
    ...derouleFlags,
    endurancePreview,
  };
}
