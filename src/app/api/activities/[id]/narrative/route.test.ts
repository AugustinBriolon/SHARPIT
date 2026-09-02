import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: vi.fn() };
});

vi.mock('@/lib/ai', () => ({ isCoachConfigured: vi.fn().mockReturnValue(true) }));

const runActivityNarrativeAnalysisMock = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/activity/narrative/activity-narrative', () => ({
  runActivityNarrativeAnalysis: runActivityNarrativeAnalysisMock,
}));

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  rateLimitJsonResponse: vi.fn((result) => ({
    body: { error: 'limited', retryAfterSeconds: result.retryAfterSeconds },
    status: 429,
  })),
  rateLimiters: { activityNarrative: {} },
}));

vi.mock('@/lib/access/narrative-trial', () => ({
  canGenerateNarrativeForActivity: vi.fn().mockResolvedValue({ allowed: true, isPro: true }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    activity: {
      findFirst: vi.fn().mockResolvedValue({ id: 'activity-1', date: new Date('2026-08-20') }),
      findUnique: vi.fn().mockResolvedValue({ id: 'activity-1' }),
    },
  },
}));

async function importRoute() {
  return await import('./route');
}

function postRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/activities/activity-1/narrative', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ id: 'activity-1' }) };

describe('POST /api/activities/[id]/narrative — force default', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    runActivityNarrativeAnalysisMock.mockResolvedValue(true);
    const { canGenerateNarrativeForActivity } = await import('@/lib/access/narrative-trial');
    vi.mocked(canGenerateNarrativeForActivity).mockResolvedValue({ allowed: true, isPro: true });
  });

  it('defaults force to false when the body omits it (idempotent by default)', async () => {
    const { POST } = await importRoute();

    await POST(postRequest({ wait: true }), context);

    expect(runActivityNarrativeAnalysisMock).toHaveBeenCalledWith('athlete-1', 'activity-1', {
      force: false,
    });
  });

  it('defaults force to false for a bare POST with no body at all', async () => {
    const { POST } = await importRoute();

    await POST(postRequest(), context);

    const { checkRateLimit } = await import('@/lib/rate-limit');
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('honors an explicit force: true', async () => {
    const { POST } = await importRoute();

    await POST(postRequest({ force: true, wait: true }), context);

    expect(runActivityNarrativeAnalysisMock).toHaveBeenCalledWith('athlete-1', 'activity-1', {
      force: true,
    });
  });

  it('rejects a non-boolean force value', async () => {
    const { POST } = await importRoute();

    const response = await POST(postRequest({ force: 'yes' }), context);

    expect(response.status).toBe(400);
    expect(runActivityNarrativeAnalysisMock).not.toHaveBeenCalled();
  });

  it('returns 402 locked when a FREE athlete is outside their free window', async () => {
    const { canGenerateNarrativeForActivity } = await import('@/lib/access/narrative-trial');
    vi.mocked(canGenerateNarrativeForActivity).mockResolvedValue({
      allowed: false,
      isPro: false,
    });
    const { POST } = await importRoute();

    const response = await POST(postRequest({ force: true, wait: true }), context);

    expect(response.status).toBe(402);
    expect(runActivityNarrativeAnalysisMock).not.toHaveBeenCalled();
  });

  it('allows a FREE athlete within their free window to generate', async () => {
    const { canGenerateNarrativeForActivity } = await import('@/lib/access/narrative-trial');
    vi.mocked(canGenerateNarrativeForActivity).mockResolvedValue({ allowed: true, isPro: false });
    const { POST } = await importRoute();

    const response = await POST(postRequest({ force: true, wait: true }), context);

    expect(response.status).not.toBe(402);
    expect(runActivityNarrativeAnalysisMock).toHaveBeenCalledWith('athlete-1', 'activity-1', {
      force: true,
    });
  });
});
