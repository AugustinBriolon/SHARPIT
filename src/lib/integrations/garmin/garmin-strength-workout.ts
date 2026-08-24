import { ActivityType } from '@prisma/client';
import { format } from 'date-fns';
import { dayKeyFromDate, shortDayFromDate } from '@/lib/date/day-key';
import { ensureGarminExerciseLabelsFr } from '@/lib/integrations/garmin/garmin-exercise-labels';
import {
  invertGarminExerciseLabelsFr,
  resolveGarminExerciseRef,
} from '@/lib/integrations/garmin/garmin-exercise-map';
import {
  buildStrengthWorkoutPayload,
  type StrengthWorkoutMappedStep,
  type StrengthWorkoutSetInput,
} from '@/lib/integrations/garmin/garmin-strength-workout-payload';
import {
  assertNotAlreadyPushed,
  createAndScheduleWorkout,
} from '@/lib/integrations/garmin/garmin-workout-push';
import {
  formatStrengthPrescriptionSummary,
  attachGarminRefsToPrescription,
  parseStrengthPrescription,
} from '@/lib/planned-session/strength/strength-prescription';
import { prisma } from '@/lib/prisma';

export type PushStrengthWorkoutResult = {
  workoutId: number | null;
  workoutName: string;
  mappedCount: number;
  /** Exactly what the watch will show, exercise by exercise. */
  mapped: StrengthWorkoutMappedStep[];
  skipped: Array<{ exercise: string; reason: string }>;
  scheduledDate: string | null;
  alreadyPushed?: boolean;
  workoutExists?: boolean | null;
  calendarActive?: boolean | null;
  pushedAt?: string | null;
};

async function uploadStrengthSets(
  athleteId: string,
  options: {
    workoutName: string;
    description?: string | null;
    sets: StrengthWorkoutSetInput[];
    schedule?: boolean;
    scheduleDate?: string | null;
    /** Previous Connect workout to delete when force-replacing. */
    replaceWorkoutId?: string | null;
  },
): Promise<PushStrengthWorkoutResult> {
  const labelsFr = await ensureGarminExerciseLabelsFr();
  const frLeafByLabel = invertGarminExerciseLabelsFr(labelsFr);

  const sets: StrengthWorkoutSetInput[] = options.sets.map((set) => ({
    ...set,
    garmin:
      set.garmin ??
      resolveGarminExerciseRef({
        exercise: set.exercise,
        exerciseCatalogId: set.exerciseCatalogId,
        frLeafByLabel,
      }),
  }));

  const built = buildStrengthWorkoutPayload({
    workoutName: options.workoutName,
    description: options.description ?? 'Envoyé depuis SHARPIT',
    sets,
  });

  if (built.mappedCount === 0) {
    throw new Error('Aucun exercice à envoyer');
  }

  const created = await createAndScheduleWorkout(athleteId, {
    payload: built.payload,
    schedule: options.schedule,
    scheduleDate: options.scheduleDate,
    replaceWorkoutId: options.replaceWorkoutId,
  });

  return {
    workoutId: created.workoutId,
    workoutName: options.workoutName,
    mappedCount: built.mappedCount,
    mapped: built.mapped,
    skipped: built.skipped,
    scheduledDate: created.scheduledDate,
    alreadyPushed: false,
    calendarActive: created.scheduledDate != null,
    workoutExists: created.workoutId != null,
    pushedAt: created.pushedAt,
  };
}

/**
 * Push a STRENGTH activity's sets to Garmin Connect as a workout template,
 * optionally scheduled on the athlete calendar (syncs to watch on next device sync).
 */
export async function pushStrengthWorkoutFromActivity(
  athleteId: string,
  options: {
    activityId: string;
    /** YYYY-MM-DD — defaults to today when schedule=true */
    scheduleDate?: string | null;
    schedule?: boolean;
  },
): Promise<PushStrengthWorkoutResult> {
  const activity = await prisma.activity.findFirst({
    where: { id: options.activityId, athleteId },
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      strengthSets: {
        orderBy: { order: 'asc' },
        select: {
          exercise: true,
          exerciseCatalogId: true,
          sets: true,
          reps: true,
          durationSec: true,
          weightKg: true,
          restSec: true,
          notes: true,
        },
      },
    },
  });

  if (!activity) throw new Error('Séance introuvable');
  if (activity.type !== ActivityType.STRENGTH) {
    throw new Error('Seules les séances de musculation peuvent être envoyées à la montre');
  }
  if (activity.strengthSets.length === 0) {
    throw new Error('Aucun exercice à envoyer');
  }

  // Activity.date is an instant, not a calendar day — the athlete's local day is right here.
  const workoutName = activity.title?.trim() || `SHARPIT muscu ${format(activity.date, 'dd/MM')}`;

  return uploadStrengthSets(athleteId, {
    workoutName,
    description: 'Envoyé depuis SHARPIT (séance réalisée)',
    sets: activity.strengthSets,
    schedule: options.schedule,
    scheduleDate: options.scheduleDate,
  });
}

/**
 * Push a planned STRENGTH session prescription to Garmin Connect,
 * scheduled on the planned session date by default.
 * Blocks duplicate pushes unless `force` is true (replaces previous workout).
 */
export async function pushStrengthWorkoutFromPlannedSession(
  athleteId: string,
  options: {
    plannedSessionId: string;
    scheduleDate?: string | null;
    schedule?: boolean;
    /** Replace previous Garmin workout if already pushed. */
    force?: boolean;
  },
): Promise<PushStrengthWorkoutResult> {
  const session = await prisma.plannedSession.findFirst({
    where: { id: options.plannedSessionId, athleteId },
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      description: true,
      strengthPrescription: true,
      garminWorkoutId: true,
      garminWorkoutScheduledDate: true,
      garminWorkoutPushedAt: true,
    },
  });

  if (!session) throw new Error('Séance planifiée introuvable');
  if (session.type !== ActivityType.STRENGTH) {
    throw new Error('Seules les séances de musculation peuvent être envoyées à la montre');
  }

  if (!options.force) await assertNotAlreadyPushed(athleteId, session);

  const prescriptionParsed = parseStrengthPrescription(session.strengthPrescription);
  const prescription = prescriptionParsed
    ? attachGarminRefsToPrescription(prescriptionParsed)
    : null;
  if (!prescription) {
    throw new Error('Aucun exercice prescrit — ajoute des exercices à la séance planifiée');
  }

  const workoutName = session.title?.trim() || `SHARPIT muscu ${shortDayFromDate(session.date)}`;

  const description =
    session.description?.trim() ||
    formatStrengthPrescriptionSummary(prescription) ||
    'Envoyé depuis SHARPIT (séance planifiée)';

  const result = await uploadStrengthSets(athleteId, {
    workoutName,
    description,
    sets: prescription.sets.map((set) => ({
      exercise: set.exercise,
      exerciseCatalogId: set.exerciseCatalogId,
      sets: set.sets,
      reps: set.reps,
      durationSec: set.durationSec,
      weightKg: set.weightKg,
      restSec: set.restSec,
      restMode: set.restMode,
      notes: set.notes,
      garmin: set.garmin
        ? {
            category: set.garmin.category,
            exerciseName: set.garmin.exerciseName,
            confidence: set.garmin.confidence,
          }
        : null,
    })),
    schedule: options.schedule,
    scheduleDate: options.scheduleDate ?? dayKeyFromDate(session.date),
    replaceWorkoutId: options.force ? session.garminWorkoutId : null,
  });

  if (result.workoutId != null) {
    const pushedAt = new Date();
    await prisma.plannedSession.update({
      where: { id: session.id },
      data: {
        garminWorkoutId: String(result.workoutId),
        garminWorkoutScheduledDate: result.scheduledDate,
        garminWorkoutPushedAt: pushedAt,
      },
    });
    result.pushedAt = pushedAt.toISOString();
  }

  return result;
}
