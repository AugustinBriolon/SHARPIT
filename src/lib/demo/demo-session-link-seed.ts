import { ActivityType, Prisma, SessionIntensity, type PrismaClient } from '@prisma/client';
import { addDays, addHours, startOfDay } from 'date-fns';
import {
  DEMO_LINK_ACTIVITY_TITLE,
  DEMO_SESSION_LINK_PLANNED_TITLE,
} from '@/lib/demo/demo-session-link-markers';

function metricsForRun() {
  return {
    runMetrics: {
      create: {
        distanceM: 8200,
        elevationM: 45,
        paceSecPerKm: 330,
        avgHr: 138,
        cadence: 172,
      },
    },
  };
}

/** Orphan planned + realized pair for the Today link suggestion chip. */
export async function seedDemoSessionLinkPair(
  prisma: PrismaClient,
  athleteId: string,
  day: Date,
): Promise<void> {
  const dayStart = startOfDay(day);

  await prisma.plannedSession.deleteMany({
    where: { athleteId, title: DEMO_SESSION_LINK_PLANNED_TITLE, date: dayStart },
  });
  await prisma.activity.deleteMany({
    where: {
      athleteId,
      title: DEMO_LINK_ACTIVITY_TITLE,
      date: { gte: dayStart, lt: addDays(dayStart, 1) },
    },
  });

  await prisma.plannedSession.create({
    data: {
      athleteId,
      type: ActivityType.RUN,
      date: dayStart,
      title: DEMO_SESSION_LINK_PLANNED_TITLE,
      durationMin: 40,
      intensity: SessionIntensity.ENDURANCE,
      completed: false,
    },
  });

  await prisma.activity.create({
    data: {
      athleteId,
      type: ActivityType.RUN,
      date: addHours(dayStart, 18),
      title: DEMO_LINK_ACTIVITY_TITLE,
      duration: 40 * 60,
      rpe: 4,
      load: 38,
      feeling: 'Facile',
      ...metricsForRun(),
    },
  });
}

/** Unlink demo story pairs polluted by real API writes from older demo builds. */
export async function resetDemoSessionLinkStory(
  prisma: PrismaClient,
  athleteId: string,
): Promise<void> {
  await prisma.plannedSession.updateMany({
    where: {
      athleteId,
      title: DEMO_SESSION_LINK_PLANNED_TITLE,
      activityId: { not: null },
    },
    data: {
      activityId: null,
      completed: false,
      analysis: Prisma.JsonNull,
      analyzedAt: null,
    },
  });
}

/** Remove stale demo link rows from prior days — they otherwise show as "Manquée". */
export async function purgeStaleDemoSessionLinkPairs(
  prisma: PrismaClient,
  athleteId: string,
  today: Date,
): Promise<void> {
  const todayStart = startOfDay(today);

  await prisma.plannedSession.deleteMany({
    where: {
      athleteId,
      title: DEMO_SESSION_LINK_PLANNED_TITLE,
      date: { lt: todayStart },
    },
  });
  await prisma.activity.deleteMany({
    where: {
      athleteId,
      title: DEMO_LINK_ACTIVITY_TITLE,
      date: { lt: todayStart },
    },
  });
}

/** One orphan pair for today only — powers the session-link suggestion chip. */
export async function ensureDemoSessionLinkStory(
  prisma: PrismaClient,
  athleteId: string,
): Promise<void> {
  const today = startOfDay(new Date());
  await purgeStaleDemoSessionLinkPairs(prisma, athleteId, today);
  await resetDemoSessionLinkStory(prisma, athleteId);
  // Stale orphan RUN planned rows on the same day steal greedy link matching.
  await prisma.plannedSession.deleteMany({
    where: {
      athleteId,
      date: today,
      completed: false,
      activityId: null,
      type: ActivityType.RUN,
      title: { not: DEMO_SESSION_LINK_PLANNED_TITLE },
    },
  });
  // Past-week seed can land "Sortie longue" on today — it steals post-session loop focus.
  await prisma.activity.deleteMany({
    where: {
      athleteId,
      date: { gte: today, lt: addDays(today, 1) },
      type: ActivityType.RUN,
      title: { not: DEMO_LINK_ACTIVITY_TITLE },
    },
  });
  await seedDemoSessionLinkPair(prisma, athleteId, today);
}
