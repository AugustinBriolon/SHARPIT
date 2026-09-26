import { appOrigin } from '@/lib/app-origin';
import { mapWithConcurrency } from '@/lib/async/map-with-concurrency';
import { trainingDayIdNow } from '@/lib/athlete-state/freshness-service';
import { refreshAthleteState } from '@/lib/athlete-state/orchestrator';
import { getLatestAthleteSnapshot } from '@/infrastructure/athlete-state/snapshot-repository';
import { prisma } from '@sharpit/db/client';
import { wantsMorningVerdict } from '@/lib/notifications/notification-prefs';
import { isTokenExpiredOrInvalid, sendApnsNotification, type ApnsPayload } from '@/lib/push/apns';
import { mapVerdictToDisplay, type OverallVerdict } from '@/lib/today/dashboard/today-mapping';
import type { AthleteSnapshot } from '@/athlete-state/snapshot';

export type MorningPushPayload = {
  title: string;
  body: string;
  url: string;
  verdict: OverallVerdict | null;
  trainingDayId: string;
};

export type MorningPushAthleteResult = {
  athleteId: string;
  sent: number;
  failed: number;
  deactivated: number;
  skippedReason?:
    'DEACTIVATED' | 'OPTED_OUT' | 'NO_DEVICE_TOKENS' | 'ALREADY_SENT_TODAY' | 'NO_SNAPSHOT';
  verdict?: OverallVerdict | null;
};

export type MorningPushSummary = {
  totalAthletes: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  deactivatedTokens: number;
  results: MorningPushAthleteResult[];
};

const DEFAULT_CONCURRENCY = 5;

/**
 * Builds the minimal, silenceable morning push notification payload (Moment 1 - Wake).
 * Meets the athlete with a single honest verdict + briefing excerpt before they open the app.
 */
export function buildMorningPushPayload(
  snapshot: AthleteSnapshot,
  origin = appOrigin('https://sharpit.app'),
): MorningPushPayload {
  const verdict = (snapshot.todaysDecision ??
    snapshot.decision?.overallVerdict ??
    null) as OverallVerdict | null;

  let title = 'Verdict du jour';
  if (verdict) {
    const display = mapVerdictToDisplay(verdict);
    title = display?.label ?? title;
  }

  // Briefing excerpt or primary product message
  const rawBody =
    snapshot.primaryProductMessage ||
    snapshot.briefing?.content?.split('\n').find((l) => l.trim().length > 0) ||
    snapshot.insufficientDataMessage ||
    'Tes recommandations du jour sont prêtes dans SHARPIT.';

  // Cap length cleanly for lock screen presentation
  const body = rawBody.length > 140 ? `${rawBody.slice(0, 137).trim()}…` : rawBody;
  const url = `${origin.replace(/\/+$/, '')}/today`;

  return {
    title,
    body,
    url,
    verdict,
    trainingDayId: snapshot.trainingDayId,
  };
}

export function toApnsPayload(morning: MorningPushPayload): ApnsPayload {
  return {
    aps: {
      alert: {
        title: morning.title,
        body: morning.body,
      },
      sound: 'default',
      badge: 1,
      'thread-id': 'morning-verdict',
      category: 'MORNING_VERDICT',
    },
    url: morning.url,
    trainingDayId: morning.trainingDayId,
    verdict: morning.verdict,
  };
}

type MorningPushSkipReason = NonNullable<MorningPushAthleteResult['skippedReason']>;

/**
 * Why this athlete gets no morning push today, if they don't. `force` (the test push)
 * is the athlete asking for one: it overrides the opt-out and the once-a-day rule.
 */
function morningPushSkipReason(
  athlete: {
    deletedAt: Date | null;
    lastMorningPushDate: string | null;
    notificationPrefs: unknown;
    deviceTokens: unknown[];
  } | null,
  dayId: string,
  force: boolean,
): MorningPushSkipReason | undefined {
  if (!athlete || athlete.deletedAt) {
    return 'DEACTIVATED';
  }
  // Paramètres → Notifications.
  if (!force && !wantsMorningVerdict(athlete.notificationPrefs)) {
    return 'OPTED_OUT';
  }
  if (!force && athlete.lastMorningPushDate === dayId) {
    return 'ALREADY_SENT_TODAY';
  }
  return athlete.deviceTokens.length === 0 ? 'NO_DEVICE_TOKENS' : undefined;
}

/**
 * Sends the morning push notification to all active devices of an athlete.
 * By default, idempotent per day (skips if already sent today, unless force=true).
 */
export async function sendMorningPushForAthlete(
  athleteId: string,
  options?: {
    force?: boolean;
    trainingDayId?: string;
    origin?: string;
  },
): Promise<MorningPushAthleteResult> {
  const dayId = options?.trainingDayId ?? trainingDayIdNow();

  const athlete = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: {
      id: true,
      deletedAt: true,
      lastMorningPushDate: true,
      notificationPrefs: true,
      deviceTokens: {
        where: { enabled: true },
        select: { id: true, token: true, bundleId: true },
      },
    },
  });

  const skippedReason = morningPushSkipReason(athlete, dayId, options?.force ?? false);
  if (skippedReason || !athlete) {
    return { athleteId, sent: 0, failed: 0, deactivated: 0, skippedReason };
  }

  // Read or compute today's snapshot
  let snapshot = await getLatestAthleteSnapshot({ athleteId, trainingDayId: dayId });
  if (!snapshot) {
    try {
      const refreshed = await refreshAthleteState(athleteId, {
        trainingDayId: dayId,
        source: 'cron',
        skipSync: true,
      });
      snapshot = refreshed.athleteSnapshot;
    } catch {
      // Fallback: minimal synthetic snapshot if state generation fails
    }
  }

  if (!snapshot) {
    return {
      athleteId,
      sent: 0,
      failed: 0,
      deactivated: 0,
      skippedReason: 'NO_SNAPSHOT',
    };
  }

  const morningPayload = buildMorningPushPayload(snapshot, options?.origin);
  const apnsPayload = toApnsPayload(morningPayload);

  let sent = 0;
  let failed = 0;
  let deactivated = 0;

  for (const device of athlete.deviceTokens) {
    const result = await sendApnsNotification({
      deviceToken: device.token,
      payload: apnsPayload,
    });

    if (result.success) {
      sent += 1;
      try {
        await prisma.deviceToken.update({
          where: { token: device.token },
          data: { lastUsedAt: new Date() },
        });
      } catch {}
    } else {
      failed += 1;
      if (isTokenExpiredOrInvalid(result.status, result.reason)) {
        deactivated += 1;
        try {
          await prisma.deviceToken.update({
            where: { token: device.token },
            data: { enabled: false },
          });
        } catch {}
      }
    }
  }

  if (sent > 0) {
    try {
      await prisma.athleteProfile.update({
        where: { id: athleteId },
        data: { lastMorningPushDate: dayId },
      });
    } catch {}
  }

  return {
    athleteId,
    sent,
    failed,
    deactivated,
    verdict: morningPayload.verdict,
  };
}

/**
 * Sends the morning verdict notification to all eligible athletes.
 * Scheduled via cron (06:45 UTC / morning wake moment).
 */
export async function sendMorningVerdictPushes(options?: {
  trainingDayId?: string;
  origin?: string;
  concurrency?: number;
}): Promise<MorningPushSummary> {
  const dayId = options?.trainingDayId ?? trainingDayIdNow();

  // Find all active athletes who have at least one enabled device token
  // and haven't yet received today's morning push.
  const athletes = await prisma.athleteProfile.findMany({
    where: {
      deletedAt: null,
      NOT: { lastMorningPushDate: dayId },
      deviceTokens: {
        some: { enabled: true },
      },
    },
    select: { id: true },
  });

  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;

  const results = await mapWithConcurrency(athletes, concurrency, (athlete) =>
    sendMorningPushForAthlete(athlete.id, {
      trainingDayId: dayId,
      origin: options?.origin,
    }),
  );

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let deactivatedTokens = 0;

  for (const res of results) {
    if (res.skippedReason) {
      skippedCount += 1;
    } else {
      if (res.sent > 0) {
        sentCount += 1;
      }
      if (res.failed > 0 && res.sent === 0) {
        failedCount += 1;
      }
    }
    deactivatedTokens += res.deactivated;
  }

  return {
    totalAthletes: athletes.length,
    sentCount,
    skippedCount,
    failedCount,
    deactivatedTokens,
    results,
  };
}
