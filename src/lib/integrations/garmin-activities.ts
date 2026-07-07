import type { GarminConnect } from '@flow-js/garmin-connect';
import type { IActivity } from '@flow-js/garmin-connect/dist/garmin/types/activity';
import { ActivityType, Prisma } from '@prisma/client';
import { garminFeelLabel, garminRpeToScale } from '@/lib/integrations/garmin-feel';
import { mergedSource } from '@/lib/activity-dedup';

type GCClient = InstanceType<typeof GarminConnect>;

export interface GarminActivityEvaluation {
  rpe: number | null;
  feeling: string | null;
  notes: string | null;
}

interface GarminActivityDetail {
  summaryDTO?: {
    directWorkoutRpe?: number | null;
    directWorkoutFeel?: number | null;
  };
  description?: string | null;
}

/** Une série de muscu agrégée, prête pour le modèle StrengthSet. */
export interface ParsedStrengthSet {
  exercise: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSec: number | null;
  order: number;
}

interface GarminExerciseEntry {
  category?: string | null;
  name?: string | null;
}

interface GarminExerciseSet {
  exercises?: GarminExerciseEntry[];
  duration?: number | null; // secondes
  repetitionCount?: number | null;
  weight?: number | null; // grammes
  setType?: string | null; // ACTIVE | REST
}

interface GarminExerciseSetsResponse {
  exerciseSets?: GarminExerciseSet[];
}

/** "GOBLET_SQUAT" → "Goblet Squat" */
function humanizeExercise(raw: string): string {
  return raw
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function exerciseLabel(set: GarminExerciseSet): string {
  const ex = set.exercises?.[0];
  const key = ex?.name ?? ex?.category;
  return key ? humanizeExercise(key) : 'Exercice';
}

/**
 * Agrège les séries Garmin (une ligne par série + lignes REST) en groupes
 * d'exercices : exercice, nombre de séries, reps moyennes, poids max, repos moyen.
 */
export function parseGarminExerciseSets(body: GarminExerciseSetsResponse): ParsedStrengthSet[] {
  const sets = body.exerciseSets ?? [];
  const groups: ParsedStrengthSet[] = [];

  let currentLabel: string | null = null;
  let reps: number[] = [];
  let weights: number[] = [];
  let rests: number[] = [];
  let order = 0;

  const flush = () => {
    if (currentLabel == null || reps.length === 0) return;
    const avgReps = Math.round(reps.reduce((s, v) => s + v, 0) / reps.length);
    const maxWeight = weights.length ? Math.max(...weights) : 0;
    const avgRest = rests.length
      ? Math.round(rests.reduce((s, v) => s + v, 0) / rests.length)
      : null;
    groups.push({
      exercise: currentLabel,
      sets: reps.length,
      reps: avgReps,
      weightKg: maxWeight > 0 ? Math.round((maxWeight / 1000) * 10) / 10 : null,
      restSec: avgRest,
      order: order++,
    });
  };

  for (const set of sets) {
    const type = (set.setType ?? '').toUpperCase();

    if (type === 'REST') {
      if (set.duration != null && set.duration > 0) rests.push(set.duration);
      continue;
    }

    // Série active (ou type inconnu avec des reps) : on l'attribue à un groupe.
    const label = exerciseLabel(set);
    const repCount = set.repetitionCount ?? 0;
    if (repCount <= 0) continue;

    if (label !== currentLabel) {
      flush();
      currentLabel = label;
      reps = [];
      weights = [];
      rests = [];
    }

    reps.push(repCount);
    if (set.weight != null && set.weight > 0) weights.push(set.weight);
  }

  flush();
  return groups;
}

/** Récupère et agrège les séries de muscu d'une activité Garmin. */
export async function fetchGarminExerciseSets(
  client: GCClient,
  activityId: number,
): Promise<ParsedStrengthSet[]> {
  try {
    const raw = (await client.get(
      `https://connectapi.garmin.com/activity-service/activity/${activityId}/exerciseSets`,
    )) as GarminExerciseSetsResponse;
    return parseGarminExerciseSets(raw);
  } catch {
    return [];
  }
}

/**
 * Durée de séance selon le type.
 * Muscu : temps TOTAL (repos entre séries inclus) → elapsed/duration en priorité.
 * Autres : temps en mouvement (movingDuration) en priorité.
 */
export function garminSessionDurationSec(activity: IActivity, type: ActivityType): number | null {
  if (type === ActivityType.STRENGTH) {
    return garminDurationSec(activity.elapsedDuration, activity.duration, activity.movingDuration);
  }
  return garminDurationSec(activity.movingDuration, activity.duration, activity.elapsedDuration);
}

/** Durée Garmin : secondes ou millisecondes selon le champ / endpoint. */
export function garminDurationSec(...values: Array<number | null | undefined>): number | null {
  for (const v of values) {
    if (v == null || !Number.isFinite(v) || v <= 0) continue;
    const sec = v > 1_000_000 ? Math.round(v / 1000) : Math.round(v);
    if (sec > 0) return sec;
  }
  return null;
}

export function mapGarminType(typeKey: string): ActivityType | null {
  const k = typeKey.toLowerCase();

  if (
    k === 'triathlon' ||
    k === 'duathlon' ||
    k === 'multisport' ||
    k === 'multi_sport' ||
    k.includes('triathlon') ||
    k.includes('duathlon') ||
    k.includes('multisport') ||
    k.includes('multi_sport')
  ) {
    return ActivityType.TRIATHLON;
  }

  if (
    k.includes('run') ||
    k === 'trail_running' ||
    k === 'treadmill_running' ||
    k === 'street_running' ||
    k === 'track_running' ||
    k === 'virtual_run'
  ) {
    return ActivityType.RUN;
  }

  if (
    k.includes('cycl') ||
    k.includes('bike') ||
    k.includes('ride') ||
    k === 'cycling' ||
    k === 'virtual_ride' ||
    k === 'indoor_cycling' ||
    k === 'mountain_biking' ||
    k === 'gravel_cycling'
  ) {
    return ActivityType.BIKE;
  }

  if (k.includes('swim') || k === 'lap_swimming' || k === 'open_water_swimming') {
    return ActivityType.SWIM;
  }

  if (
    k.includes('strength') ||
    k.includes('hiit') ||
    k.includes('cardio') ||
    k.includes('fitness') ||
    k === 'indoor_cardio' ||
    k === 'yoga' ||
    k === 'pilates'
  ) {
    return ActivityType.STRENGTH;
  }

  return ActivityType.OTHER;
}

export async function fetchGarminActivityEvaluation(
  client: GCClient,
  activityId: number,
): Promise<GarminActivityEvaluation> {
  try {
    const raw = (await client.get(
      `https://connectapi.garmin.com/activity-service/activity/${activityId}`,
    )) as GarminActivityDetail;

    const dto = raw.summaryDTO;
    const rpe = garminRpeToScale(dto?.directWorkoutRpe);
    const feeling = garminFeelLabel(dto?.directWorkoutFeel);
    const notes =
      typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : null;

    return { rpe, feeling, notes };
  } catch {
    return { rpe: null, feeling: null, notes: null };
  }
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
}

export function buildGarminActivityData(
  activity: IActivity,
  evaluation: GarminActivityEvaluation,
  type: ActivityType,
  strengthSets: ParsedStrengthSet[] = [],
): Prisma.ActivityCreateInput {
  const duration = garminSessionDurationSec(activity, type);

  const paceSecPerKm =
    activity.averageSpeed && activity.averageSpeed > 0 ? 1000 / activity.averageSpeed : null;

  const load =
    num(activity.trainingStressScore as number) ?? num(activity.activityTrainingLoad as number);

  const base: Prisma.ActivityCreateInput = {
    type,
    date: new Date(activity.startTimeLocal),
    title: activity.activityName || null,
    duration,
    load,
    rpe: evaluation.rpe,
    feeling: evaluation.feeling,
    notes: evaluation.notes,
    source: 'garmin',
    garminId: String(activity.activityId),
  };

  switch (type) {
    case ActivityType.RUN:
      base.runMetrics = {
        create: {
          distanceM: activity.distance > 0 ? activity.distance : null,
          elevationM: activity.elevationGain > 0 ? activity.elevationGain : null,
          paceSecPerKm,
          avgHr: activity.averageHR ? Math.round(activity.averageHR) : null,
          avgPower: num(activity.avgPower as number),
          cadence: activity.averageRunningCadenceInStepsPerMinute
            ? Math.round(activity.averageRunningCadenceInStepsPerMinute)
            : null,
        },
      };
      break;
    case ActivityType.BIKE:
      base.bikeMetrics = {
        create: {
          normalizedPower: num(activity.normPower as number),
          avgPower: num(activity.avgPower as number),
          avgCadence: num(activity.averageBikingCadenceInRevPerMinute as number)
            ? Math.round(num(activity.averageBikingCadenceInRevPerMinute as number)!)
            : null,
          elevationM: activity.elevationGain > 0 ? activity.elevationGain : null,
          calories: activity.calories > 0 ? Math.round(activity.calories) : null,
          tss: load,
        },
      };
      break;
    case ActivityType.SWIM:
      base.swimMetrics = {
        create: {
          distanceM: activity.distance > 0 ? activity.distance : null,
          avgPaceSecPer100m:
            activity.averageSpeed && activity.averageSpeed > 0 ? 100 / activity.averageSpeed : null,
        },
      };
      break;
    case ActivityType.STRENGTH:
      if (strengthSets.length > 0) {
        base.strengthSets = {
          create: strengthSets.map((s) => ({
            exercise: s.exercise,
            sets: s.sets,
            reps: s.reps,
            weightKg: s.weightKg,
            restSec: s.restSec,
            order: s.order,
          })),
        };
      }
      break;
    case ActivityType.TRIATHLON:
    case ActivityType.OTHER:
      break;
  }

  return base;
}

/** Enrichit une activité existante (souvent importée Strava) avec les données Garmin. */
export function garminEnrichmentUpdate(
  activity: IActivity,
  evaluation: GarminActivityEvaluation,
  type: ActivityType,
  existingStravaId: string | null,
): Prisma.ActivityUpdateInput {
  const duration = garminSessionDurationSec(activity, type);

  const load =
    num(activity.trainingStressScore as number) ?? num(activity.activityTrainingLoad as number);

  const data: Prisma.ActivityUpdateInput = {
    garminId: String(activity.activityId),
    source: mergedSource(true, Boolean(existingStravaId)),
    title: activity.activityName || undefined,
    duration: duration ?? undefined,
    load: load ?? undefined,
    rpe: evaluation.rpe ?? undefined,
    feeling: evaluation.feeling ?? undefined,
    notes: evaluation.notes ?? undefined,
  };

  const paceSecPerKm =
    activity.averageSpeed && activity.averageSpeed > 0 ? 1000 / activity.averageSpeed : null;

  if (type === ActivityType.RUN) {
    data.runMetrics = {
      upsert: {
        create: {
          distanceM: activity.distance > 0 ? activity.distance : null,
          elevationM: activity.elevationGain > 0 ? activity.elevationGain : null,
          paceSecPerKm,
          avgHr: activity.averageHR ? Math.round(activity.averageHR) : null,
        },
        update: {
          avgHr: activity.averageHR ? Math.round(activity.averageHR) : undefined,
        },
      },
    };
  }

  if (type === ActivityType.BIKE) {
    data.bikeMetrics = {
      upsert: {
        create: {
          avgPower: num(activity.avgPower as number),
          normalizedPower: num(activity.normPower as number),
          elevationM: activity.elevationGain > 0 ? activity.elevationGain : null,
          tss: load,
        },
        update: {
          tss: load ?? undefined,
        },
      },
    };
  }

  if (type === ActivityType.TRIATHLON || type === ActivityType.OTHER) {
    return data;
  }

  return data;
}
