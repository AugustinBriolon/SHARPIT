import { addDays, differenceInCalendarDays, startOfDay, subDays } from 'date-fns';
import { isCoachConfigured } from '@/lib/ai';
import { analyzePlannedSession } from '@/lib/coach/coach-analysis';
import { linkPlannedSessionActivity, setPlannedSessionAnalysis } from '@/lib/queries';
import { prisma } from '@/lib/prisma';

export function scorePlannedActivityMatch(
  session: { date: Date; durationMin: number | null },
  activity: { date: Date; duration: number | null },
): number {
  const dayDiff = Math.abs(
    differenceInCalendarDays(startOfDay(session.date), startOfDay(activity.date)),
  );
  if (dayDiff > 1) return 0;

  let score = 100 - dayDiff * 45;
  if (session.durationMin != null && activity.duration != null && activity.duration > 0) {
    const plannedSec = session.durationMin * 60;
    const ratio =
      Math.abs(plannedSec - activity.duration) / Math.max(plannedSec, activity.duration);
    if (ratio <= 0.15) score += 25;
    else if (ratio <= 0.3) score += 10;
  }
  return score;
}

async function autoLinkOneActivity(
  activityId: string,
  reservedSessionIds: Set<string>,
): Promise<{ sessionId: string; analyzed: boolean } | null> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true, type: true, date: true, duration: true },
  });
  if (!activity) return null;

  const alreadyLinked = await prisma.plannedSession.findFirst({
    where: { activityId: activity.id },
    select: { id: true },
  });
  if (alreadyLinked) return null;

  const day = startOfDay(activity.date);
  const candidates = await prisma.plannedSession.findMany({
    where: {
      activityId: null,
      type: activity.type,
      date: { gte: subDays(day, 1), lte: addDays(day, 1) },
      ...(reservedSessionIds.size > 0 ? { id: { notIn: [...reservedSessionIds] } } : {}),
    },
    select: { id: true, date: true, durationMin: true },
  });

  const ranked = candidates
    .map((s) => ({ s, score: scorePlannedActivityMatch(s, activity) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const [best] = ranked;

  if (!best) return null;

  await linkPlannedSessionActivity(best.s.id, activity.id);
  reservedSessionIds.add(best.s.id);

  let analyzed = false;
  if (isCoachConfigured()) {
    try {
      const analysis = await analyzePlannedSession(best.s.id);
      if (analysis) {
        await setPlannedSessionAnalysis(best.s.id, analysis);
        analyzed = true;
      }
    } catch (error) {
      console.error('[session-linking] analyze', error);
    }
  }

  return { sessionId: best.s.id, analyzed };
}

/** Lie automatiquement les activités nouvelles aux séances planifiées compatibles. */
export async function autoLinkActivities(
  activityIds: string[],
): Promise<{ linked: number; analyzed: number }> {
  const reserved = new Set<string>();
  let linked = 0;
  let analyzed = 0;

  for (const activityId of activityIds) {
    const result = await autoLinkOneActivity(activityId, reserved);
    if (!result) continue;
    linked += 1;
    if (result.analyzed) analyzed += 1;
  }

  return { linked, analyzed };
}
