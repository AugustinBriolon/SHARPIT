import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import { isCoachConfigured } from '@/lib/ai';
import { analyzePlannedSession } from '@/lib/coach/plan/coach-analysis';
import { linkPlannedSessionActivity, setPlannedSessionAnalysis } from '@/lib/queries';
import { prisma } from '@/lib/prisma';

/**
 * Auto-link only on the same calendar day.
 * Adjacent-day matching created false "planned" realizations for spontaneous sessions.
 */
export function scorePlannedActivityMatch(
  session: { date: Date; durationMin: number | null },
  activity: { date: Date; duration: number | null },
): number {
  const dayDiff = Math.abs(
    differenceInCalendarDays(startOfDay(session.date), startOfDay(activity.date)),
  );
  if (dayDiff !== 0) return 0;

  let score = 100;
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
): Promise<{ sessionId: string } | null> {
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
      date: { gte: day, lt: addDays(day, 1) },
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

  return { sessionId: best.s.id };
}

/**
 * Lie automatiquement les activités nouvelles aux séances planifiées du même jour.
 * Compliance LLM analysis is separate ({@link analyzeLinkedPlannedSessions}) so
 * sync / open-path can await only the cheap DB match.
 */
export async function autoLinkActivities(
  activityIds: string[],
): Promise<{ linked: number; sessionIds: string[] }> {
  const reserved = new Set<string>();
  const sessionIds: string[] = [];

  for (const activityId of activityIds) {
    const result = await autoLinkOneActivity(activityId, reserved);
    if (!result) continue;
    sessionIds.push(result.sessionId);
  }

  return { linked: sessionIds.length, sessionIds };
}

/** Post-link compliance analysis — run off the HTTP critical path. */
export async function analyzeLinkedPlannedSessions(sessionIds: string[]): Promise<number> {
  if (!isCoachConfigured() || sessionIds.length === 0) return 0;

  let analyzed = 0;
  for (const sessionId of sessionIds) {
    try {
      const analysis = await analyzePlannedSession(sessionId);
      if (analysis) {
        await setPlannedSessionAnalysis(sessionId, analysis);
        analyzed += 1;
      }
    } catch (error) {
      console.error('[session-linking] analyze', sessionId, error);
    }
  }
  return analyzed;
}
