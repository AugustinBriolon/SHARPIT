import type { GeneratedSession } from '@/hooks/use-coach';
import { resolveEnduranceFieldsForPersist } from '@/lib/planned-session/endurance/coach-endurance-prescription';
import { resolveStrengthFieldsForPersist } from '@/lib/planned-session/strength/strength-prescription';

export function buildPlanInsertPayloads(
  sessions: GeneratedSession[],
  selected: Set<number>,
  goalId: string | null,
) {
  return sessions
    .filter((_, index) => selected.has(index))
    .map((session) => {
      const strength = resolveStrengthFieldsForPersist({
        type: session.type,
        description: session.description,
        strengthPrescription: session.strengthPrescription,
      });
      const endurance = resolveEnduranceFieldsForPersist({
        type: session.type,
        description: strength.description,
        intensity: session.intensity,
        endurancePrescription: session.endurancePrescription,
      });
      return {
        type: session.type,
        date: new Date(`${session.date}T12:00:00`),
        startTime: session.startTime,
        title: session.title,
        description: endurance.description,
        strengthPrescription: strength.strengthPrescription,
        endurancePrescription: endurance.endurancePrescription,
        durationMin: session.durationMin,
        load: session.load,
        intensity: session.intensity,
        goalId,
        decisionId: session.decisionId,
      };
    });
}

export function preselectGeneratedSessions(
  sessions: GeneratedSession[],
  gateSessions: ReadonlyArray<{ status?: string }>,
) {
  return new Set(
    sessions.map((_, index) => index).filter((index) => gateSessions[index]?.status !== 'REJECTED'),
  );
}
