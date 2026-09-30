import { redis as sharedRedis } from '@sharpit/server/lib/redis';
import { listCalendars as listGoogleCalendars } from '@sharpit/server/lib/integrations/google/google';

/**
 * The ids of the calendars an athlete can read, kept a few hours in Redis. Every planning turn of
 * the coach asked Google for this list before asking for the busy slots, one extra round trip for
 * a list that changes when the athlete adds a calendar. A calendar added meanwhile shows up at the
 * next expiry; disconnecting Google clears it.
 */
const CALENDAR_IDS_TTL_SECONDS = 6 * 3600;

type CalendarIdsDeps = {
  redis: Pick<NonNullable<typeof sharedRedis>, 'get' | 'set' | 'del'> | null;
  listCalendars: (accessToken: string) => Promise<Array<{ id: string }>>;
};

const defaultDeps: CalendarIdsDeps = { redis: sharedRedis, listCalendars: listGoogleCalendars };

function calendarIdsKey(athleteId: string): string {
  return `google:calendar-ids:${athleteId}`;
}

/** Cached ids when present; otherwise Google's list, stored for next time. A Redis outage only costs the cache. */
export async function readableCalendarIds(
  athleteId: string,
  accessToken: string,
  deps: CalendarIdsDeps = defaultDeps,
): Promise<string[]> {
  const key = calendarIdsKey(athleteId);
  const cached = await deps.redis?.get<string[]>(key).catch(() => null);
  if (cached?.length) {
    return cached;
  }
  const ids = (await deps.listCalendars(accessToken)).map((calendar) => calendar.id);
  if (ids.length) {
    await deps.redis?.set(key, ids, { ex: CALENDAR_IDS_TTL_SECONDS }).catch(() => undefined);
  }
  return ids;
}

export async function forgetCalendarIds(
  athleteId: string,
  deps: Pick<CalendarIdsDeps, 'redis'> = defaultDeps,
): Promise<void> {
  await deps.redis?.del(calendarIdsKey(athleteId)).catch(() => undefined);
}
