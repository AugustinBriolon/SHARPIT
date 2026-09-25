'use client';

import { format, parseISO, startOfWeek } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import {
  buildPlanInsertPayloads,
  preselectGeneratedSessions,
} from '@/components/coach/plan/plan-generator-helpers';
import { useCoachPlan, type CoachGenerationProgress } from '@/hooks/use-coach';
import { useGoals, usePlannedSessionMutations, useTrainingPlan } from '@/hooks/use-data';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { warmCoachContext } from '@/lib/coach/warm-coach-context';
import { resolveDefaultPlanGoalId } from '@/lib/planned-session/plan-goal';
import { phaseLabels } from '@/lib/training/periodization';

const WEEK_OPTS = { weekStartsOn: 1 as const };
const NO_GOAL = 'none';

function buildCoachPlanRequest({
  days,
  focus,
  goalId,
  planWeek,
  startDate,
}: {
  days: string;
  focus: string;
  goalId: string;
  planWeek: { targetLoad: number; phase: keyof typeof phaseLabels; focus: string | null } | null;
  startDate?: string;
}) {
  return {
    days: Number(days),
    focus: focus.trim() || undefined,
    startDate,
    goalId: goalId === NO_GOAL ? null : goalId,
    targetLoad: planWeek?.targetLoad ?? null,
    planPhase: planWeek ? phaseLabels[planWeek.phase] : null,
    planFocus: planWeek?.focus ?? null,
  };
}

export function usePlanGenerator(startDate?: string, onClose?: () => void) {
  const [days, setDays] = useState('7');
  const [focus, setFocus] = useState('');
  const [goalId, setGoalId] = useState<string>(NO_GOAL);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<CoachGenerationProgress | null>(null);

  const coachPlan = useCoachPlan(setProgress);
  const { createMany } = usePlannedSessionMutations();
  const goalsQuery = useGoals();
  const planQuery = useTrainingPlan();
  const plan = coachPlan.data;
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  useEffect(() => {
    warmCoachContext({ includeScenario: true });
  }, []);

  const planWeek = useMemo(() => {
    const active = planQuery.data;
    if (!active?.weeks?.length) {
      return null;
    }
    const blockStart = startDate ? parseISO(startDate) : new Date();
    const ws = format(startOfWeek(blockStart, WEEK_OPTS), 'yyyy-MM-dd');
    return active.weeks.find((w) => format(new Date(w.weekStart), 'yyyy-MM-dd') === ws) ?? null;
  }, [planQuery.data, startDate]);

  const datedGoals = useMemo(() => {
    const now = new Date();
    return (goalsQuery.data ?? [])
      .filter((goal) => !goal.achieved && goal.targetDate)
      .filter((goal) => new Date(goal.targetDate as unknown as string) >= now);
  }, [goalsQuery.data]);

  const selectableGoalIds = useMemo(() => datedGoals.map((goal) => goal.id), [datedGoals]);

  useEffect(() => {
    const fromPlan = resolveDefaultPlanGoalId(planQuery.data?.goalId, selectableGoalIds);
    if (!fromPlan) {
      return;
    }
    setGoalId((current) => (current === NO_GOAL ? fromPlan : current));
  }, [planQuery.data?.goalId, selectableGoalIds]);

  async function handleGenerate() {
    if (guardDisabled) {
      return;
    }
    setProgress(null);
    const result = await coachPlan.mutateAsync(
      buildCoachPlanRequest({ days, focus, goalId, planWeek, startDate }),
    );
    setSelected(preselectGeneratedSessions(result.sessions, result.gate.sessions));
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function handleInsert() {
    if (guardDisabled || !plan || selected.size === 0) {
      return;
    }
    const payloads = buildPlanInsertPayloads(
      plan.sessions,
      selected,
      goalId === NO_GOAL ? null : goalId,
    );
    createMany.mutate(payloads);
    onClose?.();
  }

  return {
    coachPlan,
    datedGoals,
    days,
    focus,
    goalId,
    guardDisabled,
    handleGenerate,
    handleInsert,
    isGenerating: coachPlan.isPending,
    offline,
    offlineLabel,
    plan,
    planWeek,
    progress,
    selected,
    setDays,
    setFocus,
    setGoalId,
    toggle,
  };
}
