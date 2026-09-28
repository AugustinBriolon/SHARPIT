import { prisma } from '@sharpit/db/client';
import { resolveNotificationPrefs } from '@sharpit/server/lib/notifications/notification-prefs';
import { sendPushToAthlete } from '@sharpit/server/lib/push/athlete-push';
import { redis } from '@sharpit/server/lib/redis';

/** Where a tap on each push lands in the app. */
export const WEEKLY_REVIEW_PATH = '/plan/review';
export const SOURCES_PATH = '/settings/sources';

/** A source to reconnect is said at most this often: a warning repeated daily is noise. */
const RECONNECT_ALERT_TTL_SECONDS = 3 * 24 * 3600;
const WEEKLY_REVIEW_ALERT_TTL_SECONDS = 8 * 24 * 3600;

type NotificationKind = 'weeklyReview' | 'syncAlerts';

async function wants(athleteId: string, kind: NotificationKind): Promise<boolean> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { notificationPrefs: true, deletedAt: true },
  });
  return (
    !!profile && !profile.deletedAt && resolveNotificationPrefs(profile.notificationPrefs)[kind]
  );
}

/**
 * Claims the right to send once: true the first time `key` is seen within `ttl`. Without Redis
 * (local development) every call may send.
 */
async function firstTime(key: string, ttlSeconds: number): Promise<boolean> {
  if (!redis) {
    return true;
  }
  return (await redis.set(key, 1, { nx: true, ex: ttlSeconds })) === 'OK';
}

/** « Ton bilan de la semaine est prêt » — once per week, for an athlete who wants it. */
export async function notifyWeeklyReviewReady(athleteId: string, weekStart: string) {
  if (!(await wants(athleteId, 'weeklyReview'))) {
    return;
  }
  if (
    !(await firstTime(
      `push:weekly-review:${athleteId}:${weekStart}`,
      WEEKLY_REVIEW_ALERT_TTL_SECONDS,
    ))
  ) {
    return;
  }
  const delivery = await sendPushToAthlete(athleteId, {
    aps: {
      alert: {
        title: 'Ton bilan de la semaine est prêt',
        body: 'Ce qui a marché, ce qui est à surveiller et la semaine prochaine.',
      },
      sound: 'default',
      'thread-id': 'weekly-review',
      category: 'WEEKLY_REVIEW',
    },
    url: WEEKLY_REVIEW_PATH,
  });
  console.info('[push] weekly review', delivery);
}

/** Tells the athlete which sources stopped syncing — each at most every three days. */
export async function notifySourcesToReconnect(athleteId: string, providers: readonly string[]) {
  if (providers.length === 0 || !(await wants(athleteId, 'syncAlerts'))) {
    return;
  }
  const fresh: string[] = [];
  for (const provider of reconnectableSources(providers)) {
    if (await firstTime(`push:reconnect:${athleteId}:${provider}`, RECONNECT_ALERT_TTL_SECONDS)) {
      fresh.push(provider);
    }
  }
  if (fresh.length === 0) {
    return;
  }
  const delivery = await sendPushToAthlete(athleteId, {
    aps: {
      alert: reconnectAlert(fresh),
      sound: 'default',
      'thread-id': 'sync-alerts',
      category: 'SYNC_RECONNECT',
    },
    url: SOURCES_PATH,
  });
  console.info('[push] reconnect', fresh, delivery);
}

/**
 * The sources as the athlete knows them: Garmin's health and activity syncs are one Garmin.
 */
export function reconnectableSources(providers: readonly string[]): string[] {
  return [...new Set(providers.map((provider) => provider.replace(/ activities$/i, '')))];
}

export function reconnectAlert(sources: readonly string[]): { title: string; body: string } {
  const names =
    sources.length === 1
      ? sources[0]
      : `${sources.slice(0, -1).join(', ')} et ${sources[sources.length - 1]}`;
  const one = sources.length === 1;
  return {
    title: `${names} ${one ? 'est déconnecté' : 'sont déconnectés'}`,
    body: `Reconnecte-${one ? 'le' : 'les'} dans Sources de données pour que tes données continuent d’arriver.`,
  };
}
