'use client';

import type { QueryClient } from '@tanstack/react-query';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

/**
 * After ressenti is saved, hide the Today CTA immediately (Instant UX).
 * Mirrors `buildPostSessionLoop`: card stays only when a freshness line remains.
 */
export function patchTodayPostSessionLoopAfterFeeling(
  queryClient: QueryClient,
  activityId: string,
): void {
  queryClient.setQueriesData<TodayViewModel>({ queryKey: ['presentation', 'today'] }, (prev) => {
    if (!prev?.postSessionLoop || prev.postSessionLoop.activityId !== activityId) {
      return prev;
    }
    if (!prev.postSessionLoop.needsFeeling) {
      return prev;
    }

    const nextLoop = { ...prev.postSessionLoop, needsFeeling: false };
    if (!nextLoop.freshnessLine) {
      return { ...prev, postSessionLoop: null };
    }
    return { ...prev, postSessionLoop: nextLoop };
  });
}

export function invalidateTodayPresentationCaches(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['presentation', 'today'] });
  void queryClient.invalidateQueries({ queryKey: ['athlete-snapshot'] });
  void queryClient.invalidateQueries({ queryKey: ['today'] });
}
