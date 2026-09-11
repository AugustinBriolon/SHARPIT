import { ActivityType, Prisma, SessionIntensity, type PrismaClient } from '@prisma/client';
import { addDays, addHours } from 'date-fns';
import { demoAnchorTrainingDayId, demoDateFromTrainingDayId } from '@/lib/demo/demo-calendar';
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
  await prisma.plannedSession.deleteMany({
    where: { athleteId, title: DEMO_SESSION_LINK_PLANNED_TITLE, date: day },
  });
  await prisma.activity.deleteMany({
    where: {
      athleteId,
      title: DEMO_LINK_ACTIVITY_TITLE,
      date: { gte: day, lt: addDays(day, 1) },
    },
  });

  await prisma.plannedSession.create({
    data: {
      athleteId,
      type: ActivityType.RUN,
      date: day,
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
      date: addHours(day, 18),
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
  await prisma.plannedSession.deleteMany({
    where: {
      athleteId,
      title: DEMO_SESSION_LINK_PLANNED_TITLE,
      date: { lt: today },
    },
  });
  await prisma.activity.deleteMany({
    where: {
      athleteId,
      title: DEMO_LINK_ACTIVITY_TITLE,
      date: { lt: today },
    },
  });
}

/**
 * One orphan pair for today only — powers the session-link suggestion chip.
 * Idempotent: never delete/recreate an existing pair (that rotated activity ids
 * and 404'd open detail pages on every demo land).
 */
export async function ensureDemoSessionLinkStory(
  prisma: PrismaClient,
  athleteId: string,
): Promise<void> {
  const today = demoDateFromTrainingDayId(demoAnchorTrainingDayId());
  await purgeStaleDemoSessionLinkPairs(prisma, athleteId, today);
  await resetDemoSessionLinkStory(prisma, athleteId);

  // Other RUN planned / realized on the anchor day steal link matching or
  // duplicate the session-link story in Today.
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
  await prisma.activity.deleteMany({
    where: {
      athleteId,
      date: { gte: today, lt: addDays(today, 1) },
      type: ActivityType.RUN,
      title: { not: DEMO_LINK_ACTIVITY_TITLE },
    },
  });

  const [existingPlanned, existingActivity] = await Promise.all([
    prisma.plannedSession.findFirst({
      where: { athleteId, title: DEMO_SESSION_LINK_PLANNED_TITLE, date: today },
      select: { id: true },
    }),
    prisma.activity.findFirst({
      where: {
        athleteId,
        title: DEMO_LINK_ACTIVITY_TITLE,
        date: { gte: today, lt: addDays(today, 1) },
      },
      select: { id: true },
    }),
  ]);

  if (existingPlanned && existingActivity) {
    return;
  }

  await seedDemoSessionLinkPair(prisma, athleteId, today);
}
