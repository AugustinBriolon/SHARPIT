'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSameDay, startOfWeek } from 'date-fns';
import type { ClientPlannedSession } from '@/lib/query/types';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';

const WEEK_OPTS = { weekStartsOn: 1 as const };

export function usePlanningDeepLinkSync({
  showCoachMenu,
  planned,
  plannedQueryPending,
  plannedIdFromUrl,
  setWeekStart,
}: {
  showCoachMenu: boolean;
  planned: ClientPlannedSession[];
  plannedQueryPending: boolean;
  plannedIdFromUrl: string | null;
  setWeekStart: (value: Date | ((prev: Date) => Date)) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const deepLinkSession =
    plannedIdFromUrl && !plannedQueryPending
      ? (planned.find((s) => s.id === plannedIdFromUrl) ?? null)
      : null;

  useEffect(() => {
    if (!plannedIdFromUrl) {
      return;
    }
    prefetchPlannedSessionDetail(queryClient, plannedIdFromUrl);
  }, [plannedIdFromUrl, queryClient]);

  useEffect(() => {
    if (!deepLinkSession) {
      return;
    }
    const sessionWeek = startOfWeek(new Date(deepLinkSession.date), WEEK_OPTS);
    setWeekStart((current) => (isSameDay(current, sessionWeek) ? current : sessionWeek));
  }, [deepLinkSession, setWeekStart]);

  function closePlannedDialogUrlParams() {
    const params = new URLSearchParams(searchParams.toString());
    const hadPlanned = params.has('planned');
    const hadCreate = showCoachMenu && params.has('create');
    if (!hadPlanned && !hadCreate) {
      return;
    }
    params.delete('planned');
    if (hadCreate) {
      params.delete('create');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return { deepLinkSession, closePlannedDialogUrlParams };
}
