import { ActivityType, Prisma } from '@prisma/client';
import { format } from 'date-fns';
import {
  buildEnduranceWorkoutPayload,
  type EnduranceWorkoutMappedStep,
} from '@/lib/integrations/garmin-endurance-workout-payload';
import {
  assertNotAlreadyPushed,
  createAndScheduleWorkout,
} from '@/lib/integrations/garmin-workout-push';
import {
  enduranceSportFromActivityType,
  parseEndurancePrescription,
  singleStepPrescription,
  type EndurancePrescription,
  type EnduranceSport,
} from '@/lib/planned-session/endurance-prescription';
import {
  defaultHrTargetForIntensity,
  defaultTargetForIntensity,
  type AthleteThresholds,
} from '@/lib/planned-session/endurance-targets';
import { prisma } from '@/lib/prisma';

const PROFILE_ID = 'default';
const DEFAULT_SESSION_MIN = 45;

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

export async function loadAthleteThresholds(): Promise<AthleteThresholds> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: PROFILE_ID },
    select: { runThresholdPaceSecPerKm: true, ftpW: true, lthr: true, maxHr: true },
  });

  return {
    runThresholdPaceSecPerKm: profile?.runThresholdPaceSecPerKm ?? null,
    ftpW: profile?.ftpW ?? null,
    lthr: profile?.lthr ?? null,
    maxHr: profile?.maxHr ?? null,
  };
}

/**
 * Pick the target for a session with no structured prescription: pace when a
 * threshold pace is known, heart rate otherwise, nothing when neither exists.
 */
function fallbackTarget(
  sport: EnduranceSport,
  intensity: Parameters<typeof defaultTargetForIntensity>[1],
  thresholds: AthleteThresholds,
) {
  const paceDefault = defaultTargetForIntensity(sport, intensity);
  if (paceDefault.target.metric === 'pace' && thresholds.runThresholdPaceSecPerKm != null) {
    return paceDefault;
  }
  if (thresholds.lthr != null || thresholds.maxHr != null) {
    return { target: defaultHrTargetForIntensity(intensity), warnings: paceDefault.warnings };
  }
  return paceDefault;
}

type SessionRow = {
  type: ActivityType;
  durationMin: number | null;
  intensity: Parameters<typeof defaultTargetForIntensity>[1];
  endurancePrescription: Prisma.JsonValue;
};

function resolvePrescription(
  session: SessionRow,
  sport: EnduranceSport,
  thresholds: AthleteThresholds,
): { prescription: EndurancePrescription; derived: boolean; warnings: string[] } {
  const stored = parseEndurancePrescription(session.endurancePrescription);
  if (stored) return { prescription: stored, derived: false, warnings: [] };

  const { target, warnings } = fallbackTarget(sport, session.intensity, thresholds);
  return {
    prescription: singleStepPrescription({
      sport,
      durationMin: session.durationMin ?? DEFAULT_SESSION_MIN,
      target,
    }),
    derived: true,
    warnings,
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

  const thresholds = await loadAthleteThresholds();
  const { prescription, derived, warnings } = resolvePrescription(session, sport, thresholds);

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
