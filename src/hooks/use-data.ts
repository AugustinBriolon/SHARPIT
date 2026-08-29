'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import {
  fetchAthleteProfile,
  fetchGoogleCalendars,
  fetchGoogleEvents,
  fetchRecords,
  fetchThresholdHistory,
  fetchThresholdPreview,
  fetchTrainingPlan,
} from '@/lib/query/fetchers';
import { queryKeys } from '@/lib/query/keys';
import type { ThresholdField } from '@/lib/threshold/threshold-estimates';
import { sendJson } from '@/lib/query/send-json';

export {
  useAnalyzeBrick,
  useBrickAnalysis,
  usePlannedSessionMutations,
  usePlannedSessionPresentation,
  usePlannedSessions,
  useSessionRationalePresentation,
  useWeeklyCoachingBriefViewModel,
} from '@/hooks/use-planned-sessions';
export type {
  BrickLegPayload,
  ClientBrickAnalysis,
  CreateBrickPayload,
  PlannedSessionBatchOp,
  PlannedSessionPayload,
} from '@/hooks/use-planned-sessions';

export {
  useActivities,
  useActivityMutations,
  useActivityStream,
  useMultisportStreams,
} from '@/hooks/use-activities';
export { useActivityDetail } from '@/hooks/use-activity-detail';
export type { ActivityMutationPayload } from '@/hooks/use-activities';

export { useGoalAchievements, useGoalMutations, useGoals } from '@/hooks/use-goals';
export type { GoalPayload } from '@/hooks/use-goals';

export { useBodyComposition, useHealthEntries } from '@/hooks/use-health';

export { useHikeTrip, useHikeTripMutations, useHikeTrips } from '@/hooks/use-hike-trips';
export type { CreateHikeTripInput, PatchHikeTripInput } from '@/hooks/use-hike-trips';

export function useRecords() {
  return useQuery({
    queryKey: queryKeys.records,
    // Persisted DB records — avoid refetching on every visit.
    queryFn: fetchRecords,
    staleTime: 30 * 60 * 1000,
  });
}

export function useAthleteProfile() {
  return useQuery({
    queryKey: queryKeys.athleteProfile,
    queryFn: fetchAthleteProfile,
    staleTime: 5 * 60 * 1000,
  });
}

export function useThresholdPreview() {
  return useQuery({
    queryKey: queryKeys.thresholdPreview,
    queryFn: fetchThresholdPreview,
    staleTime: 5 * 60 * 1000,
  });
}

export function useThresholdHistory() {
  return useQuery({
    queryKey: queryKeys.thresholdHistory,
    queryFn: fetchThresholdHistory,
    staleTime: 60 * 1000,
  });
}

export function useTrainingPlan() {
  return useQuery({
    queryKey: queryKeys.trainingPlan,
    queryFn: fetchTrainingPlan,
    staleTime: 60 * 1000,
  });
}

export function useTrainingPlanMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.trainingPlan });

  const generate = useMutation({
    mutationFn: (goalId: string) => sendJson('/api/training-plans', 'POST', { goalId }),
    onSuccess: () => {
      invalidate();
      toast.success("Plan d'entraînement généré");
    },
    onError: (err: unknown) =>
      toast.error('La génération du plan a échoué.', {
        description: err instanceof Error ? err.message : undefined,
      }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => sendJson(`/api/training-plans/${id}`, 'DELETE'),
    onSuccess: invalidate,
    onError: (err: unknown) =>
      toast.error("Impossible d'archiver le plan.", {
        description: err instanceof Error ? err.message : undefined,
      }),
  });

  return { generate, archive };
}

export function useApplyThresholdEstimates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields?: ThresholdField[]) =>
      sendJson('/api/athlete-profile/apply-estimates', 'POST', fields ? { fields } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.thresholdPreview });
      queryClient.invalidateQueries({ queryKey: queryKeys.thresholdHistory });
    },
  });
}

export function useGoogleEvents(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.googleEvents(from, to),
    queryFn: () => fetchGoogleEvents(from, to),
    staleTime: 5 * 60 * 1000, // 5 min — avoid spamming Google API
    retry: 1,
  });
}

export function useGoogleCalendars(enabled = true) {
  return useQuery({
    queryKey: queryKeys.googleCalendars,
    queryFn: fetchGoogleCalendars,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
