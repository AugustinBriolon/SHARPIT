import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import * as authModule from '@/lib/auth/current-athlete';
import * as apnsModule from '@/lib/push/apns';
import * as morningPushModule from '@/lib/push/morning-push';

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: { apiGeneral: {} },
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  rateLimitJsonResponse: vi.fn(),
}));

vi.mock('@/lib/push/apns', () => ({
  isApnsConfigured: vi.fn(),
}));

vi.mock('@/lib/push/morning-push', () => ({
  sendMorningPushForAthlete: vi.fn(),
}));

describe('/api/v1/push/test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 503 when APNs is unconfigured', async () => {
    vi.mocked(authModule.getCurrentAthleteId).mockResolvedValueOnce('ath-1');
    vi.mocked(apnsModule.isApnsConfigured).mockReturnValueOnce(false);

    const req = new NextRequest('https://sharpit.app/api/v1/push/test', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('triggers sendMorningPushForAthlete with force: true and returns result', async () => {
    vi.mocked(authModule.getCurrentAthleteId).mockResolvedValueOnce('ath-1');
    vi.mocked(apnsModule.isApnsConfigured).mockReturnValueOnce(true);
    vi.mocked(morningPushModule.sendMorningPushForAthlete).mockResolvedValueOnce({
      athleteId: 'ath-1',
      sent: 1,
      failed: 0,
      deactivated: 0,
      verdict: 'TRAIN_HARD',
    });

    const req = new NextRequest('https://sharpit.app/api/v1/push/test', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(1);
    expect(json.apiVersion).toBe(1);
    expect(morningPushModule.sendMorningPushForAthlete).toHaveBeenCalledWith(
      'ath-1',
      expect.objectContaining({ force: true }),
    );
  });
});
