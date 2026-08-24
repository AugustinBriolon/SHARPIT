import {
  ActivityType,
  BodyCompositionSource,
  BodySide,
  ConditionScope,
  ConditionStatus,
  ConditionType,
  GoalHorizon,
  SessionIntensity,
  TrainingCapacityLevel,
  type PrismaClient,
} from '@prisma/client';
import { addDays, startOfDay, subDays } from 'date-fns';

export const DEMO_CLERK_USER_ID = 'demo';

// ---------------------------------------------------------------------------
// GPS routes — real Paris waypoints, interpolated into a smooth point series.
// Coordinates stored as [lat, lng], matching this repo's ActivityStream
// convention (src/lib/streams/streams.ts).
// ---------------------------------------------------------------------------

type LatLng = [number, number];

/** Lac Inférieur loop, Bois de Boulogne. */
const CLUB_RUN_WAYPOINTS: LatLng[] = [
  [48.8721, 2.2653],
  [48.8695, 2.262],
  [48.8657, 2.254],
  [48.8637, 2.2515],
  [48.8615, 2.254],
  [48.862, 2.258],
  [48.865, 2.26],
  [48.869, 2.2635],
];

/** Hippodrome de Longchamp loop, Bois de Boulogne. */
const LONGCHAMP_BIKE_WAYPOINTS: LatLng[] = [
  [48.858, 2.24],
  [48.862, 2.235],
  [48.867, 2.238],
  [48.869, 2.245],
  [48.865, 2.25],
  [48.86, 2.248],
  [48.857, 2.243],
];

function interpolateLoop(waypoints: LatLng[], pointCount: number): LatLng[] {
  const segments = waypoints.length;
  const perSegment = Math.max(2, Math.round(pointCount / segments));
  const points: LatLng[] = [];
  for (let s = 0; s < segments; s++) {
    const [lat1, lng1] = waypoints[s]!;
    const [lat2, lng2] = waypoints[(s + 1) % segments]!;
    for (let i = 0; i < perSegment; i++) {
      const t = i / perSegment;
      points.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]);
    }
  }
  return points;
}

type GpsStreamData = {
  time: number[];
  distance: number[];
  altitude: number[];
  heartrate: number[];
  cadence: number[];
  velocity: number[];
  watts: number[];
  latlng: LatLng[];
};

function buildGpsStream({
  waypoints,
  pointCount,
  durationSec,
  distanceM,
  baseHr,
  baseCadence,
  baseWatts,
}: {
  waypoints: LatLng[];
  pointCount: number;
  durationSec: number;
  distanceM: number;
  baseHr: number;
  baseCadence: number;
  baseWatts?: number;
}): GpsStreamData {
  const latlng = interpolateLoop(waypoints, pointCount);
  const n = latlng.length;
  const data: GpsStreamData = {
    time: [],
    distance: [],
    altitude: [],
    heartrate: [],
    cadence: [],
    velocity: [],
    watts: [],
    latlng,
  };
  for (let i = 0; i < n; i++) {
    const progress = i / (n - 1);
    data.time.push(Math.round(progress * durationSec));
    data.distance.push(Math.round(progress * distanceM));
    data.altitude.push(Math.round(35 + 8 * Math.sin(progress * Math.PI * 4)));
    data.heartrate.push(Math.round(baseHr + 8 * Math.sin(progress * Math.PI * 6)));
    data.cadence.push(Math.round(baseCadence + 3 * Math.sin(progress * Math.PI * 5)));
    data.velocity.push(Math.round((distanceM / durationSec) * 10) / 10);
    if (baseWatts != null) {
      data.watts.push(Math.round(baseWatts + 15 * Math.sin(progress * Math.PI * 7)));
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Narrative — hand-written per session-type template, stored directly on
// Activity.narrativeAnalysis (no AI call needed, see activity-narrative.ts).
// ---------------------------------------------------------------------------

const NARRATIVES = {
  clubRun: {
    headline: 'Rythme régulier, forme sous contrôle',
    narrative:
      "Sortie avec le club au Bois de Boulogne, autour du lac inférieur. Allure stable sur l'ensemble du parcours, fréquence cardiaque bien contenue malgré le groupe qui a poussé le rythme sur les deux derniers kilomètres. Bonne sensation générale, aucune gêne à signaler.",
  },
  longRun: {
    headline: 'Sortie longue bien négociée',
    narrative:
      "Sortie longue en solo dans le Bois de Boulogne. Allure conversationnelle sur les trois premiers quarts, léger relâchement sur la fin — cohérent avec la charge accumulée cette semaine. Bon signal d'endurance de fond.",
  },
  longchampBike: {
    headline: 'Sortie longue maîtrisée autour de Longchamp',
    narrative:
      "Boucle habituelle autour de l'hippodrome de Longchamp et du Bois de Boulogne. Puissance normalisée cohérente avec le plan de la semaine, cadence stable. Quelques relances en fin de parcours pour travailler le seuil, bien encaissées.",
  },
  homeTrainer: {
    headline: 'Séance courte et intense sur home trainer',
    narrative:
      "Séance Zwift sur home trainer — pas de tracé GPS, une session indoor n'en génère pas. Travail structuré en intervalles, bonne tenue de la puissance cible sur chaque bloc.",
  },
  cssSwim: {
    headline: 'Intervalles CSS bien tenus',
    narrative:
      "Séance de vitesse critique à la piscine Molitor. Allure homogène sur l'ensemble des répétitions, SWOLF stable — bon signe de relâchement technique malgré la fatigue accumulée en fin de séance.",
  },
  strength: {
    headline: 'Séance de force en extérieur',
    narrative:
      "Circuit de renforcement au parc Monceau, poids du corps et charges légères. Bonne exécution sur l'ensemble des mouvements, RPE cohérent avec l'intention de la séance.",
  },
} as const;

type NarrativeKey = keyof typeof NARRATIVES;
type GpsKey = 'clubRun' | 'longRun' | 'longchampBike' | null;

/** One realistic training week, oldest first. `null` = rest day. */
const WEEK_PATTERN: Array<{
  type: ActivityType;
  title: string;
  duration: number;
  rpe: number;
  load: number;
  feeling: string;
  narrative: NarrativeKey;
  gps: GpsKey;
} | null> = [
  null,
  {
    type: ActivityType.RUN,
    title: 'Sortie course — club',
    duration: 50 * 60,
    rpe: 5,
    load: 52,
    feeling: 'Fluide',
    narrative: 'clubRun',
    gps: 'clubRun',
  },
  {
    type: ActivityType.BIKE,
    title: 'Home trainer — Zwift',
    duration: 60 * 60,
    rpe: 6,
    load: 58,
    feeling: 'Intense',
    narrative: 'homeTrainer',
    gps: null,
  },
  {
    type: ActivityType.SWIM,
    title: 'CSS — Piscine Molitor',
    duration: 45 * 60,
    rpe: 7,
    load: 45,
    feeling: 'Technique',
    narrative: 'cssSwim',
    gps: null,
  },
  {
    type: ActivityType.STRENGTH,
    title: 'Muscu en extérieur — Parc Monceau',
    duration: 50 * 60,
    rpe: 7,
    load: 35,
    feeling: 'Lourd',
    narrative: 'strength',
    gps: null,
  },
  {
    type: ActivityType.BIKE,
    title: 'Sortie vélo — Longchamp',
    duration: 150 * 60,
    rpe: 6,
    load: 110,
    feeling: 'Fluide',
    narrative: 'longchampBike',
    gps: 'longchampBike',
  },
  {
    type: ActivityType.RUN,
    title: 'Sortie longue — Bois de Boulogne',
    duration: 80 * 60,
    rpe: 6,
    load: 78,
    feeling: 'Solide',
    narrative: 'longRun',
    gps: 'longRun',
  },
];

function metricsFor(type: ActivityType) {
  switch (type) {
    case ActivityType.RUN:
      return {
        runMetrics: {
          create: {
            distanceM: 10500,
            elevationM: 85,
            paceSecPerKm: 314,
            avgHr: 142,
            cadence: 176,
            shoes: 'Nike Vaporfly',
          },
        },
      };
    case ActivityType.BIKE:
      return {
        bikeMetrics: {
          create: {
            ftpPercent: 65,
            normalizedPower: 198,
            intensityFactor: 0.65,
            tss: 72,
            avgCadence: 88,
            avgPower: 185,
            elevationM: 320,
            calories: 980,
            bikeName: 'Canyon',
          },
        },
      };
    case ActivityType.SWIM:
      return {
        swimMetrics: {
          create: {
            distanceM: 2200,
            sets: 12,
            cssSecPer100m: 98,
            avgPaceSecPer100m: 102,
            swolf: 42,
            drills: 'Catch-up, sculling',
          },
        },
      };
    case ActivityType.STRENGTH:
      return {
        strengthSets: {
          create: [
            { exercise: 'Squat', sets: 4, reps: 6, weightKg: 120, rpe: 8, restSec: 180, order: 0 },
            {
              exercise: 'Romanian Deadlift',
              sets: 3,
              reps: 8,
              weightKg: 100,
              rpe: 7,
              restSec: 120,
              order: 1,
            },
            {
              exercise: 'Bulgarian Split Squat',
              sets: 3,
              reps: 10,
              weightKg: 24,
              rpe: 7,
              restSec: 90,
              order: 2,
            },
          ],
        },
      };
    default:
      return {};
  }
}

function gpsStreamFor(gps: GpsKey, durationSec: number) {
  if (gps === 'clubRun') {
    return buildGpsStream({
      waypoints: CLUB_RUN_WAYPOINTS,
      pointCount: 150,
      durationSec,
      distanceM: 10500,
      baseHr: 142,
      baseCadence: 176,
    });
  }
  if (gps === 'longRun') {
    return buildGpsStream({
      waypoints: CLUB_RUN_WAYPOINTS,
      pointCount: 200,
      durationSec,
      distanceM: 16000,
      baseHr: 138,
      baseCadence: 172,
    });
  }
  if (gps === 'longchampBike') {
    return buildGpsStream({
      waypoints: LONGCHAMP_BIKE_WAYPOINTS,
      pointCount: 220,
      durationSec,
      distanceM: 45000,
      baseHr: 148,
      baseCadence: 88,
      baseWatts: 185,
    });
  }
  return null;
}

/** Macro grams for a 7-day nutrition window — one day left empty on purpose to
 * exercise the "no data" state in the macro breakdown card. Goals attached so
 * the goal-relative breakdown bars have something to fill against. */
const NUTRITION_WINDOW = [
  null,
  { calories: 2650, protein: 165, carbohydrates: 310, fat: 88 },
  { calories: 2480, protein: 172, carbohydrates: 260, fat: 82 },
  { calories: 2790, protein: 158, carbohydrates: 340, fat: 90 },
  { calories: 2510, protein: 180, carbohydrates: 250, fat: 78 },
  { calories: 2620, protein: 168, carbohydrates: 290, fat: 95 },
  { calories: 2380, protein: 150, carbohydrates: 245, fat: 74 },
];
const NUTRITION_GOALS = {
  goalCalories: 2900,
  goalProtein: 180,
  goalCarbohydrates: 320,
  goalFat: 90,
};

/** Slow, believable trend over the last month — RENPHO-style scale sync. */
const BODY_COMPOSITION_TREND = [
  { daysAgo: 28, weightKg: 80.4, bodyFatPct: 16.8, musclePct: 43.1 },
  { daysAgo: 24, weightKg: 80.1, bodyFatPct: 16.6, musclePct: 43.2 },
  { daysAgo: 20, weightKg: 80.0, bodyFatPct: 16.5, musclePct: 43.3 },
  { daysAgo: 16, weightKg: 79.8, bodyFatPct: 16.3, musclePct: 43.4 },
  { daysAgo: 12, weightKg: 79.7, bodyFatPct: 16.1, musclePct: 43.5 },
  { daysAgo: 8, weightKg: 79.7, bodyFatPct: 16.0, musclePct: 43.6 },
  { daysAgo: 4, weightKg: 79.6, bodyFatPct: 15.9, musclePct: 43.7 },
  { daysAgo: 1, weightKg: 79.6, bodyFatPct: 15.9, musclePct: 43.7 },
];

export async function seedDemoAthlete(prisma: PrismaClient): Promise<void> {
  const athlete = await prisma.athleteProfile.upsert({
    where: { clerkUserId: DEMO_CLERK_USER_ID },
    create: {
      clerkUserId: DEMO_CLERK_USER_ID,
      heightCm: 178,
      birthDate: new Date('1992-04-12'),
      ftpW: 285,
      maxHr: 188,
      lthr: 168,
      runThresholdPaceSecPerKm: 258,
      swimCssSecPer100m: 96,
      displayMode: 'essential',
    },
    update: {},
  });
  const athleteId = athlete.id;

  // Cascade-scoped to this one athlete — never touches any other tenant.
  // Condition delete cascades its FunctionalCapacity/ConditionKnowledge rows.
  await prisma.activity.deleteMany({ where: { athleteId } });
  await prisma.dailyHealth.deleteMany({ where: { athleteId } });
  await prisma.dailyNutrition.deleteMany({ where: { athleteId } });
  await prisma.plannedSession.deleteMany({ where: { athleteId } });
  await prisma.goal.deleteMany({ where: { athleteId } });
  await prisma.bodyCompositionMeasurement.deleteMany({ where: { athleteId } });
  await prisma.condition.deleteMany({ where: { athleteId } });

  const today = startOfDay(new Date());

  // Nutrition's `connected` gate (src/lib/presentation/nutrition.ts) just checks
  // this row exists — an empty token is the same "disconnected" shape already
  // established for wiped credentials elsewhere, and syncMfpNutrition() checks
  // isMfpAccountConnected() before ever making a network call, so cron/sync's
  // daily pass over every athlete no-ops cleanly on this one, same as any
  // athlete's already-expired provider session.
  await prisma.myFitnessPalAccount.upsert({
    where: { athleteId },
    create: { athleteId, sessionTokenEnc: '', displayName: 'Athlète Démo' },
    update: {},
  });

  await prisma.goal.create({
    data: {
      athleteId,
      title: 'Ironman < 10h',
      horizon: GoalHorizon.LONG_TERM,
      metricKey: 'ironman_time',
      currentValue: null,
      targetValue: 36000,
      unit: 'seconds',
      targetDate: addDays(today, 94),
    },
  });

  // 3 past weeks of completed activities, oldest first.
  for (let weekIndex = 2; weekIndex >= 0; weekIndex--) {
    for (let dayInWeek = 0; dayInWeek < 7; dayInWeek++) {
      const session = WEEK_PATTERN[dayInWeek];
      if (!session) continue;
      const daysAgo = weekIndex * 7 + (6 - dayInWeek);
      const narrative = NARRATIVES[session.narrative];
      const activity = await prisma.activity.create({
        data: {
          athleteId,
          type: session.type,
          date: subDays(today, daysAgo),
          title: session.title,
          duration: session.duration,
          rpe: session.rpe,
          feeling: session.feeling,
          load: session.load,
          narrativeAnalysis: narrative,
          narrativeAnalyzedAt: new Date(),
          ...metricsFor(session.type),
        },
      });

      const stream = gpsStreamFor(session.gps, session.duration);
      if (stream) {
        await prisma.activityStream.create({
          data: { activityId: activity.id, available: true, data: stream },
        });
      }
    }
  }

  // Recovery trend — last 10 days.
  const recoveryScores = [82, 78, 85, 90, 74, 88, 92, 80, 86, 87];
  for (let daysAgo = 9; daysAgo >= 0; daysAgo--) {
    await prisma.dailyHealth.create({
      data: {
        athleteId,
        date: subDays(today, daysAgo),
        sleepMinutes: 420 + (daysAgo % 3) * 20,
        hrv: 75 + (daysAgo % 4) * 4,
        restingHr: 44 - (daysAgo % 3),
        weightKg: 79.6,
        calories: 3200 + (daysAgo % 5) * 100,
        recoveryScore: recoveryScores[9 - daysAgo],
        stress: 2 + (daysAgo % 3),
        mood: 'Bien',
      },
    });
  }

  // Nutrition — last 7 days, one day intentionally empty.
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const macros = NUTRITION_WINDOW[6 - daysAgo];
    if (!macros) continue;
    await prisma.dailyNutrition.create({
      data: {
        athleteId,
        date: subDays(today, daysAgo),
        provider: 'myfitnesspal',
        complete: true,
        ...macros,
        ...NUTRITION_GOALS,
      },
    });
  }

  // Upcoming week — planned, not yet completed.
  const plannedPattern: Array<{
    type: ActivityType;
    title: string;
    durationMin: number;
    intensity: SessionIntensity;
  } | null> = [
    null,
    {
      type: ActivityType.RUN,
      title: 'Sortie course — club',
      durationMin: 50,
      intensity: SessionIntensity.ENDURANCE,
    },
    {
      type: ActivityType.BIKE,
      title: 'Home trainer — Zwift',
      durationMin: 60,
      intensity: SessionIntensity.THRESHOLD,
    },
    {
      type: ActivityType.SWIM,
      title: 'CSS — Piscine Molitor',
      durationMin: 45,
      intensity: SessionIntensity.THRESHOLD,
    },
    {
      type: ActivityType.STRENGTH,
      title: 'Muscu en extérieur — Parc Monceau',
      durationMin: 50,
      intensity: SessionIntensity.TEMPO,
    },
    {
      type: ActivityType.BIKE,
      title: 'Sortie vélo — Longchamp',
      durationMin: 150,
      intensity: SessionIntensity.ENDURANCE,
    },
    {
      type: ActivityType.RUN,
      title: 'Sortie longue — Bois de Boulogne',
      durationMin: 80,
      intensity: SessionIntensity.ENDURANCE,
    },
  ];
  for (let dayInWeek = 0; dayInWeek < 7; dayInWeek++) {
    const planned = plannedPattern[dayInWeek];
    if (!planned) continue;
    await prisma.plannedSession.create({
      data: {
        athleteId,
        type: planned.type,
        date: addDays(today, dayInWeek),
        title: planned.title,
        durationMin: planned.durationMin,
        intensity: planned.intensity,
      },
    });
  }

  // Body composition — RENPHO-style slow trend over the last month.
  for (const [index, point] of BODY_COMPOSITION_TREND.entries()) {
    await prisma.bodyCompositionMeasurement.create({
      data: {
        athleteId,
        source: BodyCompositionSource.RENPHO,
        externalId: `demo-body-${index}`,
        measuredAt: subDays(today, point.daysAgo),
        weightKg: point.weightKg,
        bodyFatPct: point.bodyFatPct,
        musclePct: point.musclePct,
      },
    });
  }

  // One plausible, non-alarming focus area — Corps & Santé shouldn't be empty.
  const condition = await prisma.condition.create({
    data: {
      athleteId,
      scope: ConditionScope.LOCALIZED,
      type: ConditionType.PAIN,
      bodyRegion: 'Genou',
      side: BodySide.RIGHT,
      label: 'Douleur légère au genou droit',
      status: ConditionStatus.ACTIVE,
      severity: 0.3,
      confidence: 0.6,
      affectsTraining: true,
      startedAt: subDays(today, 14),
    },
  });
  await prisma.functionalCapacity.create({
    data: {
      conditionId: condition.id,
      trainingCapacity: TrainingCapacityLevel.REDUCED,
      painSeverity: 2,
      comment:
        "Légère gêne à la flexion complète, sans impact sur l'allure — course maintenue à charge modérée.",
    },
  });
}
