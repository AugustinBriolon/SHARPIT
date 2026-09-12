'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { resolveDefaultPlanGoalId, selectableDatedGoalIds } from '@/lib/planned-session/plan-goal';
import { NO_GOAL } from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { usePlannedSessionFormState } from '@/components/planning/session/edit/use-planned-session-form-state';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { fetchGeocodingHome, fetchTravelContext } from '@/lib/query/fetchers';
import { usePlannedSessionMutations } from '@/hooks/use-data';
import {
  shouldApplyTravelLocationToSession,
  travelLocationPatch,
  type ActiveTravelLocation,
} from '@/lib/planned-session/travel-location-sync';

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

export function usePlannedSessionLinkableGoals(
  goals: ClientGoal[],
  session?: ClientPlannedSession | null,
) {
  return useMemo(() => {
    const now = new Date();
    const dated = goals.filter(
      (g) => !g.achieved && g.targetDate && new Date(g.targetDate as unknown as string) >= now,
    );
    const linked = session?.goalId ? goals.find((g) => g.id === session.goalId) : null;
    if (linked && !dated.some((g) => g.id === linked.id)) {
      return [linked, ...dated];
    }
    return dated;
  }, [goals, session]);
}

export function usePlannedSessionLocationQueries() {
  const homeQuery = useQuery({
    queryKey: ['geocoding', 'home'],
    queryFn: async () => {
      const data = await fetchGeocodingHome();
      if (!data) {
        throw new Error('home fetch failed');
      }
      return data as {
        home: { label?: string; latitude: number; longitude: number };
      };
    },
    staleTime: 5 * 60_000,
  });

  const travelQuery = useQuery({
    queryKey: queryKeys.travelContext,
    queryFn: () =>
      fetchTravelContext<{
        active: {
          locationLabel: string;
          locationLat: number;
          locationLng: number;
          startDate: string;
          endDate: string;
        } | null;
      }>(),
    staleTime: 60_000,
  });

  return { homeQuery, travelQuery };
}

export function usePlannedSessionOutdoorLocationSync({
  session,
  activeTravel,
}: {
  session: ClientPlannedSession | null | undefined;
  activeTravel: ActiveTravelLocation | null | undefined;
}) {
  const { update } = usePlannedSessionMutations();
  const lastAppliedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session || !activeTravel) {
      return;
    }
    if (!shouldApplyTravelLocationToSession(session, activeTravel)) {
      return;
    }

    const key = `${session.id}:${activeTravel.locationLat}:${activeTravel.locationLng}`;
    if (lastAppliedKeyRef.current === key) {
      return;
    }
    lastAppliedKeyRef.current = key;

    update.mutate({
      id: session.id,
      data: travelLocationPatch(activeTravel),
    });
  }, [activeTravel, session, update]);
}
