/**
 * Apply scenario modifications to planning slices.
 */

import type { SessionIntensity } from '@prisma/client';
import {
  INTENSITY_REDUCTION_TSS_FACTOR,
  type ScenarioDefinition,
  type ScenarioKind,
  type ScenarioSessionSlice,
} from '@/core/scenario/types';
import { addTrainingDays } from '@/lib/training/training-day';
import { localDateLabel } from '@/lib/projection/build-projection-input';

function sessionLabel(session: ScenarioSessionSlice): string {
  return session.title?.trim() || session.type;
}

function stepDownIntensity(intensity: SessionIntensity | null): SessionIntensity | null {
  if (!intensity) return intensity;
  const order: SessionIntensity[] = [
    'RECOVERY',
    'ENDURANCE',
    'TEMPO',
    'THRESHOLD',
    'VO2MAX',
    'RACE',
  ];
  const index = order.indexOf(intensity);
  if (index <= 0) return intensity;
  return order[index - 1];
}

export function applyScenarioModification(
  baseline: readonly ScenarioSessionSlice[],
  kind: ScenarioKind,
  targetSessionId: string,
  futureDayIds: readonly string[],
): ScenarioSessionSlice[] | null {
  const allowedDays = new Set(futureDayIds);
  const target = baseline.find((s) => s.sessionId === targetSessionId);
  if (!target && kind !== 'KEEP_PLAN') return null;

  switch (kind) {
    case 'KEEP_PLAN':
      return [...baseline];

    case 'REMOVE_SESSION':
      return baseline.filter((s) => s.sessionId !== targetSessionId);

    case 'REDUCE_INTENSITY':
      return baseline.map((s) =>
        s.sessionId === targetSessionId
          ? {
              ...s,
              tss: Math.round(s.tss * INTENSITY_REDUCTION_TSS_FACTOR),
              intensity: stepDownIntensity(s.intensity),
            }
          : s,
      );

    case 'INDOOR':
      return baseline.map((s) =>
        s.sessionId === targetSessionId
          ? {
              ...s,
              exposureSetting: 'INDOOR' as const,
              environmentalImpact: 'NONE' as const,
            }
          : s,
      );

    case 'DELAY_SESSION': {
      const nextDay = addTrainingDays(target!.trainingDayId, 1);
      if (!allowedDays.has(nextDay)) return null;
      return baseline.map((s) =>
        s.sessionId === targetSessionId ? { ...s, trainingDayId: nextDay } : s,
      );
    }

    case 'MOVE_EARLIER': {
      const prevDay = addTrainingDays(target!.trainingDayId, -1);
      if (!allowedDays.has(prevDay)) return null;
      return baseline.map((s) =>
        s.sessionId === targetSessionId ? { ...s, trainingDayId: prevDay } : s,
      );
    }

    default:
      return null;
  }
}

export function buildScenarioDefinition(
  kind: ScenarioKind,
  baseline: readonly ScenarioSessionSlice[],
  targetSessionId: string | null,
  futureDayIds: readonly string[],
): ScenarioDefinition | null {
  if (kind === 'KEEP_PLAN') {
    return {
      id: 'keep-plan',
      kind,
      label: 'Garder le plan actuel',
      rationale: 'Exécuter le plan tel qu’il est planifié.',
      targetSessionId: null,
      modifiedSessions: [...baseline],
      triggeredByDomain: null,
    };
  }

  if (!targetSessionId) return null;
  const target = baseline.find((s) => s.sessionId === targetSessionId);
  if (!target) return null;

  const modified = applyScenarioModification(baseline, kind, targetSessionId, futureDayIds);
  if (!modified) return null;

  const name = sessionLabel(target);
  const dayLabel = localDateLabel(target.trainingDayId);

  const definitions: Record<
    Exclude<ScenarioKind, 'KEEP_PLAN'>,
    { id: string; label: string; rationale: string }
  > = {
    DELAY_SESSION: {
      id: `delay-${targetSessionId}`,
      label: `Reporter « ${name} » à demain`,
      rationale: `Décale la séance du ${dayLabel} d’un jour pour lisser la charge et l’impact environnemental.`,
    },
    MOVE_EARLIER: {
      id: `earlier-${targetSessionId}`,
      label: `Avancer « ${name} »`,
      rationale: `Place la séance plus tôt dans l’horizon pour libérer les jours suivants.`,
    },
    REDUCE_INTENSITY: {
      id: `reduce-${targetSessionId}`,
      label: `Réduire l’intensité de « ${name} »`,
      rationale: `Charge TSS × ${INTENSITY_REDUCTION_TSS_FACTOR} — préserve le stimulus en limitant la fatigue.`,
    },
    INDOOR: {
      id: `indoor-${targetSessionId}`,
      label: `Passer « ${name} » en intérieur`,
      rationale: 'Supprime l’impact environnemental extérieur (stress thermique, etc.).',
    },
    REMOVE_SESSION: {
      id: `remove-${targetSessionId}`,
      label: `Retirer « ${name} »`,
      rationale: 'Retire la séance du plan sur l’horizon — maximise la récupération projetée.',
    },
  };

  const meta = definitions[kind as Exclude<ScenarioKind, 'KEEP_PLAN'>];
  return {
    id: meta.id,
    kind,
    label: meta.label,
    rationale: meta.rationale,
    targetSessionId,
    modifiedSessions: modified,
    triggeredByDomain: null,
  };
}

export function pickFocusSession(
  sessions: readonly ScenarioSessionSlice[],
): ScenarioSessionSlice | null {
  if (sessions.length === 0) return null;
  return [...sessions].sort((a, b) => {
    const dayCompare = a.trainingDayId.localeCompare(b.trainingDayId);
    if (dayCompare !== 0) return dayCompare;
    return b.tss - a.tss;
  })[0];
}
