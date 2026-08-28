import {
  ActivityType,
  BodyCompositionSource,
  BodySide,
  ConditionScope,
  ConditionStatus,
  ConditionType,
  GoalHorizon,
  GoalKind,
  GoalPriority,
  SessionIntensity,
  TrainingCapacityLevel,
  type PrismaClient,
} from '@prisma/client';
import { ensureDemoSessionLinkStory } from '@/lib/demo/demo-session-link-seed';
import { finalizeDemoSeed, purgeDemoDerivedState } from '@/lib/demo/finalize-demo-seed';
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
    if (baseWatts !== null) {
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

/** Macro grams for a 7-day nutrition window — all days populated for a credible demo. */
const NUTRITION_WINDOW = [
  { calories: 2720, protein: 168, carbohydrates: 305, fat: 86 },
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

function demoMealsForDay(index: number) {
  const variants = [
    {
      breakfast: { name: 'Petit-déjeuner', calories: 620, protein: 32, carbs: 78, fat: 20 },
      lunch: { name: 'Déjeuner', calories: 880, protein: 52, carbs: 95, fat: 28 },
      dinner: { name: 'Dîner', calories: 920, protein: 58, carbs: 88, fat: 32 },
      snack: { name: 'Collation', calories: 300, protein: 23, carbs: 44, fat: 10 },
    },
    {
      breakfast: { name: 'Petit-déjeuner', calories: 580, protein: 28, carbs: 72, fat: 18 },
      lunch: { name: 'Déjeuner', calories: 910, protein: 55, carbs: 102, fat: 26 },
      dinner: { name: 'Dîner', calories: 840, protein: 50, carbs: 82, fat: 30 },
      snack: { name: 'Collation', calories: 320, protein: 32, carbs: 54, fat: 14 },
    },
  ];
  const v = variants[index % variants.length]!;
  return Object.values(v).map((meal) => ({
    ...meal,
    label: meal.name,
    entries: [
      {
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
      },
    ],
  }));
}

/** Seven weigh-ins aligned with the demo's rolling week (J-6 … J0). */
const BODY_COMPOSITION_TREND = [
  { daysAgo: 6, weightKg: 80.2, bodyFatPct: 16.7, musclePct: 43.0, bmi: 25.3 },
  { daysAgo: 5, weightKg: 80.0, bodyFatPct: 16.6, musclePct: 43.1, bmi: 25.2 },
  { daysAgo: 4, weightKg: 79.9, bodyFatPct: 16.5, musclePct: 43.2, bmi: 25.2 },
  { daysAgo: 3, weightKg: 79.8, bodyFatPct: 16.4, musclePct: 43.3, bmi: 25.2 },
  { daysAgo: 2, weightKg: 79.7, bodyFatPct: 16.2, musclePct: 43.5, bmi: 25.1 },
  { daysAgo: 1, weightKg: 79.6, bodyFatPct: 16.0, musclePct: 43.6, bmi: 25.1 },
  { daysAgo: 0, weightKg: 79.6, bodyFatPct: 15.9, musclePct: 43.7, bmi: 25.1 },
];

const RECOVERY_SCORES = [82, 78, 85, 90, 74, 88, 92, 80, 86, 87];

function demoReadinessLevel(recoveryScore: number): 'HIGH' | 'MODERATE' | 'LOW' {
  if (recoveryScore >= 85) {
    return 'HIGH';
  }
  if (recoveryScore >= 70) {
    return 'MODERATE';
  }
  return 'LOW';
}

function sleepFieldsForDemo(daysAgo: number, recoveryScore: number) {
  const sleepMinutes = 420 + (daysAgo % 3) * 20;
  const deepMin = 88 + (daysAgo % 4) * 4;
  const remMin = 82 + (daysAgo % 3) * 5;
  const lightMin = Math.max(180, sleepMinutes - deepMin - remMin - 22);
  return {
    sleepMinutes,
    sleepScore: Math.min(95, 78 + (daysAgo % 5) * 3),
    sleepDeepMin: deepMin,
    sleepLightMin: lightMin,
    sleepRemMin: remMin,
    sleepAwakeMin: 18 + (daysAgo % 3) * 2,
    sleepBedtimeMin: 23 * 60 + 15,
    sleepWakeMin: 6 * 60 + 30,
    sleepRespiration: 14.2,
    sleepAvgStress: 18 + (daysAgo % 4) * 3,
    sleepScoreFeedback: recoveryScore >= 85 ? 'RESTFUL' : 'FAIR',
    readinessLevel: demoReadinessLevel(recoveryScore),
    readinessFeedback: recoveryScore >= 85 ? 'READY' : 'RECOVERING',
    hrvStatus: 'BALANCED',
    hrvBaselineLow: 68,
    hrvBaselineHigh: 92,
    bodyBattery: 68 + (daysAgo % 6) * 4,
    totalSteps: 8200 + (daysAgo % 5) * 450,
  };
}

async function seedDemoIntegrationStubs(prisma: PrismaClient, athleteId: string): Promise<void> {
  // Row presence drives source-prefs legacy defaults (Garmin health + Renpho body).
  // Tokens are placeholders — cron sync no-ops on auth failure, reads still work.
  await prisma.garminAccount.upsert({
    where: { athleteId },
    create: {
      athleteId,
      oauth1TokenEnc: 'demo',
      oauth2TokenEnc: 'demo',
      displayName: 'Athlète Démo',
    },
    update: { displayName: 'Athlète Démo' },
  });
  await prisma.renphoAccount.upsert({
    where: { athleteId },
    create: {
      athleteId,
      email: 'demo@sharpit.app',
      passwordEnc: 'demo',
      displayName: 'Athlète Démo',
    },
    update: { displayName: 'Athlète Démo' },
  });
  await prisma.myFitnessPalAccount.upsert({
    where: { athleteId },
    create: { athleteId, sessionTokenEnc: '', displayName: 'Athlète Démo' },
    update: { displayName: 'Athlète Démo' },
  });
}

async function purgeDemoAthleteRecords(prisma: PrismaClient, athleteId: string): Promise<void> {
  await prisma.activity.deleteMany({ where: { athleteId } });
  await prisma.dailyHealth.deleteMany({ where: { athleteId } });
  await prisma.dailyNutrition.deleteMany({ where: { athleteId } });
  await prisma.plannedSession.deleteMany({ where: { athleteId } });
  await prisma.goal.deleteMany({ where: { athleteId } });
  await prisma.bodyCompositionMeasurement.deleteMany({ where: { athleteId } });
  await prisma.condition.deleteMany({ where: { athleteId } });
  await purgeDemoDerivedState(prisma, athleteId);
}

async function seedDemoPrimaryGoal(prisma: PrismaClient, athleteId: string, today: Date) {
  await prisma.goal.create({
    data: {
      athleteId,
      title: 'Ironman Nice',
      kind: GoalKind.RACE,
      horizon: GoalHorizon.LONG_TERM,
      priority: GoalPriority.A,
      raceFormat: 'Ironman',
      targetPerformance: 'Sub 10h',
      lowerIsBetter: true,
      targetDate: addDays(today, 94),
      location: 'Nice, France',
      notes:
        'Objectif principal de la saison — viser une exécution maîtrisée sur les trois disciplines.',
    },
  });
}

async function seedDemoPastActivities(prisma: PrismaClient, athleteId: string, today: Date) {
  for (let weekIndex = 2; weekIndex >= 0; weekIndex--) {
    for (let dayInWeek = 0; dayInWeek < 7; dayInWeek++) {
      const session = WEEK_PATTERN[dayInWeek];
      if (!session) {
        continue;
      }
      const daysAgo = weekIndex * 7 + (6 - dayInWeek);
      if (daysAgo === 0) {
        continue;
      }
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
}

async function seedDemoRecoveryTrend(prisma: PrismaClient, athleteId: string, today: Date) {
  for (let daysAgo = 9; daysAgo >= 0; daysAgo--) {
    const recoveryScore = RECOVERY_SCORES[9 - daysAgo]!;
    await prisma.dailyHealth.create({
      data: {
        athleteId,
        date: subDays(today, daysAgo),
        hrv: 75 + (daysAgo % 4) * 4,
        restingHr: 44 - (daysAgo % 3),
        weightKg: 79.6,
        calories: 3200 + (daysAgo % 5) * 100,
        recoveryScore,
        stress: 2 + (daysAgo % 3),
        mood: 'Bien',
        ...sleepFieldsForDemo(daysAgo, recoveryScore),
      },
    });
  }
}

async function seedDemoNutritionWindow(prisma: PrismaClient, athleteId: string, today: Date) {
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const macros = NUTRITION_WINDOW[6 - daysAgo]!;
    await prisma.dailyNutrition.create({
      data: {
        athleteId,
        date: subDays(today, daysAgo),
        provider: 'myfitnesspal',
        complete: true,
        meals: demoMealsForDay(6 - daysAgo),
        ...macros,
        ...NUTRITION_GOALS,
      },
    });
  }
}

const UPCOMING_PLANNED_PATTERN: Array<{
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

async function seedDemoUpcomingPlanned(prisma: PrismaClient, athleteId: string, today: Date) {
  for (let dayInWeek = 0; dayInWeek < 7; dayInWeek++) {
    const planned = UPCOMING_PLANNED_PATTERN[dayInWeek];
    if (!planned) {
      continue;
    }
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
}

async function seedDemoBodyComposition(prisma: PrismaClient, athleteId: string, today: Date) {
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
        bmi: point.bmi,
        waterPct: 58.5 - index * 0.1,
        visceralFat: 6.2 - index * 0.05,
      },
    });
  }
}

async function seedDemoCondition(prisma: PrismaClient, athleteId: string, today: Date) {
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

  await purgeDemoAthleteRecords(prisma, athleteId);

  const today = startOfDay(new Date());

  await seedDemoIntegrationStubs(prisma, athleteId);
  await seedDemoPrimaryGoal(prisma, athleteId, today);
  await seedDemoPastActivities(prisma, athleteId, today);
  await seedDemoRecoveryTrend(prisma, athleteId, today);
  await seedDemoNutritionWindow(prisma, athleteId, today);
  await seedDemoUpcomingPlanned(prisma, athleteId, today);
  await seedDemoBodyComposition(prisma, athleteId, today);
  await seedDemoCondition(prisma, athleteId, today);

  await ensureDemoSessionLinkStory(prisma, athleteId);
  await finalizeDemoSeed(prisma, athleteId);
}

/** Reseed when the demo tenant is missing, stale, or polluted (e.g. onboarding test goals). */
export async function ensureDemoSeedFresh(prisma: PrismaClient): Promise<boolean> {
  const athlete = await prisma.athleteProfile.findUnique({
    where: { clerkUserId: DEMO_CLERK_USER_ID },
    select: { id: true },
  });
  if (!athlete) {
    await seedDemoAthlete(prisma);
    return true;
  }

  const today = startOfDay(new Date());
  const [garmin, renpho, latestHealth, goalCount] = await Promise.all([
    prisma.garminAccount.findUnique({
      where: { athleteId: athlete.id },
      select: { athleteId: true },
    }),
    prisma.renphoAccount.findUnique({
      where: { athleteId: athlete.id },
      select: { athleteId: true },
    }),
    prisma.dailyHealth.findFirst({
      where: { athleteId: athlete.id },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
    prisma.goal.count({ where: { athleteId: athlete.id } }),
  ]);

  const healthStale =
    latestHealth === null || startOfDay(latestHealth.date).getTime() !== today.getTime();
  const needsReseed = !garmin || !renpho || healthStale || goalCount !== 1;

  if (needsReseed) {
    await seedDemoAthlete(prisma);
    return true;
  }

  await ensureDemoSessionLinkStory(prisma, athlete.id);
  return false;
}
