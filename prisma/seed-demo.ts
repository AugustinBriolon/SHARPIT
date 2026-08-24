import { ActivityType, GoalHorizon, PrismaClient, SessionIntensity } from '@prisma/client';
import { addDays, startOfDay, subDays } from 'date-fns';

const prisma = new PrismaClient();

const DEMO_CLERK_USER_ID = 'demo';

/** One realistic training week, oldest first. `null` = rest day. */
const WEEK_PATTERN: Array<{
  type: ActivityType;
  title: string;
  duration: number;
  rpe: number;
  load: number;
  feeling: string;
} | null> = [
  null,
  {
    type: ActivityType.RUN,
    title: 'Endurance fondamentale',
    duration: 50 * 60,
    rpe: 5,
    load: 52,
    feeling: 'Fluide',
  },
  {
    type: ActivityType.BIKE,
    title: 'Bike Z2',
    duration: 90 * 60,
    rpe: 5,
    load: 68,
    feeling: 'Solide',
  },
  {
    type: ActivityType.SWIM,
    title: 'CSS intervals',
    duration: 45 * 60,
    rpe: 7,
    load: 45,
    feeling: 'Technique',
  },
  {
    type: ActivityType.STRENGTH,
    title: 'Force bas du corps',
    duration: 50 * 60,
    rpe: 7,
    load: 35,
    feeling: 'Lourd',
  },
  {
    type: ActivityType.BIKE,
    title: 'Sortie longue',
    duration: 150 * 60,
    rpe: 6,
    load: 110,
    feeling: 'Fluide',
  },
  {
    type: ActivityType.RUN,
    title: 'Sortie longue',
    duration: 80 * 60,
    rpe: 6,
    load: 78,
    feeling: 'Solide',
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

/** Macro grams for a 7-day nutrition window — one day left empty on purpose to
 * exercise the "no data" state in the macro breakdown card. */
const NUTRITION_WINDOW = [
  null,
  { calories: 2650, protein: 165, carbohydrates: 310, fat: 88 },
  { calories: 2480, protein: 172, carbohydrates: 260, fat: 82 },
  { calories: 2790, protein: 158, carbohydrates: 340, fat: 90 },
  { calories: 2510, protein: 180, carbohydrates: 250, fat: 78 },
  { calories: 2620, protein: 168, carbohydrates: 290, fat: 95 },
  { calories: 2380, protein: 150, carbohydrates: 245, fat: 74 },
];

async function main() {
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
  await prisma.activity.deleteMany({ where: { athleteId } });
  await prisma.dailyHealth.deleteMany({ where: { athleteId } });
  await prisma.dailyNutrition.deleteMany({ where: { athleteId } });
  await prisma.plannedSession.deleteMany({ where: { athleteId } });
  await prisma.goal.deleteMany({ where: { athleteId } });

  const today = startOfDay(new Date());

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
      await prisma.activity.create({
        data: {
          athleteId,
          type: session.type,
          date: subDays(today, daysAgo),
          title: session.title,
          duration: session.duration,
          rpe: session.rpe,
          feeling: session.feeling,
          load: session.load,
          ...metricsFor(session.type),
        },
      });
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
      title: 'Endurance fondamentale',
      durationMin: 50,
      intensity: SessionIntensity.ENDURANCE,
    },
    {
      type: ActivityType.BIKE,
      title: 'Bike Z2',
      durationMin: 90,
      intensity: SessionIntensity.ENDURANCE,
    },
    {
      type: ActivityType.SWIM,
      title: 'CSS intervals',
      durationMin: 45,
      intensity: SessionIntensity.THRESHOLD,
    },
    {
      type: ActivityType.STRENGTH,
      title: 'Force bas du corps',
      durationMin: 50,
      intensity: SessionIntensity.TEMPO,
    },
    {
      type: ActivityType.BIKE,
      title: 'Sortie longue',
      durationMin: 150,
      intensity: SessionIntensity.ENDURANCE,
    },
    {
      type: ActivityType.RUN,
      title: 'Sortie longue',
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
