'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback } from 'react';
import { queryKeys } from '@/lib/query/keys';
import { fetchAthleteSnapshot, refreshAthleteSnapshot } from '@/lib/query/athlete-snapshot-fetch';
import { snapshotToProductView } from '@/lib/athlete-state/product-view';
import type { AthleteSnapshotProductView } from '@/lib/athlete-state/product-view';

// Domain types live in Core — re-exported here for existing import paths.
export type {
  DecisionData,
  EnvironmentSnapshotData,
  I18nItem,
  OverallVerdict,
  SystemAttentionPriority,
  PhysiologicalConsistency,
  FindingSeverity,
  OverreachingRisk,
  TrainingCapacity,
  RecommendedIntensity,
  AdaptationDecisionVerdict,
  RecoveryDecisionVerdict,
  FatigueDecisionVerdict,
  KeyFinding,
  TopAction,
  LimitingFactor,
  Opportunity,
  Conflict,
  DimensionResult,
  EngineRecommendation,
  EvidenceGraph,
  ReasoningData,
  ReadinessCategory,
  AutonomicBalance,
  SubjectiveWellness,
  LoadStressContext,
  SleepAdequacySignal,
  IllnessRisk,
  RecoveryData,
  FatigueLevel,
  FatigueTrajectory,
  FatigueType,
  TrainingCapacityLevel,
  ConditionTrend,
  ConditionStatus,
  PhysicalHealthDecisionVerdict,
  InferredConditionData,
  PhysicalHealthData,
  FatigueData,
  DailyStrainTier,
  DailyStrainSource,
  DailyStrainContributor,
  DailyStrainContribution,
  DailyStrainData,
  AdaptationStatus,
  AdaptationTrend,
  AdaptationData,
  TodayState,
} from '@/core/athlete-state/today-state';

const EMPTY_PRODUCT_VIEW: AthleteSnapshotProductView = {
  decision: null,
  adviceActionable: false,
  todaysDecision: null,
  limitingFactor: null,
  confidence: null,
  confidenceLabel: null,
  readiness: null,
  sleepScore: null,
  adaptationIndex: null,
  recovery: null,
  fatigue: null,
  adaptation: null,
  physicalHealth: null,
  environment: null,
  dailyStrain: null,
};

export interface UseTodayResult {
  /** Decision-first athlete product view from AthleteSnapshot. */
  data: AthleteSnapshotProductView;
  /** True only on first load (no cache). Prefer over legacy isLoading patterns. */
  loading: boolean;
  isPending: boolean;
  isFetching: boolean;
  error: string | null;
  refresh: () => Promise<AthleteSnapshotProductView>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useToday(date: Date = new Date()): UseTodayResult {
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.athleteSnapshot(trainingDayId),
    queryFn: () => fetchAthleteSnapshot(trainingDayId),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    select: (envelope) => snapshotToProductView(envelope.snapshot),
  });

  const refresh = useCallback(async () => {
    const result = await refreshAthleteSnapshot(trainingDayId);
    queryClient.setQueryData(queryKeys.athleteSnapshot(trainingDayId), result);
    return snapshotToProductView(result.snapshot);
  }, [queryClient, trainingDayId]);

  return {
    data: query.data ?? EMPTY_PRODUCT_VIEW,
    loading: query.isPending && query.data == null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}
