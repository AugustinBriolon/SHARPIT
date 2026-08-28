'use client';

import { useEffect, useRef } from 'react';
import { usePlannedSessionMutations } from '@/hooks/use-data';
import type { ClientPlannedSession } from '@/lib/query/types';
import {
  shouldApplyTravelLocationToSession,
  travelLocationPatch,
  type ActiveTravelLocation,
} from '@/lib/planned-session/travel-location-sync';

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
