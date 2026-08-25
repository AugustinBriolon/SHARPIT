import { addDays, startOfDay } from 'date-fns';
import { isCoachConfigured } from '@/lib/ai';
import { analyzePlannedSession } from '@/lib/coach/plan/coach-analysis';
import { scorePlannedActivityMatch } from '@/lib/planned-session/linking/session-link-match-score';
import {
  linkPlannedSessionActivity,
  setPlannedSessionAnalysis,
} from '@/lib/queries/planned-sessions';
import { prisma } from '@/lib/prisma';

export { scorePlannedActivityMatch } from '@/lib/planned-session/linking/session-link-match-score';

async function autoLinkOneActivity(
  athleteId: string,
  activityId: string,
  reservedSessionIds: Set<string>,
): Promise<{ sessionId: string } | null> {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, athleteId },
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
      athleteId,
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

  await linkPlannedSessionActivity(athleteId, best.s.id, activity.id);
  reservedSessionIds.add(best.s.id);

  return { sessionId: best.s.id };
}

/**
 * Lie automatiquement les activités nouvelles aux séances planifiées du même jour.
 * Compliance LLM analysis is separate ({@link analyzeLinkedPlannedSessions}) so
 * sync / open-path can await only the cheap DB match.
 */
export async function autoLinkActivities(
  athleteId: string,
  activityIds: string[],
): Promise<{ linked: number; sessionIds: string[] }> {
  const reserved = new Set<string>();
  const sessionIds: string[] = [];

  for (const activityId of activityIds) {
    const result = await autoLinkOneActivity(athleteId, activityId, reserved);
    if (!result) continue;
    sessionIds.push(result.sessionId);
  }

  return { linked: sessionIds.length, sessionIds };
}

/** Post-link compliance analysis — run off the HTTP critical path. */
export async function analyzeLinkedPlannedSessions(
  athleteId: string,
  sessionIds: string[],
): Promise<number> {
  if (!isCoachConfigured() || sessionIds.length === 0) return 0;

  let analyzed = 0;
  for (const sessionId of sessionIds) {
    try {
      const analysis = await analyzePlannedSession(athleteId, sessionId);
      if (analysis) {
        await setPlannedSessionAnalysis(athleteId, sessionId, analysis);
        analyzed += 1;
      }
    } catch (error) {
      console.error('[session-linking] analyze', sessionId, error);
    }
  }
  return analyzed;
}
