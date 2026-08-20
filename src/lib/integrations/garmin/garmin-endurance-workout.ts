import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
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

const PROFILE_ID = 'default';

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

/** One read for everything the payload needs from the athlete profile. */
export async function loadPushProfile(): Promise<PushProfile> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: PROFILE_ID },
    select: {
      runThresholdPaceSecPerKm: true,
      ftpW: true,
      lthr: true,
      maxHr: true,
      defaultPoolLengthM: true,
    },
  });

  return {
    thresholds: {
      runThresholdPaceSecPerKm: profile?.runThresholdPaceSecPerKm ?? null,
      ftpW: profile?.ftpW ?? null,
      lthr: profile?.lthr ?? null,
      maxHr: profile?.maxHr ?? null,
    },
    defaultPoolLengthM: profile?.defaultPoolLengthM ?? null,
  };
}

/**
 * Push a planned endurance session to Garmin Connect, scheduled on the session
 * date by default. Targets are resolved here against the athlete's current
 * thresholds, and those thresholds are stored with the receipt so a later
 * threshold change can be surfaced as "already sent, now out of date".
 */
export async function pushEnduranceWorkoutFromPlannedSession(options: {
  plannedSessionId: string;
  scheduleDate?: string | null;
  schedule?: boolean;
  /** Replace previous Garmin workout if already pushed. */
  force?: boolean;
}): Promise<PushEnduranceWorkoutResult> {
  const session = await prisma.plannedSession.findUnique({
    where: { id: options.plannedSessionId },
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

  if (!session) throw new Error('Séance planifiée introuvable');

  const sport = enduranceSportFromActivityType(session.type);
  if (!sport) {
    throw new Error('Seules les séances course, vélo et natation peuvent être envoyées ainsi');
  }

  if (!options.force) await assertNotAlreadyPushed(session);

  const { thresholds, defaultPoolLengthM } = await loadPushProfile();
  const { prescription, derived, warnings } = effectiveEndurancePrescription({
    sport,
    durationMin: session.durationMin,
    intensity: session.intensity,
    stored: session.endurancePrescription,
    thresholds,
    defaultPoolLengthM,
  });

  const workoutName =
    session.title?.trim() || `SHARPIT ${SPORT_LABEL_FR[sport]} ${format(session.date, 'dd/MM')}`;

  const built = buildEnduranceWorkoutPayload({
    workoutName,
    description: session.description?.trim() || 'Envoyé depuis SHARPIT (séance planifiée)',
    prescription,
    thresholds,
  });

  if (built.stepCount === 0) throw new Error('Aucune étape à envoyer');

  const created = await createAndScheduleWorkout({
    payload: built.payload,
    schedule: options.schedule,
    scheduleDate: options.scheduleDate ?? format(session.date, 'yyyy-MM-dd'),
    replaceWorkoutId: options.force ? session.garminWorkoutId : null,
  });

  if (created.workoutId != null) {
    await prisma.plannedSession.update({
      where: { id: session.id },
      data: {
        garminWorkoutId: String(created.workoutId),
        garminWorkoutScheduledDate: created.scheduledDate,
        garminWorkoutPushedAt: new Date(created.pushedAt),
        garminWorkoutThresholds: thresholds as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return {
    workoutId: created.workoutId,
    workoutName,
    sport,
    stepCount: built.stepCount,
    mapped: built.mapped,
    warnings: [...new Set([...warnings, ...built.warnings])],
    derived,
    scheduledDate: created.scheduledDate,
    alreadyPushed: false,
    calendarActive: created.scheduledDate != null,
    workoutExists: created.workoutId != null,
    pushedAt: created.pushedAt,
  };
}
