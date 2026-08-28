import { Prisma } from '@prisma/client';
import { dayKeyFromDate, shortDayFromDate } from '@/lib/date/day-key';
import {
  buildEnduranceWorkoutPayload,
  type EnduranceWorkoutMappedStep,
} from '@/lib/integrations/garmin/garmin-endurance-workout-payload';
import {
  assertNotAlreadyPushed,
  createAndScheduleWorkout,
} from '@/lib/integrations/garmin/garmin-workout-push';
import {
  enduranceSportFromActivityType,
  type EnduranceSport,
} from '@/lib/planned-session/endurance/endurance-prescription';
import { effectiveEndurancePrescription } from '@/lib/planned-session/endurance/endurance-session';
import { type AthleteThresholds } from '@/lib/planned-session/endurance/endurance-targets';
import { prisma } from '@/lib/prisma';

const SPORT_LABEL_FR: Record<EnduranceSport, string> = {
  RUN: 'course',
  BIKE: 'vélo',
  SWIM: 'natation',
};

export type PushEnduranceWorkoutResult = {
  workoutId: number | null;
  workoutName: string;
  sport: EnduranceSport;
  stepCount: number;
  /** Exactly what the watch will show, step by step. */
  mapped: EnduranceWorkoutMappedStep[];
  /** Targets that could not be resolved, athlete-facing. */
  warnings: string[];
  /** True when the session had no structure and was derived from duration + intensity. */
  derived: boolean;
  scheduledDate: string | null;
  alreadyPushed?: boolean;
  workoutExists?: boolean | null;
  calendarActive?: boolean | null;
  pushedAt?: string | null;
};

type PushProfile = {
  thresholds: AthleteThresholds;
  /** Athlete's usual pool length — Garmin needs one to render a swim workout. */
  defaultPoolLengthM: number | null;
};

const PUSH_PROFILE_THRESHOLD_FIELDS = [
  'runThresholdPaceSecPerKm',
  'swimCssSecPer100m',
  'ftpW',
  'lthr',
  'maxHr',
] as const;

function mapPushProfileThresholds(
  profile: {
    runThresholdPaceSecPerKm: number | null;
    swimCssSecPer100m: number | null;
    ftpW: number | null;
    lthr: number | null;
    maxHr: number | null;
  } | null,
): AthleteThresholds {
  const thresholds = {} as AthleteThresholds;
  for (const field of PUSH_PROFILE_THRESHOLD_FIELDS) {
    thresholds[field] = profile?.[field] ?? null;
  }
  return thresholds;
}

/** One read for everything the payload needs from the athlete profile. */
export async function loadPushProfile(athleteId: string): Promise<PushProfile> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: {
      runThresholdPaceSecPerKm: true,
      swimCssSecPer100m: true,
      ftpW: true,
      lthr: true,
      maxHr: true,
      defaultPoolLengthM: true,
    },
  });

  return {
    thresholds: mapPushProfileThresholds(profile),
    defaultPoolLengthM: profile?.defaultPoolLengthM ?? null,
  };
}

/**
 * Push a planned endurance session to Garmin Connect, scheduled on the session
 * date by default. Targets are resolved here against the athlete's current
 * thresholds, and those thresholds are stored with the receipt so a later
 * threshold change can be surfaced as "already sent, now out of date".
 */
async function loadEndurancePlannedSession(athleteId: string, plannedSessionId: string) {
  const session = await prisma.plannedSession.findFirst({
    where: { id: plannedSessionId, athleteId },
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      description: true,
      durationMin: true,
      intensity: true,
      endurancePrescription: true,
      garminWorkoutId: true,
      garminWorkoutScheduledDate: true,
      garminWorkoutPushedAt: true,
    },
  });

  if (!session) {
    throw new Error('Séance planifiée introuvable');
  }

  const sport = enduranceSportFromActivityType(session.type);
  if (!sport) {
    throw new Error('Seules les séances course, vélo et natation peuvent être envoyées ainsi');
  }

  return { session, sport };
}

async function persistEnduranceWorkoutReceipt(input: {
  sessionId: string;
  created: Awaited<ReturnType<typeof createAndScheduleWorkout>>;
  thresholds: AthleteThresholds;
}): Promise<void> {
  if ((input.created.workoutId === undefined || input.created.workoutId === null)) {
    return;
  }
  await prisma.plannedSession.update({
    where: { id: input.sessionId },
    data: {
      garminWorkoutId: String(input.created.workoutId),
      garminWorkoutScheduledDate: input.created.scheduledDate,
      garminWorkoutPushedAt: new Date(input.created.pushedAt),
      garminWorkoutThresholds: input.thresholds as unknown as Prisma.InputJsonValue,
    },
  });
}

function buildPushEnduranceWorkoutResult(input: {
  created: Awaited<ReturnType<typeof createAndScheduleWorkout>>;
  workoutName: string;
  sport: EnduranceSport;
  built: ReturnType<typeof buildEnduranceWorkoutPayload>;
  warnings: string[];
  derived: ReturnType<typeof effectiveEndurancePrescription>['derived'];
}): PushEnduranceWorkoutResult {
  return {
    workoutId: input.created.workoutId,
    workoutName: input.workoutName,
    sport: input.sport,
    stepCount: input.built.stepCount,
    mapped: input.built.mapped,
    warnings: [...new Set([...input.warnings, ...input.built.warnings])],
    derived: input.derived,
    scheduledDate: input.created.scheduledDate,
    alreadyPushed: false,
    calendarActive: (input.created.scheduledDate !== undefined && input.created.scheduledDate !== null),
    workoutExists: (input.created.workoutId !== undefined && input.created.workoutId !== null),
    pushedAt: input.created.pushedAt,
  };
}

async function prepareEnduranceWorkoutPush(
  athleteId: string,
  options: {
    plannedSessionId: string;
    force?: boolean;
  },
) {
  const { session, sport } = await loadEndurancePlannedSession(athleteId, options.plannedSessionId);

  if (!options.force) {
    await assertNotAlreadyPushed(athleteId, session);
  }

  const { thresholds, defaultPoolLengthM } = await loadPushProfile(athleteId);
  const prescriptionBundle = effectiveEndurancePrescription({
    sport,
    durationMin: session.durationMin,
    intensity: session.intensity,
    stored: session.endurancePrescription,
    thresholds,
    defaultPoolLengthM,
  });

  const workoutName =
    session.title?.trim() || `SHARPIT ${SPORT_LABEL_FR[sport]} ${shortDayFromDate(session.date)}`;

  const built = buildEnduranceWorkoutPayload({
    workoutName,
    description: session.description?.trim() || 'Envoyé depuis SHARPIT (séance planifiée)',
    prescription: prescriptionBundle.prescription,
    thresholds,
  });

  if (built.stepCount === 0) {
    throw new Error('Aucune étape à envoyer');
  }

  return { session, sport, thresholds, prescriptionBundle, workoutName, built };
}

export async function pushEnduranceWorkoutFromPlannedSession(
  athleteId: string,
  options: {
    plannedSessionId: string;
    scheduleDate?: string | null;
    schedule?: boolean;
    /** Replace previous Garmin workout if already pushed. */
    force?: boolean;
  },
): Promise<PushEnduranceWorkoutResult> {
  const { session, sport, thresholds, prescriptionBundle, workoutName, built } =
    await prepareEnduranceWorkoutPush(athleteId, options);

  const created = await createAndScheduleWorkout(athleteId, {
    payload: built.payload,
    schedule: options.schedule,
    scheduleDate: options.scheduleDate ?? dayKeyFromDate(session.date),
    replaceWorkoutId: options.force ? session.garminWorkoutId : null,
  });

  await persistEnduranceWorkoutReceipt({ sessionId: session.id, created, thresholds });

  return buildPushEnduranceWorkoutResult({
    created,
    workoutName,
    sport,
    built,
    warnings: prescriptionBundle.warnings,
    derived: prescriptionBundle.derived,
  });
}
