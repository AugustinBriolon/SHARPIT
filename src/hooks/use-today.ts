'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// API response types (no server imports — mirrors API route response shapes)
// ─────────────────────────────────────────────────────────────────────────────

export type OverallVerdict =
  | 'TRAIN_HARD'
  | 'TRAIN_SMART'
  | 'TRAIN_EASY'
  | 'RECOVER'
  | 'RACE_READY'
  | 'CAUTION'
  | 'INSUFFICIENT_DATA';

export type PhysiologicalConsistency =
  'ALIGNED' | 'PARTIALLY_ALIGNED' | 'CONFLICTING' | 'INSUFFICIENT_DATA';

export type FindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface KeyFinding {
  id: string;
  category: string;
  severity: FindingSeverity;
  title: string;
  evidence: string[];
  confidence: number;
}

export interface TopAction {
  verb: string;
  focus: string;
  rationale: string;
  expectedBenefit: number;
}

export interface LimitingFactor {
  system: 'RECOVERY' | 'FATIGUE' | 'ADAPTATION' | null;
  description: string | null;
  actionable: boolean;
}

export interface ReasoningData {
  overallVerdict: OverallVerdict;
  physiologicalConsistency: PhysiologicalConsistency;
  consistencyScore: number;
  confidence: number;
  dataCompleteness: string;
  keyFindings: KeyFinding[];
  limitingFactor: LimitingFactor;
  topAction: TopAction | null;
  explanation: string;
  computedAt: string;
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
  confidence: number;
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

    Promise.all([
      fetchEngine<ReasoningData>(`/api/reasoning?${base}`),
      fetchEngine<RecoveryData>(`/api/recovery?${base}`),
      fetchEngine<FatigueData>(`/api/fatigue?${base}`),
      fetchEngine<AdaptationData>(`/api/adaptation?${base}`),
    ]).then(([reasoning, recovery, fatigue, adaptation]) => {
      if (cancelled) return;

      if (!reasoning && !recovery && !fatigue && !adaptation) {
        setError("Unable to load today's assessment. Please try again.");
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
