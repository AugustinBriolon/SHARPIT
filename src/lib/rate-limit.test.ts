import type { Ratelimit } from '@upstash/ratelimit';
import { describe, expect, it, vi } from 'vitest';
import { checkRateLimit, rateLimitResponseBody } from './rate-limit';

function fakeLimiter(limit: Ratelimit['limit']): Ratelimit {
  return { limit } as unknown as Ratelimit;
}

describe('checkRateLimit', () => {
  it('allows the request when under the limit', async () => {
    const limiter = fakeLimiter(vi.fn().mockResolvedValue({ success: true, reset: 0 }));

    await expect(checkRateLimit(limiter, 'athlete-1')).resolves.toEqual({ ok: true });
  });

  it('blocks the request when over the limit, with a positive retryAfterSeconds', async () => {
    const reset = Date.now() + 45_000;
    const limiter = fakeLimiter(vi.fn().mockResolvedValue({ success: false, reset }));

    const result = await checkRateLimit(limiter, 'athlete-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(45);
    }
  });

  it('fails open when no limiter is configured', async () => {
    await expect(checkRateLimit(null, 'athlete-1')).resolves.toEqual({ ok: true });
  });

  it('fails open when the limiter throws (e.g. Redis outage)', async () => {
    const limiter = fakeLimiter(vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(checkRateLimit(limiter, 'athlete-1')).resolves.toEqual({ ok: true });
  });
});

describe('rateLimitResponseBody', () => {
  it('reports seconds under a minute', () => {
    expect(rateLimitResponseBody(30)).toEqual({
      error: 'Trop de requêtes — réessaie dans 30s.',
      retryAfterSeconds: 30,
    });
  });

  it('reports minutes at or above 60 seconds', () => {
    expect(rateLimitResponseBody(120)).toEqual({
      error: 'Trop de requêtes — réessaie dans 2 min.',
      retryAfterSeconds: 120,
    });
  });
});
