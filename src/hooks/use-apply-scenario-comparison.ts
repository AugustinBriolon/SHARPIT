'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ScenarioKind } from '@/core/scenario/types';
import type { ProjectionHorizonDays } from '@/core/projection/types';
import { queryKeys } from '@/lib/query/keys';
import { listOptimistic } from '@/lib/query/optimistic';
import { sendJson } from '@/lib/query/send-json';
import type { ClientPlannedSession } from '@/lib/query/types';
import { optimisticSessionFieldsForKind } from '@/lib/scenario/apply-scenario-op';

export type ApplyScenarioComparisonVars = {
  scenarioId: string;
  kind: ScenarioKind;
  targetSessionId: string | null;
  horizonDays: ProjectionHorizonDays;
  anchorTrainingDayId?: string;
  label: string;
};

type ApplyScenarioComparisonResponse = {
  ok: true;
  keptPlan: boolean;
  kind: ScenarioKind;
  label: string;
  sessionId: string | null;
};

function patchSessionsForScenario(
  prev: ClientPlannedSession[],
  vars: ApplyScenarioComparisonVars,
): ClientPlannedSession[] {
  if (vars.kind === 'KEEP_PLAN' || !vars.targetSessionId) return prev;

  const target = prev.find((s) => s.id === vars.targetSessionId);
  if (!target) return prev;

  const fields = optimisticSessionFieldsForKind(vars.kind, {
    date: new Date(target.date),
    intensity: target.intensity,
    load: target.load,
  });

  if (fields === null) return prev;
  if (fields === 'remove') return prev.filter((s) => s.id !== vars.targetSessionId);

  return prev.map((s) =>
    s.id === vars.targetSessionId
      ? ({ ...s, ...fields, updatedAt: new Date() } as ClientPlannedSession)
      : s,
  );
}

export function useApplyScenarioComparison() {
  const queryClient = useQueryClient();
  const key = queryKeys.plannedSessions;

  return useMutation({
    mutationFn: (vars: ApplyScenarioComparisonVars) =>
      sendJson('/api/scenario-comparison/apply', 'POST', {
        scenarioId: vars.scenarioId,
        horizonDays: vars.horizonDays,
        anchorTrainingDayId: vars.anchorTrainingDayId,
      }) as Promise<ApplyScenarioComparisonResponse>,
    ...listOptimistic<
      ClientPlannedSession,
      ApplyScenarioComparisonVars,
      ApplyScenarioComparisonResponse
    >({
      queryClient,
      queryKey: key,
      apply: patchSessionsForScenario,
      success: (vars) => (vars.kind === 'KEEP_PLAN' ? 'Plan conservé' : `Appliqué : ${vars.label}`),
      error: "Impossible d'appliquer le scénario.",
    }),
    onSettled: (_data, _error, vars) => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ['presentation', 'scenario-comparison'] });
      void queryClient.invalidateQueries({ queryKey: ['presentation', 'projected-athlete'] });
      if (vars?.targetSessionId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.plannedSessionPresentation(vars.targetSessionId),
        });
      }
    },
  });
}
