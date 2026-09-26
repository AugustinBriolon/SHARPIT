import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as cronSecretModule from '@sharpit/server/lib/cron/verify-cron-secret';
import * as apnsModule from '@sharpit/server/lib/push/apns';
import * as morningPushModule from '@sharpit/server/lib/push/morning-push';

vi.mock('@sharpit/server/lib/cron/verify-cron-secret', () => ({
  verifyCronSecret: vi.fn(),
}));

vi.mock('@sharpit/server/lib/push/apns', () => ({
  isApnsConfigured: vi.fn(),
}));

vi.mock('@sharpit/server/lib/push/morning-push', () => ({
  sendMorningVerdictPushes: vi.fn(),
}));

describe('GET /api/cron/morning-push', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized requests missing valid cron secret with 401', async () => {
    vi.mocked(cronSecretModule.verifyCronSecret).mockReturnValueOnce(false);

    const req = new Request('https://sharpit.app/api/cron/morning-push');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('skips push gracefully if APNs is not configured on server', async () => {
    vi.mocked(cronSecretModule.verifyCronSecret).mockReturnValueOnce(true);
    vi.mocked(apnsModule.isApnsConfigured).mockReturnValueOnce(false);

    const req = new Request('https://sharpit.app/api/cron/morning-push');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.skipped).toBe(true);
    expect(json.reason).toBe('APNS_NOT_CONFIGURED');
  });

  it('triggers sendMorningVerdictPushes and returns summary when authorized', async () => {
    vi.mocked(cronSecretModule.verifyCronSecret).mockReturnValueOnce(true);
    vi.mocked(apnsModule.isApnsConfigured).mockReturnValueOnce(true);
    vi.mocked(morningPushModule.sendMorningVerdictPushes).mockResolvedValueOnce({
      totalAthletes: 3,
      sentCount: 3,
      skippedCount: 0,
      failedCount: 0,
      deactivatedTokens: 0,
      results: [],
    });

    const req = new Request('https://sharpit.app/api/cron/morning-push');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.totalAthletes).toBe(3);
    expect(json.sentCount).toBe(3);
  });
});
