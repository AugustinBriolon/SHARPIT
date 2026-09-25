'use client';

import { useMutation } from '@tanstack/react-query';
import {
  postCoachGeneration,
  type AdaptPlanResult,
  type CoachGenerationProgress,
  type GeneratedPlan,
  type GeneratePlanParams,
} from '@/hooks/coach/coach-generation';

export function useCoachPlan(onProgress?: (progress: CoachGenerationProgress) => void) {
  return useMutation<GeneratedPlan, Error, GeneratePlanParams>({
    mutationFn: (params) =>
      postCoachGeneration<GeneratedPlan>({
        url: '/api/coach/plan',
        params,
        partialKey: 'sessions',
        onProgress,
      }),
  });
}

export function useAdaptPlan(onProgress?: (progress: CoachGenerationProgress) => void) {
  return useMutation<AdaptPlanResult, Error, { days?: number; focus?: string }>({
    mutationFn: (params) =>
      postCoachGeneration<AdaptPlanResult>({
        url: '/api/coach/adapt',
        params,
        partialKey: 'changes',
        onProgress,
        fallbackError: 'La réadaptation a échoué.',
      }),
  });
}
