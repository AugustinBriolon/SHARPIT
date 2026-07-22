/**
 * Persist a chosen Scenario Engine alternative onto PlannedSession rows.
 */

import type { ProjectionHorizonDays } from '@/core/projection/types';
import type { ScenarioKind } from '@/core/scenario/types';
import { buildProjectionBaseContext } from '@/lib/projection/build-projection-input';
import { deletePlannedSession, getPlannedSessionById, updatePlannedSession } from '@/lib/queries';
import { buildScenarioApplyOp } from '@/lib/scenario/apply-scenario-op';
import { generateScenariosFromDecision } from '@/lib/scenario/generate-from-decision';

export type ApplyScenarioComparisonResult =
  | {
      ok: true;
      keptPlan: true;
      kind: 'KEEP_PLAN';
      label: string;
      sessionId: null;
    }
  | {
      ok: true;
      keptPlan: false;
      kind: Exclude<ScenarioKind, 'KEEP_PLAN'>;
      label: string;
      sessionId: string;
    }
  | { ok: false; error: string };

export async function applyScenarioComparisonChoice(input: {
  scenarioId: string;
  horizonDays?: ProjectionHorizonDays;
  anchorTrainingDayId?: string;
}): Promise<ApplyScenarioComparisonResult> {
  const context = await buildProjectionBaseContext({
    horizonDays: input.horizonDays,
    anchorTrainingDayId: input.anchorTrainingDayId,
  });
  if (!context) {
    return { ok: false, error: 'Impossible de reconstruire le contexte de projection' };
  }

  const definitions = generateScenariosFromDecision(
    context.sessionSlices,
    context.futureDayIds,
    context.anchorDecision,
  );
  const definition = definitions.find((d) => d.id === input.scenarioId);
  if (!definition) {
    return { ok: false, error: 'Scénario introuvable ou plus applicable' };
  }

  if (definition.kind === 'KEEP_PLAN') {
    return {
      ok: true,
      keptPlan: true,
      kind: 'KEEP_PLAN',
      label: definition.label,
      sessionId: null,
    };
  }

  if (!definition.targetSessionId) {
    return { ok: false, error: 'Scénario sans séance cible' };
  }

  const existing = await getPlannedSessionById(definition.targetSessionId);
  if (!existing) {
    return { ok: false, error: 'Séance cible introuvable' };
  }

  const applyOp = buildScenarioApplyOp(definition);
  if (applyOp.op === 'none') {
    return { ok: false, error: 'Ce scénario ne produit aucune modification' };
  }

  if (applyOp.op === 'remove') {
    await deletePlannedSession(applyOp.sessionId);
  } else {
    await updatePlannedSession(applyOp.sessionId, applyOp.data);
  }

  return {
    ok: true,
    keptPlan: false,
    kind: definition.kind,
    label: definition.label,
    sessionId: definition.targetSessionId,
  };
}
