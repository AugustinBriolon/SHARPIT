'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { isSet } from '@sharpit/shared/value';
import type { RecoveryViewModel } from '@sharpit/server/presentation/recovery-view-model';
import type { SleepViewModel } from '@sharpit/server/presentation/sleep-view-model';
import type { EffortViewModel } from '@sharpit/server/presentation/effort-view-model';
import type { AdaptationViewModel } from '@sharpit/server/presentation/adaptation-view-model';
import type { TodayViewModel } from '@sharpit/server/presentation/today-view-model';
import type { BodyViewModel } from '@sharpit/server/presentation/body-view-model';
import type { NutritionViewModel } from '@sharpit/server/presentation/nutrition-view-model';
import type { PhysicalHealthViewModel } from '@sharpit/server/presentation/physical-health-view-model';
import {
  fetchAdaptationPresentation,
  fetchEffortPresentation,
  fetchPhysicalHealthPresentation,
  fetchRecoveryPresentation,
  fetchTodayPresentation,
  fetchSleepPresentation,
  fetchBodyPresentation,
  fetchNutritionPresentation,
} from '@/client/query/presentation-fetchers';
import { queryKeys } from '@/client/query/keys';
import { peekShellAthleteRefreshInFlight } from '@/client/athlete-state/shell-refresh-seed';
import { nutritionReadingPollInterval } from '@sharpit/server/lib/nutrition/analysis/nutrition-reading-poll';

/** Cold start or date-change placeholder — skeleton values, never prior-day figures. */
export function isPresentationValuesLoading(
  query: Pick<UseQueryResult, 'isPending' | 'isPlaceholderData'>,
): boolean {
  return query.isPending || query.isPlaceholderData;
}

export function useRecoveryViewModel(trainingDayId: string) {
  return useQuery<RecoveryViewModel>({
    queryKey: queryKeys.presentationRecovery(trainingDayId),
    queryFn: () => fetchRecoveryPresentation(trainingDayId),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useSleepViewModel(trainingDayId: string) {
  return useQuery<SleepViewModel>({
    queryKey: queryKeys.presentationSleep(trainingDayId),
    queryFn: () => fetchSleepPresentation(trainingDayId),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useEffortViewModel(trainingDayId: string) {
  return useQuery<EffortViewModel>({
    queryKey: queryKeys.presentationEffort(trainingDayId),
    queryFn: () => fetchEffortPresentation(trainingDayId),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdaptationViewModel(trainingDayId: string) {
  return useQuery<AdaptationViewModel>({
    queryKey: queryKeys.presentationAdaptation(trainingDayId),
    queryFn: () => fetchAdaptationPresentation(trainingDayId),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useTodayPresentationViewModel(trainingDayId: string) {
  return useQuery<TodayViewModel>({
    queryKey: queryKeys.presentationToday(trainingDayId),
    queryFn: async () => {
      // Join an in-flight shell refresh (started by AthleteStateInitializer) so we
      // reuse todayPresentation instead of racing a second GET. Later refetches
      // see no in-flight work and hit GET /api/presentation/today as usual.
      // Offline: both paths fail → dashboard falls back to ADR-008 snapshot.
      const inFlight = peekShellAthleteRefreshInFlight();
      if (inFlight) {
        const seed = await inFlight;
        if (seed?.trainingDayId === trainingDayId) {
          if (isSet(seed.todayPresentation)) {
            return seed.todayPresentation;
          }
          // Soft open skipped rebuild and there was no warm cache — fall through to GET.
        }
      }
      return fetchTodayPresentation(trainingDayId);
    },
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePhysicalHealthViewModel(trainingDayId: string) {
  return useQuery<PhysicalHealthViewModel>({
    queryKey: queryKeys.presentationPhysicalHealth(trainingDayId),
    queryFn: () => fetchPhysicalHealthPresentation(trainingDayId),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useBodyPresentationViewModel() {
  return useQuery<BodyViewModel>({
    // Always full history — chart windows are filtered client-side in CompositionView.
    queryKey: queryKeys.presentationBody,
    queryFn: () => fetchBodyPresentation(null),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useNutritionViewModel(trainingDayId: string) {
  return useQuery<NutritionViewModel>({
    queryKey: queryKeys.presentationNutrition(trainingDayId),
    queryFn: () => fetchNutritionPresentation(trainingDayId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => nutritionReadingPollInterval(query.state.data?.coachReading),
  });
}
