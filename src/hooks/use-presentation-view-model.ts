'use client';

import { useQuery } from '@tanstack/react-query';
import type { RecoveryViewModel } from '@/core/presentation/recovery-view-model';
import type { SleepViewModel } from '@/core/presentation/sleep-view-model';
import type { EffortViewModel } from '@/core/presentation/effort-view-model';
import type { AdaptationViewModel } from '@/core/presentation/adaptation-view-model';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import type { BodyViewModel } from '@/core/presentation/body-view-model';
import {
  fetchAdaptationPresentation,
  fetchEffortPresentation,
  fetchRecoveryPresentation,
  fetchTodayPresentation,
  fetchSleepPresentation,
  fetchBodyPresentation,
} from '@/lib/query/presentation-fetchers';

export function useRecoveryViewModel(trainingDayId: string) {
  return useQuery<RecoveryViewModel>({
    queryKey: ['presentation', 'recovery', trainingDayId],
    queryFn: () => fetchRecoveryPresentation(trainingDayId),
    staleTime: 60_000,
  });
}

export function useSleepViewModel(trainingDayId: string) {
  return useQuery<SleepViewModel>({
    queryKey: ['presentation', 'sleep', trainingDayId],
    queryFn: () => fetchSleepPresentation(trainingDayId),
    staleTime: 60_000,
  });
}

export function useEffortViewModel(trainingDayId: string) {
  return useQuery<EffortViewModel>({
    queryKey: ['presentation', 'effort', trainingDayId],
    queryFn: () => fetchEffortPresentation(trainingDayId),
    staleTime: 60_000,
  });
}

export function useAdaptationViewModel(trainingDayId: string) {
  return useQuery<AdaptationViewModel>({
    queryKey: ['presentation', 'adaptation', trainingDayId],
    queryFn: () => fetchAdaptationPresentation(trainingDayId),
    staleTime: 60_000,
  });
}

export function useTodayPresentationViewModel(trainingDayId: string) {
  return useQuery<TodayViewModel>({
    queryKey: ['presentation', 'today', trainingDayId],
    queryFn: () => fetchTodayPresentation(trainingDayId),
    staleTime: 60_000,
  });
}

export function useBodyPresentationViewModel(days: number | null | undefined) {
  return useQuery<BodyViewModel>({
    queryKey: ['presentation', 'body', days ?? 'all'],
    queryFn: () => fetchBodyPresentation(days),
    staleTime: 60_000,
  });
}
