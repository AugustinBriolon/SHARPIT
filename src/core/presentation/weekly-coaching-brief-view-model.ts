/**
 * Weekly Coaching Brief — presentation ViewModel contract.
 *
 * Explains the current week: plan/goal context, planned vs. tolerated load, key
 * sessions, recovery strategy, today's limiting factor/confidence, assumptions and
 * data gaps, and what would make the week change. Never fabricates an objective
 * when no reliable plan/goal context exists — see `emptyState`.
 */

import type { PresentationEmptyState } from '@/core/presentation/types';

export type WeeklyBriefPlanContext = {
  readonly phaseLabel: string;
  readonly targetLoad: number;
  readonly isDeload: boolean;
  readonly focus: string | null;
};

export type WeeklyBriefGoalContext = {
  readonly title: string;
  readonly targetDateLabel: string | null;
  readonly daysToGo: number | null;
  readonly horizonLabel: string | null;
};

export type WeeklyBriefLoad = {
  readonly plannedLoad: number;
  readonly toleratedCeiling: number | null;
  readonly toleratedSource: 'PLAN_TARGET' | 'ACWR_ESTIMATE' | null;
};

export type WeeklyBriefKeySession = {
  readonly sessionId: string;
  readonly dateLabel: string;
  readonly typeLabel: string;
  readonly intensityLabel: string | null;
  readonly purpose: string | null;
};

export type WeeklyBriefRecovery = {
  readonly protectedDayLabels: readonly string[];
  readonly note: string;
};

export type WeeklyBriefLimitingFactor = {
  readonly limitingFactorLabel: string | null;
  readonly confidenceTierLabel: string | null;
  readonly asOfLabel: string;
};

export type WeeklyBriefLearningFeedbackItem = {
  readonly key: string;
  readonly sentence: string;
};

export type WeeklyCoachingBriefViewModel = {
  readonly weekStartLabel: string;
  readonly weekEndLabel: string;
  readonly visible: boolean;
  readonly planContext: WeeklyBriefPlanContext | null;
  readonly goalContext: WeeklyBriefGoalContext | null;
  readonly load: WeeklyBriefLoad | null;
  readonly keySessions: readonly WeeklyBriefKeySession[];
  readonly recovery: WeeklyBriefRecovery | null;
  readonly limitingFactor: WeeklyBriefLimitingFactor | null;
  readonly assumptions: readonly string[];
  readonly dataGaps: readonly string[];
  readonly whatWouldChange: readonly string[];
  readonly learningFeedback: readonly WeeklyBriefLearningFeedbackItem[];
  readonly emptyState: PresentationEmptyState | null;
};
