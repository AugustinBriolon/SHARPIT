'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPlannedSessions } from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import {
  fetchPlannedSessionPresentation,
  fetchSessionRationalePresentation,
  fetchWeeklyCoachingBriefPresentation,
} from '@/lib/query/presentation-fetchers';

export function usePlannedSessions() {
  return useQuery({
    queryKey: queryKeys.plannedSessions,
    queryFn: fetchPlannedSessions,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlannedSessionPresentation(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.plannedSessionPresentation(sessionId ?? ''),
    queryFn: () => fetchPlannedSessionPresentation(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSessionRationalePresentation(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.sessionRationale(sessionId ?? ''),
    queryFn: () => fetchSessionRationalePresentation(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useWeeklyCoachingBriefViewModel(weekStart: string) {
  return useQuery({
    queryKey: queryKeys.weeklyCoachingBrief(weekStart),
    queryFn: () => fetchWeeklyCoachingBriefPresentation(weekStart),
    staleTime: 5 * 60 * 1000,
  });
}
