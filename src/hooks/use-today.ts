'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// API response types (no server imports — mirrors API route response shapes)
// ─────────────────────────────────────────────────────────────────────────────

export type I18nItem = {
  code: string;
  params?: Record<string, string | number>;
};

export type OverallVerdict =
  | 'TRAIN_HARD'
  | 'TRAIN_SMART'
  | 'TRAIN_EASY'
  | 'RECOVER'
  | 'RACE_READY'
  | 'CAUTION'
  | 'INSUFFICIENT_DATA';

export type SystemAttentionPriority = 'RECOVERY' | 'FATIGUE' | 'ADAPTATION' | 'BALANCED';

export type PhysiologicalConsistency =
  'ALIGNED' | 'PARTIALLY_ALIGNED' | 'CONFLICTING' | 'INSUFFICIENT_DATA';

export type FindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type OverreachingRisk = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type TrainingCapacity = 'FULL' | 'REDUCED' | 'LIGHT_ONLY' | 'REST_ONLY';

export type RecommendedIntensity = 'REST' | 'VERY_EASY' | 'EASY' | 'MODERATE' | 'HARD';

export type AdaptationDecisionVerdict =
  | 'INCREASE_LOAD'
  | 'SUSTAIN'
  | 'CONSOLIDATE'
  | 'REDUCE_LOAD'
  | 'RECOVERY_PRIORITY'
  | 'INSUFFICIENT_DATA';

export type RecoveryDecisionVerdict =
  'RECOVERED' | 'PARTIALLY_RECOVERED' | 'FATIGUED' | 'OVERREACHED' | 'INSUFFICIENT_DATA';

export type FatigueDecisionVerdict =
  'BUILD' | 'MAINTAIN' | 'REDUCE' | 'REST_WEEK' | 'TAPER' | 'INSUFFICIENT_DATA';

export interface KeyFinding {
  id: string;
  category: string;
  severity: FindingSeverity;
  title: I18nItem;
  evidenceItems: I18nItem[];
  confidence: number;
}

export interface TopAction {
  verbCode: string;
  focusCode: string;
  rationaleCode: string;
  expectedBenefit: number;
}

export interface LimitingFactor {
  system: 'RECOVERY' | 'FATIGUE' | 'ADAPTATION' | null;
  description: I18nItem | null;
  actionable: boolean;
}

export interface Opportunity {
  id: string;
  type: string;
  title: I18nItem;
  rationale: I18nItem;
  expectedBenefit: number;
  timeWindow: string;
}

export interface Conflict {
  id: string;
  type: string;
  descriptionCode: string;
  models: string[];
  resolutionCode: string;
}

export interface EngineRecommendation {
  type: string;
  keyEvidence: I18nItem[];
  confidence?: number;
}

export interface ReasoningData {
  overallVerdict: OverallVerdict;
  systemAttentionPriority: SystemAttentionPriority;
  physiologicalConsistency: PhysiologicalConsistency;
  consistencyScore: number;
  confidence: number;
  dataCompleteness: string;
  keyFindings: KeyFinding[];
  limitingFactor: LimitingFactor;
  topAction: TopAction | null;
  opportunities: Opportunity[];
  conflicts: Conflict[];
  computedAt: string;
  signals: {
    availableModelCount: number;
    hasRecoveryState: boolean;
    hasFatigueState: boolean;
    hasAdaptationState: boolean;
  };
}

export type ReadinessCategory =
  | 'OPTIMAL'
  | 'ADEQUATE'
  | 'REDUCED'
  | 'LOW'
  | 'VERY_LOW'
  | 'BASELINE_PENDING'
  | 'INSUFFICIENT_DATA';

export interface RecoveryData {
  readinessScore: number | null;
  readinessCategory: ReadinessCategory;
  confidence: number;
  recommendation: EngineRecommendation;
  decision: {
    verdict: RecoveryDecisionVerdict;
    recommendedIntensity: RecommendedIntensity;
    rationale: I18nItem[];
  };
  signals: {
    overreachingRisk: OverreachingRisk;
  };
  computedAt: string;
}

export type FatigueLevel =
  | 'FRESH'
  | 'FUNCTIONAL_LOW'
  | 'FUNCTIONAL_HIGH'
  | 'ACCUMULATED'
  | 'NON_FUNCTIONAL_RISK'
  | 'OVERREACHING_RISK'
  | 'INSUFFICIENT_DATA';

export type FatigueTrajectory = 'RESOLVING' | 'STABLE' | 'ACCUMULATING' | 'ACCELERATING';

export interface FatigueData {
  fatigueLevel: FatigueLevel;
  trajectory: FatigueTrajectory;
  trainingCapacity: TrainingCapacity;
  confidence: number;
  recommendation: EngineRecommendation;
  decision: {
    verdict: FatigueDecisionVerdict;
    trainingCapacity: TrainingCapacity;
    rationale: I18nItem[];
  };
  signals: {
    functionalOverreachingRisk: OverreachingRisk;
  };
  computedAt: string;
}

export type AdaptationStatus =
  | 'POSITIVELY_ADAPTING'
  | 'MAINTAINING'
  | 'PLATEAUING'
  | 'MALADAPTING'
  | 'DETRAINING'
  | 'INSUFFICIENT_DATA';

export type AdaptationTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

export interface AdaptationData {
  adaptationStatus: AdaptationStatus;
  adaptationTrend: AdaptationTrend;
  confidence: number;
  decision: {
    verdict: AdaptationDecisionVerdict;
    loadMultiplier: number;
    rationale: I18nItem[];
  };
  recommendation: EngineRecommendation;
  computedAt: string;
}

export interface TodayState {
  reasoning: ReasoningData | null;
  recovery: RecoveryData | null;
  fatigue: FatigueData | null;
  adaptation: AdaptationData | null;
}

export interface UseTodayResult {
  data: TodayState;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

async function fetchEngine<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export function useToday(date: Date = new Date()): UseTodayResult {
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const [data, setData] = useState<TodayState>({
    reasoning: null,
    recovery: null,
    fatigue: null,
    adaptation: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const refreshParam = refreshKey > 0 ? '&refresh=true' : '';
    const base = `trainingDayId=${trainingDayId}&athleteId=default${refreshParam}`;

    // Step 1 — recovery/fatigue/adaptation in parallel: they update the Digital Twin.
    // Step 2 — reasoning runs after, so it reads the freshly updated Digital Twin states.
    // This ordering prevents the race condition where reasoning reads an empty twin.
    Promise.all([
      fetchEngine<RecoveryData>(`/api/recovery?${base}`),
      fetchEngine<FatigueData>(`/api/fatigue?${base}`),
      fetchEngine<AdaptationData>(`/api/adaptation?${base}`),
    ]).then(async ([recovery, fatigue, adaptation]) => {
      if (cancelled) return;
      const reasoning = await fetchEngine<ReasoningData>(`/api/reasoning?${base}`);
      if (cancelled) return;

      if (!reasoning && !recovery && !fatigue && !adaptation) {
        setError('Impossible de charger ton bilan du jour. Réessaie.');
      }

      setData({ reasoning, recovery, fatigue, adaptation });
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [trainingDayId, refreshKey]);

  return {
    data,
    loading,
    error,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
