'use client';

import { useEffect } from 'react';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { resolveDefaultPlanGoalId, selectableDatedGoalIds } from '@/lib/planned-session/plan-goal';
import { NO_GOAL } from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { usePlannedSessionFormState } from '@/components/planning/session/edit/use-planned-session-form-state';

type FormState = ReturnType<typeof usePlannedSessionFormState>;

export function usePlannedSessionDefaultGoalEffect({
  isEdit,
  session,
  planGoalId,
  goals,
  setGoalId,
}: {
  isEdit: boolean;
  session?: ClientPlannedSession | null;
  planGoalId: string | null | undefined;
  goals: ClientGoal[];
  setGoalId: FormState['setGoalId'];
}) {
  const selectableGoalIds = selectableDatedGoalIds(goals);

  useEffect(() => {
    if (isEdit || session) {
      return;
    }
    const fromPlan = resolveDefaultPlanGoalId(planGoalId, selectableGoalIds);
    if (!fromPlan) {
      return;
    }
    setGoalId((current) => (current === NO_GOAL ? fromPlan : current));
  }, [isEdit, session, planGoalId, selectableGoalIds, setGoalId]);
}

export function usePlannedSessionTravelLocationEffect({
  isEdit,
  session,
  activeTravel,
  setExposure,
  setLocationSource,
  setCustomPlace,
}: {
  isEdit: boolean;
  session?: ClientPlannedSession | null;
  activeTravel:
    | {
        locationLabel: string;
        locationLat: number;
        locationLng: number;
      }
    | null
    | undefined;
  setExposure: FormState['setExposure'];
  setLocationSource: FormState['setLocationSource'];
  setCustomPlace: FormState['setCustomPlace'];
}) {
  useEffect(() => {
    if (isEdit || session || !activeTravel) {
      return;
    }
    setExposure('OUTDOOR');
    setLocationSource('travel');
    setCustomPlace({
      label: activeTravel.locationLabel,
      latitude: activeTravel.locationLat,
      longitude: activeTravel.locationLng,
    });
  }, [isEdit, session, activeTravel, setExposure, setLocationSource, setCustomPlace]);
}
