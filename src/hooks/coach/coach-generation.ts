'use client';

import { consumeCoachProgressStream } from '@/lib/coach/chat/transcript/coach-progress-stream';
import { AI_BUDGET_WARNING_HEADER, aiBudgetWarningMessage } from '@/lib/access/ai-budget-shared';
import { toast } from '@/components/ui/toast';
import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { CoachEndurancePrescription } from '@/lib/planned-session/endurance/coach-endurance-prescription';
import type { GateResult } from '@/lib/plan-gate/types';
// The shape the coach actually returns — mirroring it by hand let it drift.
import type { CoachStrengthPrescription } from '@/lib/planned-session/strength/strength-prescription';

export interface GeneratedSession {
  dayOffset: number;
  date: string; // yyyy-MM-dd
  startTime: string | null; // HH:mm
  type: ActivityType;
  intensity: SessionIntensity;
  title: string;
  description: string;
  strengthPrescription?: CoachStrengthPrescription | null;
  endurancePrescription?: CoachEndurancePrescription | null;
  durationMin: number;
  load: number;
  rationale: string;
  /** Origin CoachingDecision id — null when the Gate rejected the proposal outright. */
  decisionId: string | null;
}

export interface GeneratedPlan {
  summary: string;
  startDate: string;
  sessions: GeneratedSession[];
  gate: GateResult;
}

export interface GeneratePlanParams {
  startDate?: string;
  days?: number;
  focus?: string;
  goalId?: string | null;
  targetLoad?: number | null;
  planPhase?: string | null;
  planFocus?: string | null;
}

/**
 * Progress surfaced while a long generation runs.
 *
 * `plan` and `adapt` stream the model's reasoning before the object exists —
 * that deliberation is the only content available for the first several seconds
 * and is what the generation dialogs show instead of a bare spinner.
 */
export type CoachGenerationProgress = {
  /** Reasoning accumulated so far, in stream order. */
  reasoning: string;
  /** Sessions/changes recovered from the partial JSON, may be incomplete. */
  partialCount: number;
};

function countPartialItems(value: unknown, key: 'sessions' | 'changes'): number {
  if (typeof value !== 'object' || value === undefined || value === null) {
    return 0;
  }
  const list = (value as Record<string, unknown>)[key];
  return Array.isArray(list) ? list.length : 0;
}

/**
 * POSTs to a streaming coach endpoint and reports progress as it arrives.
 * Non-2xx responses still answer with plain JSON (bad params, coach unconfigured).
 */
type PostCoachGenerationOptions = {
  url: string;
  params: unknown;
  partialKey: 'sessions' | 'changes';
  onProgress?: (progress: CoachGenerationProgress) => void;
  fallbackError?: string;
};

export async function postCoachGeneration<TResult>({
  url,
  params,
  partialKey,
  onProgress,
  fallbackError = 'La génération a échoué.',
}: PostCoachGenerationOptions): Promise<TResult> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data as { error?: string } | null)?.error ?? fallbackError);
  }

  if (res.headers.get(AI_BUDGET_WARNING_HEADER) === '1') {
    toast.info(aiBudgetWarningMessage());
  }

  let reasoning = '';
  let partialCount = 0;
  return consumeCoachProgressStream<TResult, unknown>(res, {
    onReasoning: (delta) => {
      reasoning += delta;
      onProgress?.({ reasoning, partialCount });
    },
    onPartial: (value) => {
      partialCount = countPartialItems(value, partialKey);
      onProgress?.({ reasoning, partialCount });
    },
  });
}

export type AdaptAction = 'MODIFY' | 'REMOVE' | 'ADD';

export interface AdaptChange {
  action: AdaptAction;
  sessionId: string | null;
  date: string | null;
  type: ActivityType | null;
  intensity: SessionIntensity | null;
  title: string | null;
  description: string | null;
  strengthPrescription?: CoachStrengthPrescription | null;
  endurancePrescription?: CoachEndurancePrescription | null;
  durationMin: number | null;
  load: number | null;
  reason: string;
  /** Origin CoachingDecision id — null for REMOVE changes and non-gated proposals. */
  decisionId: string | null;
}

export interface AdaptPlanResult {
  summary: string;
  changes: AdaptChange[];
  gate: GateResult;
}
