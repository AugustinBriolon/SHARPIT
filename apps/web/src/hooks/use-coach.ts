'use client';

export type {
  GeneratedSession,
  GeneratedPlan,
  GeneratePlanParams,
  CoachGenerationProgress,
  AdaptAction,
  AdaptChange,
  AdaptPlanResult,
} from '@/hooks/coach/coach-generation';
export { useCoachPlan, useAdaptPlan } from '@/hooks/coach/use-coach-plan';
export { useCoachContext, useSaveCoachContext } from '@/hooks/coach/use-coach-context';
export {
  useWeeklyReview,
  useLatestWeeklyReview,
  useGenerateWeeklyReview,
} from '@/hooks/coach/use-weekly-review';
export {
  useConversations,
  useConversation,
  useCreateConversation,
  useSaveConversation,
  useRenameConversation,
  useDeleteConversation,
} from '@/hooks/coach/use-conversations';
