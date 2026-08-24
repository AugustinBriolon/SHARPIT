import { ActivityType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { rawStreamsHaveSignal } from '@/lib/integrations/garmin/garmin-streams';
import { fetchAndCacheActivityStreams } from '@/lib/streams/streams';

/**
 * Backfill progressif des streams (Garmin prioritaire, Strava en secours).
 *
 * Les streams ne sont récupérés qu'à l'ouverture d'une activité ou via ce job.
 * On traite un petit lot par exécution et on s'arrête proprement dès qu'un appel
 * échoue (rate-limit, token…), laissant le reste pour la prochaine fois.
 */

export interface BackfillResult {
  processed: number;
  withData: number;
  remaining: number;
  stopped: 'done' | 'rate_limited' | 'batch_full';
  activityIdsWithData: string[];
}

const BACKFILL_TYPES: ActivityType[] = [ActivityType.RUN, ActivityType.BIKE];

/** Lot cron — petit pour limiter le transfert réseau Neon (streams JSON lourds). */
export const CRON_BACKFILL_BATCH = 8;

function backfillWhere(athleteId: string) {
  return {
    athleteId,
    type: { in: BACKFILL_TYPES },
    stream: null,
    OR: [{ garminId: { not: null } }, { stravaId: { not: null } }],
  };
}

export async function countStreamBackfillCandidates(athleteId: string): Promise<number> {
  return prisma.activity.count({ where: backfillWhere(athleteId) });
}

export async function backfillActivityStreams(
  athleteId: string,
  limit = CRON_BACKFILL_BATCH,
): Promise<BackfillResult> {
  const candidates = await prisma.activity.findMany({
    where: backfillWhere(athleteId),
    orderBy: { date: 'desc' },
    take: limit,
    select: { id: true, garminId: true, stravaId: true },
  });

  const result: BackfillResult = {
    processed: 0,
    withData: 0,
    remaining: 0,
    stopped: 'done',
    activityIdsWithData: [],
  };

  if (candidates.length === 0) return result;

  for (const activity of candidates) {
    if (!activity.garminId && !activity.stravaId) continue;
    try {
      const { available, raw } = await fetchAndCacheActivityStreams(athleteId, activity.id, {
        garminId: activity.garminId,
        stravaId: activity.stravaId,
      });
      result.processed += 1;
      if (available && raw && rawStreamsHaveSignal(raw)) {
        result.withData += 1;
        result.activityIdsWithData.push(activity.id);
      }
    } catch (error) {
      console.error('[stream-backfill]', activity.id, error);
      result.stopped = 'rate_limited';
      break;
    }
  }

  if (result.stopped === 'done' && candidates.length === limit) {
    result.stopped = 'batch_full';
  }
  result.remaining = await countStreamBackfillCandidates(athleteId);
  return result;
}
