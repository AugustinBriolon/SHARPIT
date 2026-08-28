import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Sliding-window limiters keyed by athlete (and sometimes a sub-resource) —
 * generous enough that real use never approaches them, tight enough to cap
 * worst-case AI/DB cost from a single account. See ADR: abuse/cost protection.
 *
 * Fails OPEN (allows the request) when Upstash isn't configured — a missing
 * env var degrades to today's status quo (no protection), not an outage.
 * Matches this codebase's existing posture for optional integrations
 * (see `isCoachConfigured()` in src/lib/ai.ts).
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
    '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not configured — rate limiting is disabled.',
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

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** `limiter` is null when Upstash isn't configured — always allows in that case. */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    return { ok: true };
  }

  try {
    const result = await limiter.limit(key);
    if (result.success) {
      return { ok: true };
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return { ok: false, retryAfterSeconds };
  } catch (error) {
    // A Redis outage must not take the app down — fail open, same as unconfigured.
    console.error('[rate-limit] check failed, allowing request:', error);
    return { ok: true };
  }
}

export function rateLimitResponseBody(retryAfterSeconds: number) {
  return {
    error: `Trop de requêtes — réessaie dans ${retryAfterSeconds >= 60 ? `${Math.ceil(retryAfterSeconds / 60)} min` : `${retryAfterSeconds}s`}.`,
    retryAfterSeconds,
  };
}
