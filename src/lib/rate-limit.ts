import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Sliding-window limiters keyed by athlete (and sometimes a sub-resource) —
 * generous enough that real use never approaches them, tight enough to cap
 * worst-case AI/DB cost from a single account.
 *
 * Default posture is fail-OPEN (allow) when Upstash isn't configured or Redis
 * errors — used by the global `apiGeneral` flood backstop so a Redis blip
 * doesn't take the whole app down.
 *
 * Sensitive routes (coach / AI, provider sync, session analyze) pass
 * `{ failClosed: true }` and receive 503 when protection is unavailable.
 * Production must set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
 */

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis) {
  console.error(
    '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not configured — sensitive routes fail closed; apiGeneral fails open.',
  );
}

function limiter(requests: number, window: `${number} ${'s' | 'm' | 'h'}`, prefix: string) {
  if (!redis) {
    return null;
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `sharpit:${prefix}`,
    analytics: false,
  });
}

export const rateLimiters = {
  apiGeneral: limiter(300, '5 m', 'api'),
  coachChat: limiter(30, '10 m', 'coach-chat'),
  coachPlan: limiter(10, '1 h', 'coach-plan'),
  coachAdapt: limiter(10, '1 h', 'coach-adapt'),
  coachReview: limiter(5, '1 h', 'coach-review'),
  sessionAnalyze: limiter(20, '1 h', 'session-analyze'),
  activityNarrative: limiter(1, '10 m', 'activity-narrative'),
  providerSync: limiter(1, '2 m', 'provider-sync'),
};

export type RateLimitCause = 'limited' | 'unavailable';

export type RateLimitResult =
  { ok: true } | { ok: false; retryAfterSeconds: number; cause: RateLimitCause };

const UNAVAILABLE_RETRY_AFTER_SECONDS = 60;

export type CheckRateLimitOptions = {
  /** When true, missing/broken Upstash rejects the request instead of allowing it. */
  failClosed?: boolean;
};

/** `limiter` is null when Upstash isn't configured. */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string,
  options?: CheckRateLimitOptions,
): Promise<RateLimitResult> {
  const failClosed = options?.failClosed === true;

  if (!limiter) {
    if (failClosed) {
      return {
        ok: false,
        cause: 'unavailable',
        retryAfterSeconds: UNAVAILABLE_RETRY_AFTER_SECONDS,
      };
    }
    return { ok: true };
  }

  try {
    const result = await limiter.limit(key);
    if (result.success) {
      return { ok: true };
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return { ok: false, cause: 'limited', retryAfterSeconds };
  } catch (error) {
    console.error(
      failClosed
        ? '[rate-limit] check failed, rejecting sensitive request:'
        : '[rate-limit] check failed, allowing request:',
      error,
    );
    if (failClosed) {
      return {
        ok: false,
        cause: 'unavailable',
        retryAfterSeconds: UNAVAILABLE_RETRY_AFTER_SECONDS,
      };
    }
    return { ok: true };
  }
}

export function rateLimitResponseBody(
  retryAfterSeconds: number,
  cause: RateLimitCause = 'limited',
) {
  if (cause === 'unavailable') {
    return {
      error: 'Protection anti-abus indisponible — réessaie dans quelques instants.',
      retryAfterSeconds,
    };
  }
  return {
    error: `Trop de requêtes — réessaie dans ${retryAfterSeconds >= 60 ? `${Math.ceil(retryAfterSeconds / 60)} min` : `${retryAfterSeconds}s`}.`,
    retryAfterSeconds,
  };
}

export function rateLimitHttpStatus(cause: RateLimitCause): 429 | 503 {
  return cause === 'unavailable' ? 503 : 429;
}

/** Convenience for route handlers after `checkRateLimit`. */
export function rateLimitJsonResponse(result: Extract<RateLimitResult, { ok: false }>) {
  return {
    body: rateLimitResponseBody(result.retryAfterSeconds, result.cause),
    status: rateLimitHttpStatus(result.cause),
  };
}
