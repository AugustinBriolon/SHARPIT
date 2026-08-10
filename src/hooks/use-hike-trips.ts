'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { buildHikeTripSummary } from '@/lib/activity/hike-trip-summary';
import { fetchHikeTrip, fetchHikeTrips, hydrateHikeTrip } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import { formatApiErrorMessage, parseApiErrorBody } from '@/lib/query/api-error';
import { sendJson } from '@/lib/query/send-json';
import type { ClientActivity, ClientHikeTrip, ClientHikeTripListItem } from '@/lib/query/types';
import type { CreateHikeTripInput, PatchHikeTripInput } from '@/lib/validators/hike-trip';

export type { CreateHikeTripInput, PatchHikeTripInput };

export function useHikeTrips() {
  return useQuery({
    queryKey: queryKeys.hikeTrips,
    queryFn: fetchHikeTrips,
    staleTime: 2 * 60 * 1000,
  });
}

export function useHikeTrip(id: string) {
  return useQuery({
    queryKey: queryKeys.hikeTrip(id),
    queryFn: () => fetchHikeTrip(id),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}

function toHikeTripMember(activity: ClientActivity): ClientHikeTrip['activities'][number] {
  return {
    id: activity.id,
    type: activity.type,
    date: activity.date,
    title: activity.title,
    duration: activity.duration,
    load: activity.load,
    observedLocationLabel: null,
    hikeMetrics: activity.hikeMetrics
      ? {
          distanceM: activity.hikeMetrics.distanceM ?? null,
          elevationM: activity.hikeMetrics.elevationM ?? null,
          elevationLossM: null,
        }
      : null,
  };
}

function toListItem(trip: ClientHikeTrip): ClientHikeTripListItem {
  return {
    ...trip,
    summary: buildHikeTripSummary(trip.activities),
  };
}

function applyPatchOptimistic(
  trip: ClientHikeTrip,
  patch: PatchHikeTripInput,
  activitiesCache: ClientActivity[] | undefined,
): ClientHikeTrip {
  let next: ClientHikeTrip = {
    ...trip,
    updatedAt: new Date(),
    activities: [...trip.activities],
  };

  if (patch.name != null) {
    next = { ...next, name: patch.name };
  }

  if (patch.removeActivityIds?.length) {
    const removeSet = new Set(patch.removeActivityIds);
    next = {
      ...next,
      activities: next.activities.filter((activity) => !removeSet.has(activity.id)),
    };
  }

  if (patch.addActivityIds?.length && activitiesCache) {
    const existingIds = new Set(next.activities.map((activity) => activity.id));
    const added = patch.addActivityIds
      .filter((activityId) => !existingIds.has(activityId))
      .map((activityId) => activitiesCache.find((activity) => activity.id === activityId))
      .filter((activity): activity is ClientActivity => activity != null)
      .map(toHikeTripMember);

    next = {
      ...next,
      activities: [...next.activities, ...added].sort(
        (a, b) => a.date.getTime() - b.date.getTime(),
      ),
    };
  }

  return next;
}

function hasMembershipChange(patch: PatchHikeTripInput): boolean {
  return (patch.addActivityIds?.length ?? 0) > 0 || (patch.removeActivityIds?.length ?? 0) > 0;
}

function hikeTripErrorDescription(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined;
}

export function useHikeTripMutations() {
  const queryClient = useQueryClient();
  const listKey = queryKeys.hikeTrips;
  const activitiesKey = queryKeys.activities;

  const create = useMutation({
    mutationFn: async (payload: CreateHikeTripInput) =>
      hydrateHikeTrip(
        (await sendJson('/api/hike-trips', 'POST', payload)) as Parameters<
          typeof hydrateHikeTrip
        >[0],
      ),
    onSuccess: (trip) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: activitiesKey });
      queryClient.setQueryData(queryKeys.hikeTrip(trip.id), trip);
      toast.success('Séjour créé');
    },
    onError: (err: unknown) =>
      toast.error('Impossible de créer le séjour.', {
        description: hikeTripErrorDescription(err),
      }),
  });

  const patch = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PatchHikeTripInput }) =>
      hydrateHikeTrip(
        (await sendJson(`/api/hike-trips/${id}`, 'PATCH', data)) as Parameters<
          typeof hydrateHikeTrip
        >[0],
      ),
    onMutate: async ({ id, data }) => {
      const detailKey = queryKeys.hikeTrip(id);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);

      const previousList = queryClient.getQueryData<ClientHikeTripListItem[]>(listKey);
      const previousDetail = queryClient.getQueryData<ClientHikeTrip>(detailKey);
      const activitiesCache = queryClient.getQueryData<ClientActivity[]>(activitiesKey);

      if (previousDetail) {
        const optimisticDetail = applyPatchOptimistic(previousDetail, data, activitiesCache);
        queryClient.setQueryData(detailKey, optimisticDetail);
        if (previousList) {
          queryClient.setQueryData<ClientHikeTripListItem[]>(
            listKey,
            previousList.map((item) => (item.id === id ? toListItem(optimisticDetail) : item)),
          );
        }
      } else if (previousList) {
        queryClient.setQueryData<ClientHikeTripListItem[]>(
          listKey,
          previousList.map((item) => {
            if (item.id !== id) return item;
            return toListItem(applyPatchOptimistic(item, data, activitiesCache));
          }),
        );
      }

      return { previousList, previousDetail, id, data };
    },
    onError: (err: unknown, { id }, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.hikeTrip(id), context.previousDetail);
      }
      toast.error('Impossible de mettre à jour le séjour.', {
        description: hikeTripErrorDescription(err),
      });
    },
    onSuccess: (trip, { id }) => {
      const listItem = toListItem(trip);
      queryClient.setQueryData(queryKeys.hikeTrip(id), trip);
      queryClient.setQueryData<ClientHikeTripListItem[]>(listKey, (prev) =>
        prev ? prev.map((item) => (item.id === id ? listItem : item)) : prev,
      );
      toast.success('Séjour mis à jour');
    },
    onSettled: (_data, _error, { data }) => {
      if (hasMembershipChange(data)) {
        void queryClient.invalidateQueries({ queryKey: activitiesKey });
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hike-trips/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const parsed = parseApiErrorBody(await res.json().catch(() => null));
        throw new Error(formatApiErrorMessage(parsed ?? {}));
      }
    },
    onMutate: async (id) => {
      const detailKey = queryKeys.hikeTrip(id);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: listKey }),
        queryClient.cancelQueries({ queryKey: detailKey }),
      ]);

      const previousList = queryClient.getQueryData<ClientHikeTripListItem[]>(listKey);
      const previousDetail = queryClient.getQueryData<ClientHikeTrip>(detailKey);

      if (previousList) {
        queryClient.setQueryData(
          listKey,
          previousList.filter((item) => item.id !== id),
        );
      }

      return { previousList, previousDetail, id };
    },
    onError: (err: unknown, id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.hikeTrip(id), context.previousDetail);
      }
      toast.error('Impossible de supprimer le séjour.', {
        description: hikeTripErrorDescription(err),
      });
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.hikeTrip(id) });
      toast.success('Séjour supprimé');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: activitiesKey });
    },
  });

  return { create, patch, remove };
}
