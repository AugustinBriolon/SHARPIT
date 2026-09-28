import { Redis } from '@upstash/redis';

/**
 * The Upstash Redis client, shared by the rate limits and the short-lived state that must
 * outlive one request (a background plan generation). Null when Upstash is not configured —
 * local development without it.
 */
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;
