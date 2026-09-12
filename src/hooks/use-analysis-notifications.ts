'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import {
  analysisKindLabel,
  analysisPollInterval,
  analysisRunHref,
  selectRunsToNotify,
  type AnalysisRunView,
} from '@/lib/analysis/analysis-run';
import { fetchAnalysisRuns } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';

const WATERMARK_STORAGE_KEY = 'sharpit.analysis-notified-at';

function readWatermark(): string | null {
  try {
    return localStorage.getItem(WATERMARK_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeWatermark(value: string | null): void {
  if (!value) {
    return;
  }
  try {
    localStorage.setItem(WATERMARK_STORAGE_KEY, value);
  } catch {
    // private mode / quota — the athlete just sees the toast again next time
  }
}

/** Refresh whatever surface shows this analysis, so the toast link lands on fresh content. */
function invalidateForRun(queryClient: QueryClient, run: AnalysisRunView): void {
  if (run.kind === 'ACTIVITY_NARRATIVE') {
    void queryClient.invalidateQueries({ queryKey: ['activity', run.targetId] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.activities });
    return;
  }
  if (run.kind === 'SESSION_COMPLIANCE' || run.kind === 'BRICK') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions });
    return;
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReview('latest') });
}

function notifyRun(
  run: AnalysisRunView,
  actions: { open: (href: string) => void; queryClient: QueryClient },
): void {
  const label = analysisKindLabel(run.kind);
  if (run.status === 'FAILED') {
    toast.error(`${label} : échec`, { description: 'Tu peux la relancer depuis la page.' });
    return;
  }
  invalidateForRun(actions.queryClient, run);
  toast.success(`${label} prête`, {
    actionProps: {
      children: 'Voir',
      onClick: () => actions.open(analysisRunHref(run)),
    },
  });
}

/**
 * One watcher for every coach analysis running in the background (ADR-036).
 *
 * Mounted once in the app shell: the athlete starts an analysis, goes wherever
 * they want, and is told when it lands. Polling only runs while something is
 * actually in flight.
 */
export function useAnalysisNotifications(): void {
  const isDemo = useIsDemoMode();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: queryKeys.analysisRuns,
    queryFn: fetchAnalysisRuns,
    enabled: !isDemo,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => analysisPollInterval(query.state.data?.pending),
    // Waiting for an analysis is exactly when the athlete switches app or tab.
    // Without this, React Query pauses interval refetching while the tab is
    // hidden and the toast would only land on their return.
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!data || data.runs.length === 0) {
      return;
    }
    const { toNotify, watermark } = selectRunsToNotify({
      runs: data.runs,
      watermark: readWatermark(),
      now: new Date(),
    });
    for (const run of toNotify) {
      notifyRun(run, { open: (href) => router.push(href), queryClient });
    }
    writeWatermark(watermark);
  }, [data, queryClient, router]);
}
