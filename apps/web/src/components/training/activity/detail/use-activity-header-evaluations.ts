'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useActivities } from '@/hooks/use-data';
import { useActivityDetail } from '@/hooks/use-activity-detail';
import { queryKeys } from '@/lib/query/keys';
import type { ClientActivity, ClientActivityDetail } from '@/lib/query/types';

function firstPresent<T>(candidates: Array<T | null | undefined>, fallback: T): T {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) {
      return candidate;
    }
  }
  return fallback;
}

function resolveCachedFeelingRpe(
  server: { feeling: string | null; rpe: number | null },
  listCached: ClientActivity | undefined,
  detailCached: ClientActivityDetail | undefined,
) {
  return {
    feeling: firstPresent([listCached?.feeling, detailCached?.feeling], server.feeling),
    rpe: firstPresent([listCached?.rpe, detailCached?.rpe], server.rpe),
  };
}

/** Ressenti / RPE affichés dans le header — priorité au cache React Query (optimistic). */
export function useActivityHeaderEvaluations(
  activityId: string,
  server: { feeling: string | null; rpe: number | null },
) {
  const queryClient = useQueryClient();
  const { data: detail } = useActivityDetail(activityId);
  const { data: activities } = useActivities();
  const detailCached =
    detail ?? queryClient.getQueryData<ClientActivityDetail>(queryKeys.activity(activityId));
  const listCached = activities?.find((activity) => activity.id === activityId);

  return resolveCachedFeelingRpe(server, listCached, detailCached);
}
