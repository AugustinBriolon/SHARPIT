import type { GarminConnect } from '@flow-js/garmin-connect';
import type { IActivity } from '@flow-js/garmin-connect/dist/garmin/types/activity';
import { ActivityType, Prisma } from '@prisma/client';
import { garminFeelLabel, garminRpeToScale } from '@/lib/integrations/garmin-feel';
import { mergedSource } from '@/lib/activity-dedup';
import { resolveGarminExerciseLabel } from '@/lib/integrations/garmin-exercise-labels';

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
  durationSec: number | null;
  weightKg: number | null;
  restSec: number | null;
  order: number;
}

interface GarminExerciseEntry {
  category?: string | null;
  name?: string | null;
  probability?: number | null;
}

interface GarminExerciseSet {
  exercises?: GarminExerciseEntry[];
  duration?: number | null; // secondes
  repetitionCount?: number | null;
  weight?: number | null;
  setType?: string | null; // ACTIVE | REST | WARMUP | ...
  wktStepIndex?: number | null;
}

interface GarminExerciseSetsResponse {
  exerciseSets?: GarminExerciseSet[];
}

interface GarminSummarizedExerciseSet {
  category?: string | null;
  subCategory?: string | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  maxWeight?: number | null;
}

/** Garmin envoie le poids en grammes (gros nombres) ou parfois déjà en kg. */
function garminWeightToKg(weight: number | null | undefined): number | null {
  if (weight == null || weight <= 0) return null;
  if (weight >= 100) return Math.round((weight / 1000) * 10) / 10;
  return Math.round(weight * 10) / 10;
}

function bestExerciseEntry(set: GarminExerciseSet): GarminExerciseEntry | null {
  const exercises = set.exercises ?? [];
  if (exercises.length === 0) return null;
  return exercises.reduce((best, entry) =>
    (entry.probability ?? 0) >= (best.probability ?? 0) ? entry : best,
  );
}

function exerciseKeyFromEntry(entry: GarminExerciseEntry): string {
  const category = entry.category ?? '';
  const name = entry.name ?? '';
  return `${category}::${name || category}`;
}

function labelFromExerciseKey(key: string, labels: Map<string, string>): string {
  const [category, name] = key.split('::');
  if (key.startsWith('step::')) return 'Inconnu';
  return resolveGarminExerciseLabel(category, name, labels);
}

function pushStrengthGroup(
  groups: ParsedStrengthSet[],
  label: string,
  reps: number[],
  durations: number[],
  weights: number[],
  rests: number[],
  order: number,
): number {
  if (reps.length === 0) return order;
  const avgReps = Math.round(reps.reduce((s, v) => s + v, 0) / reps.length);
  const maxWeight = weights.length ? Math.max(...weights) : 0;
  const avgRest = rests.length ? Math.round(rests.reduce((s, v) => s + v, 0) / rests.length) : null;
  const avgDuration = durations.length
    ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
    : null;
  groups.push({
    exercise: label,
    sets: reps.length,
    reps: avgReps,
    durationSec: avgDuration,
    weightKg: garminWeightToKg(maxWeight),
    restSec: avgRest,
    order,
  });
  return order + 1;
}

/**
 * Agrège les exercices résumés fournis dans la liste d'activités Garmin
 * (source fiable pour le décompte par exercice).
 */
export function parseGarminSummarizedExerciseSets(
  activity: IActivity,
  labels: Map<string, string>,
): ParsedStrengthSet[] {
  const raw = activity.summarizedExerciseSets;
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw
    .map((entry, index) => {
      const item = entry as GarminSummarizedExerciseSet;
      const category = item.category?.trim();
      const subCategory = item.subCategory?.trim();
      if (!category && !subCategory) return null;

      const setCount = item.sets ?? 0;
      const totalReps = item.reps ?? 0;
      const totalDurationMs = item.duration ?? 0;
      let repsPerSet = 1;
      if (setCount > 0 && totalReps > 0) {
        repsPerSet = Math.max(1, Math.round(totalReps / setCount));
      } else if (totalReps > 0) {
        repsPerSet = totalReps;
      }

      const durationSecPerSet =
        setCount > 0 && totalDurationMs > 0 ? Math.round(totalDurationMs / setCount / 1000) : null;

      return {
        exercise: resolveGarminExerciseLabel(category, subCategory, labels),
        sets: setCount > 0 ? setCount : 1,
        reps: repsPerSet,
        durationSec: durationSecPerSet,
        weightKg: garminWeightToKg(item.maxWeight),
        restSec: null,
        order: index,
      } satisfies ParsedStrengthSet;
    })
    .filter((item): item is ParsedStrengthSet => item != null);
}

/**
 * Préfère le détail chronologique par série ; le résumé Garmin sert de secours.
 */
export function resolveGarminStrengthSets(
  activity: IActivity,
  detailedSets: ParsedStrengthSet[],
  labels: Map<string, string>,
): ParsedStrengthSet[] {
  const summarizedSets = parseGarminSummarizedExerciseSets(activity, labels);
  if (detailedSets.length === 0) return summarizedSets;
  if (summarizedSets.length === 0) return detailedSets;

  const detailedLooksBroken =
    detailedSets.length < summarizedSets.length &&
    detailedSets.every(
      (set) =>
        set.exercise === 'Exercice' || set.exercise === 'Unknown' || set.exercise === 'Inconnu',
    );

  return detailedLooksBroken ? summarizedSets : detailedSets;
}

/**
 * Agrège les séries Garmin (une ligne par série + lignes REST) en groupes
 * d'exercices : exercice, nombre de séries, reps moyennes, poids max, repos moyen.
 */
export function parseGarminExerciseSets(
  body: GarminExerciseSetsResponse,
  labels: Map<string, string>,
): ParsedStrengthSet[] {
  const sets = body.exerciseSets ?? [];
  const groups: ParsedStrengthSet[] = [];

  let currentKey: string | null = null;
  let currentLabel: string | null = null;
  let reps: number[] = [];
  let durations: number[] = [];
  let weights: number[] = [];
  let rests: number[] = [];
  let order = 0;
  let lastActiveWktStep: number | null = null;

  const flush = () => {
    if (currentKey == null || currentLabel == null || reps.length === 0) return;
    order = pushStrengthGroup(groups, currentLabel, reps, durations, weights, rests, order);
    currentKey = null;
    currentLabel = null;
    reps = [];
    durations = [];
    weights = [];
    rests = [];
  };

  for (const set of sets) {
    const type = (set.setType ?? '').toUpperCase();

    if (type === 'REST') {
      if (set.duration != null && set.duration > 0) rests.push(set.duration);
      continue;
    }

    const entry = bestExerciseEntry(set);
    let key: string | null = entry ? exerciseKeyFromEntry(entry) : null;

    if (!key && set.wktStepIndex != null && lastActiveWktStep != null) {
      if (set.wktStepIndex !== lastActiveWktStep) {
        key = `step::${set.wktStepIndex}`;
      }
    }

    if (!key) key = currentKey;
    if (!key) continue;

    const label = entry
      ? labelFromExerciseKey(key, labels)
      : (currentLabel ?? labelFromExerciseKey(key, labels));
    const repCount = set.repetitionCount ?? 0;
    const durationSec = set.duration != null && set.duration > 0 ? Math.round(set.duration) : 0;
    let effectiveReps = 0;
    if (repCount > 0) effectiveReps = repCount;
    else if (durationSec > 0) effectiveReps = 1;
    if (effectiveReps <= 0) continue;

    if (key !== currentKey) {
      flush();
      currentKey = key;
      currentLabel = label;
      reps = [];
      durations = [];
      weights = [];
      rests = [];
    }

    reps.push(effectiveReps);
    if (durationSec > 0 && repCount <= 0) durations.push(durationSec);
    if (set.weight != null && set.weight > 0) weights.push(set.weight);
    if (set.wktStepIndex != null) lastActiveWktStep = set.wktStepIndex;
  }

  flush();
  return groups;
}

/** Récupère et agrège les séries de muscu d'une activité Garmin. */
export async function fetchGarminExerciseSets(
  client: GCClient,
  activityId: number,
  labels: Map<string, string>,
): Promise<ParsedStrengthSet[]> {
  try {
    const raw = (await client.get(
      `https://connectapi.garmin.com/activity-service/activity/${activityId}/exerciseSets`,
    )) as GarminExerciseSetsResponse;
    return parseGarminExerciseSets(raw, labels);
  } catch (error) {
    console.warn(`[Garmin] exerciseSets fetch failed for activity ${activityId}:`, error);
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
            durationSec: s.durationSec,
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
