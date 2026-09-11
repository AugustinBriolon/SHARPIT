'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSameDay, startOfWeek } from 'date-fns';
import type { ClientPlannedSession } from '@/lib/query/types';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';

const WEEK_OPTS = { weekStartsOn: 1 as const };

function clearPlannedDialogParams(params: URLSearchParams, showCoachMenu: boolean): boolean {
  const hadPlanned = params.has('planned');
  const hadCreate = showCoachMenu && params.has('create');
  if (!hadPlanned && !hadCreate) {
    return false;
  }
  params.delete('planned');
  if (hadCreate) {
    params.delete('create');
  }
  return true;
}

function clearAdaptParams(params: URLSearchParams): boolean {
  if (!params.has('adapt') && !params.has('focus')) {
    return false;
  }
  params.delete('adapt');
  params.delete('focus');
  return true;
}

function clearGenerateParams(params: URLSearchParams): boolean {
  if (!params.has('generate')) {
    return false;
  }
  params.delete('generate');
  return true;
}

function useDeepLinkSessionEffects(
  plannedIdFromUrl: string | null,
  deepLinkSession: ClientPlannedSession | null,
  setWeekStart: (value: Date | ((prev: Date) => Date)) => void,
) {
  const queryClient = useQueryClient();

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
}

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

  const deepLinkSession =
    plannedIdFromUrl && !plannedQueryPending
      ? (planned.find((s) => s.id === plannedIdFromUrl) ?? null)
      : null;

  useDeepLinkSessionEffects(plannedIdFromUrl, deepLinkSession, setWeekStart);

  function replaceUrlParams(mutate: (params: URLSearchParams) => boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (!mutate(params)) {
      return;
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return {
    deepLinkSession,
    closePlannedDialogUrlParams: () =>
      replaceUrlParams((params) => clearPlannedDialogParams(params, showCoachMenu)),
    closeGenerateUrlParams: () => replaceUrlParams(clearGenerateParams),
    closeAdaptUrlParams: () => replaceUrlParams(clearAdaptParams),
  };
}
