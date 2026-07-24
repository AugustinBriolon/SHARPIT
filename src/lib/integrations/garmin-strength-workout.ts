import { ActivityType, Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { ensureGarminExerciseLabelsFr } from '@/lib/integrations/garmin-exercise-labels';
import {
  invertGarminExerciseLabelsFr,
  resolveGarminExerciseRef,
} from '@/lib/integrations/garmin-exercise-map';
import {
  buildStrengthWorkoutPayload,
  type StrengthWorkoutSetInput,
} from '@/lib/integrations/garmin-strength-workout-payload';
import { currentTokens, type GarminTokens } from '@/lib/integrations/garmin';
import { getGarminClient } from '@/lib/integrations/garmin-sync';
import {
  buildAlreadyPushedError,
  type GarminPushBlockReason,
  type GarminPushReceipt,
} from '@/lib/integrations/garmin-workout-push-state';
import {
  formatStrengthPrescriptionSummary,
  attachGarminRefsToPrescription,
  parseStrengthPrescription,
} from '@/lib/planned-session/strength-prescription';
import { prisma } from '@/lib/prisma';

const ACCOUNT_ID = 'default';

export type PushStrengthWorkoutResult = {
  workoutId: number | null;
  workoutName: string;
  mappedCount: number;
  skipped: Array<{ exercise: string; reason: string }>;
  scheduledDate: string | null;
  alreadyPushed?: boolean;
  workoutExists?: boolean | null;
  calendarActive?: boolean | null;
  pushedAt?: string | null;
};

export class GarminWorkoutAlreadyPushedError extends Error {
  readonly status = 409;
  readonly body: GarminPushBlockReason;

  constructor(body: GarminPushBlockReason) {
    super(body.message);
    this.name = 'GarminWorkoutAlreadyPushedError';
    this.body = body;
  }
}

async function persistGarminTokens(tokens: GarminTokens): Promise<void> {
  await prisma.garminAccount.update({
    where: { id: ACCOUNT_ID },
    data: {
      oauth1Token: tokens.oauth1 as unknown as Prisma.InputJsonValue,
      oauth2Token: tokens.oauth2 as unknown as Prisma.InputJsonValue,
    },
  });
}

async function workoutExistsOnConnect(
  client: Awaited<ReturnType<typeof getGarminClient>>,
  workoutId: string,
): Promise<boolean | null> {
  try {
    await client.getWorkoutDetail({ workoutId });
    return true;
  } catch {
    return false;
  }
}

async function workoutActiveOnCalendar(
  client: Awaited<ReturnType<typeof getGarminClient>>,
  workoutId: string,
  scheduledDate: string | null,
): Promise<boolean | null> {
  if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) return null;
  const [y, m] = scheduledDate.split('-').map(Number);
  try {
    const calendar = await client.getMonthCalendarEvents(y, m - 1);
    const idNum = Number(workoutId);
    return calendar.calendarItems.some(
      (item) =>
        item.date === scheduledDate &&
        item.workoutId != null &&
        (String(item.workoutId) === workoutId || item.workoutId === idNum),
    );
  } catch {
    return null;
  }
}

async function uploadStrengthSets(options: {
  workoutName: string;
  description?: string | null;
  sets: StrengthWorkoutSetInput[];
  schedule?: boolean;
  scheduleDate?: string | null;
  /** Previous Connect workout to delete when force-replacing. */
  replaceWorkoutId?: string | null;
}): Promise<PushStrengthWorkoutResult> {
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

  const client = await getGarminClient();

  if (options.replaceWorkoutId) {
    try {
      await client.deleteWorkout({ workoutId: options.replaceWorkoutId });
    } catch (error) {
      console.warn('[Garmin] delete previous workout failed:', error);
    }
  }

  const created = (await client.createWorkout(
    built.payload as unknown as Parameters<typeof client.createWorkout>[0],
  )) as { workoutId?: number };

  const workoutId = created.workoutId ?? null;
  let scheduledDate: string | null = null;

  const shouldSchedule = options.schedule !== false;
  if (shouldSchedule && workoutId != null) {
    scheduledDate = options.scheduleDate?.trim() || format(new Date(), 'yyyy-MM-dd');
    await client.scheduleWorkout({ workoutId: String(workoutId) }, scheduledDate);
  }

  await persistGarminTokens(currentTokens(client));

  return {
    workoutId,
    workoutName: options.workoutName,
    mappedCount: built.mappedCount,
    skipped: built.skipped,
    scheduledDate,
    alreadyPushed: false,
    calendarActive: scheduledDate != null,
    workoutExists: workoutId != null,
    pushedAt: new Date().toISOString(),
  };
}

/**
 * Push a STRENGTH activity's sets to Garmin Connect as a workout template,
 * optionally scheduled on the athlete calendar (syncs to watch on next device sync).
 */
export async function pushStrengthWorkoutFromActivity(options: {
  activityId: string;
  /** YYYY-MM-DD — defaults to today when schedule=true */
  scheduleDate?: string | null;
  schedule?: boolean;
}): Promise<PushStrengthWorkoutResult> {
  const activity = await prisma.activity.findUnique({
    where: { id: options.activityId },
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

  const workoutName = activity.title?.trim() || `SHARPIT muscu ${format(activity.date, 'dd/MM')}`;

  return uploadStrengthSets({
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
export async function pushStrengthWorkoutFromPlannedSession(options: {
  plannedSessionId: string;
  scheduleDate?: string | null;
  schedule?: boolean;
  /** Replace previous Garmin workout if already pushed. */
  force?: boolean;
}): Promise<PushStrengthWorkoutResult> {
  const session = await prisma.plannedSession.findUnique({
    where: { id: options.plannedSessionId },
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

  if (session.garminWorkoutId && !options.force) {
    const receipt: GarminPushReceipt = {
      workoutId: session.garminWorkoutId,
      scheduledDate: session.garminWorkoutScheduledDate,
      pushedAt: (session.garminWorkoutPushedAt ?? new Date()).toISOString(),
    };
    let workoutExists: boolean | null = null;
    let calendarActive: boolean | null = null;
    try {
      const client = await getGarminClient();
      workoutExists = await workoutExistsOnConnect(client, session.garminWorkoutId);
      calendarActive = await workoutActiveOnCalendar(
        client,
        session.garminWorkoutId,
        session.garminWorkoutScheduledDate,
      );
      await persistGarminTokens(currentTokens(client));
    } catch {
      // Status probe is best-effort — still block duplicate create.
    }
    throw new GarminWorkoutAlreadyPushedError(
      buildAlreadyPushedError({ receipt, workoutExists, calendarActive }),
    );
  }

  const prescriptionParsed = parseStrengthPrescription(session.strengthPrescription);
  const prescription = prescriptionParsed
    ? attachGarminRefsToPrescription(prescriptionParsed)
    : null;
  if (!prescription) {
    throw new Error('Aucun exercice prescrit — ajoute des exercices à la séance planifiée');
  }

  const workoutName = session.title?.trim() || `SHARPIT muscu ${format(session.date, 'dd/MM')}`;

  const description =
    session.description?.trim() ||
    formatStrengthPrescriptionSummary(prescription) ||
    'Envoyé depuis SHARPIT (séance planifiée)';

  const result = await uploadStrengthSets({
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
      notes: set.notes,
      garmin: set.garmin
        ? { category: set.garmin.category, exerciseName: set.garmin.exerciseName }
        : null,
    })),
    schedule: options.schedule,
    scheduleDate: options.scheduleDate ?? format(session.date, 'yyyy-MM-dd'),
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
