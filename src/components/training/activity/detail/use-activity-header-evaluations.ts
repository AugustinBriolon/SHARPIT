'use client';

import { useActivities } from '@/hooks/use-data';

/** Ressenti / RPE affichés dans le header — priorité au cache React Query (optimistic). */
export function useActivityHeaderEvaluations(
  activityId: string,
  server: { feeling: string | null; rpe: number | null },
) {
  const { data: activities } = useActivities();
  const cached = activities?.find((activity) => activity.id === activityId);

  return {
    feeling: cached?.feeling ?? server.feeling,
    rpe: cached?.rpe ?? server.rpe,
  };
}
