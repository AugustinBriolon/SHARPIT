import { format } from 'date-fns';
import { currentTokens, type GarminTokens } from '@/lib/integrations/garmin/garmin';
import { encryptGarminToken, getGarminClient } from '@/lib/integrations/garmin/garmin-sync';
import {
  buildAlreadyPushedError,
  type GarminPushBlockReason,
  type GarminPushReceipt,
} from '@/lib/integrations/garmin/garmin-workout-push-state';
import { prisma } from '@/lib/prisma';

export type GarminClient = Awaited<ReturnType<typeof getGarminClient>>;

export class GarminWorkoutAlreadyPushedError extends Error {
  readonly status = 409;
  readonly body: GarminPushBlockReason;

  constructor(body: GarminPushBlockReason) {
    super(body.message);
    this.name = 'GarminWorkoutAlreadyPushedError';
    this.body = body;
  }
}

export async function persistGarminTokens(athleteId: string, tokens: GarminTokens): Promise<void> {
  await prisma.garminAccount.update({
    where: { athleteId },
    data: {
      oauth1TokenEnc: encryptGarminToken(tokens.oauth1),
      oauth2TokenEnc: encryptGarminToken(tokens.oauth2),
    },
  });
}

export async function workoutExistsOnConnect(
  client: GarminClient,
  workoutId: string,
): Promise<boolean | null> {
  try {
    await client.getWorkoutDetail({ workoutId });
    return true;
  } catch {
    return false;
  }
}

export async function workoutActiveOnCalendar(
  client: GarminClient,
  workoutId: string,
  scheduledDate: string | null,
): Promise<boolean | null> {
  if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) return null;
  const [year, month] = scheduledDate.split('-').map(Number);
  try {
    const calendar = await client.getMonthCalendarEvents(year, month - 1);
    const idNumber = Number(workoutId);
    return calendar.calendarItems.some(
      (item) =>
        item.date === scheduledDate &&
        item.workoutId != null &&
        (String(item.workoutId) === workoutId || item.workoutId === idNumber),
    );
  } catch {
    return null;
  }
}

/**
 * Block a second push of the same session unless the caller forces a replace.
 * The Connect status probe is best-effort: a network failure still blocks the
 * duplicate create, it just cannot say whether the previous workout survives.
 */
export async function assertNotAlreadyPushed(
  athleteId: string,
  session: {
    garminWorkoutId: string | null;
    garminWorkoutScheduledDate: string | null;
    garminWorkoutPushedAt: Date | null;
  },
): Promise<void> {
  if (!session.garminWorkoutId) return;

  const receipt: GarminPushReceipt = {
    workoutId: session.garminWorkoutId,
    scheduledDate: session.garminWorkoutScheduledDate,
    pushedAt: (session.garminWorkoutPushedAt ?? new Date()).toISOString(),
  };

  let workoutExists: boolean | null = null;
  let calendarActive: boolean | null = null;
  try {
    const client = await getGarminClient(athleteId);
    workoutExists = await workoutExistsOnConnect(client, session.garminWorkoutId);
    calendarActive = await workoutActiveOnCalendar(
      client,
      session.garminWorkoutId,
      session.garminWorkoutScheduledDate,
    );
    await persistGarminTokens(athleteId, currentTokens(client));
  } catch {
    // Probe is advisory only.
  }

  throw new GarminWorkoutAlreadyPushedError(
    buildAlreadyPushedError({ receipt, workoutExists, calendarActive }),
  );
}

export type CreatedWorkout = {
  workoutId: number | null;
  scheduledDate: string | null;
  pushedAt: string;
};

/**
 * Create a workout on Connect and, unless disabled, put it on the athlete
 * calendar — that scheduling step is what makes the watch pick it up on the
 * next device sync.
 */
export async function createAndScheduleWorkout(
  athleteId: string,
  options: {
    payload: Record<string, unknown>;
    schedule?: boolean;
    scheduleDate?: string | null;
    /** Previous Connect workout to delete when force-replacing. */
    replaceWorkoutId?: string | null;
  },
): Promise<CreatedWorkout> {
  const client = await getGarminClient(athleteId);

  if (options.replaceWorkoutId) {
    try {
      await client.deleteWorkout({ workoutId: options.replaceWorkoutId });
    } catch (error) {
      console.warn('[Garmin] delete previous workout failed:', error);
    }
  }

  const created = (await client.createWorkout(
    options.payload as unknown as Parameters<typeof client.createWorkout>[0],
  )) as { workoutId?: number };

  const workoutId = created.workoutId ?? null;
  let scheduledDate: string | null = null;

  if (options.schedule !== false && workoutId != null) {
    scheduledDate = options.scheduleDate?.trim() || format(new Date(), 'yyyy-MM-dd');
    await client.scheduleWorkout({ workoutId: String(workoutId) }, scheduledDate);
  }

  await persistGarminTokens(athleteId, currentTokens(client));

  return { workoutId, scheduledDate, pushedAt: new Date().toISOString() };
}
