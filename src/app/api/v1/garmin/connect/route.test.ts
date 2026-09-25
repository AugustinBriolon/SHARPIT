import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import * as authModule from '@/lib/auth/current-athlete';
import * as garminModule from '@/lib/integrations/garmin/garmin';
import * as privacyModule from '@/lib/privacy/gate-provider-connect';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    garminAccount: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn(),
}));

vi.mock('@/lib/athlete-state/orchestrator', () => ({
  onProviderSyncCompleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/privacy/gate-provider-connect', () => ({
  gateProviderConnect: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/integrations/garmin/garmin', () => ({
  loginWithCredentials: vi.fn(),
  GarminLoginError: class GarminLoginError extends Error {
    constructor(
      message: string,
      public readonly reason: string,
    ) {
      super(message);
    }
  },
}));

vi.mock('@/lib/integrations/garmin/garmin-sync', () => ({
  encryptGarminToken: vi.fn().mockReturnValue('encrypted_tok'),
  syncGarminHealth: vi.fn().mockResolvedValue({ updated: 0 }),
}));

vi.mock('@/lib/integrations/garmin/garmin-activity-sync', () => ({
  syncGarminActivities: vi.fn().mockResolvedValue({
    imported: 0,
    updated: 0,
    merged: 0,
    changedTypes: [],
    importedActivityIds: [],
  }),
}));

vi.mock('@/lib/integrations/source-prefs-store', () => ({
  persistSourcePrefsMutation: vi.fn().mockResolvedValue(undefined),
}));

describe('POST /api/v1/garmin/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing credentials with 400', async () => {
    const req = new NextRequest('https://sharpit.app/api/v1/garmin/connect', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('requis');
  });

  it('connects successfully and returns 200 with displayName', async () => {
    vi.mocked(authModule.getCurrentAthleteId).mockResolvedValueOnce('ath-123');
    vi.mocked(garminModule.loginWithCredentials).mockResolvedValueOnce({
      client: {} as any,
      tokens: { oauth1: 'tok1', oauth2: 'tok2' } as any,
      profile: { displayName: 'John Runner', fullName: 'John Doe' },
    });
    vi.mocked(prisma.garminAccount.upsert).mockResolvedValueOnce({} as any);

    const req = new NextRequest('https://sharpit.app/api/v1/garmin/connect', {
      method: 'POST',
      body: JSON.stringify({ username: 'john@example.com', password: 'secretpassword' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.displayName).toBe('John Runner');
    expect(prisma.garminAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { athleteId: 'ath-123' },
      }),
    );
  });

  it('returns 401 when credentials are invalid', async () => {
    vi.mocked(authModule.getCurrentAthleteId).mockResolvedValueOnce('ath-123');
    const err = new (garminModule.GarminLoginError as any)(
      'Invalid credentials',
      'invalid_credentials',
    );
    vi.mocked(garminModule.loginWithCredentials).mockRejectedValueOnce(err);

    const req = new NextRequest('https://sharpit.app/api/v1/garmin/connect', {
      method: 'POST',
      body: JSON.stringify({ username: 'john@example.com', password: 'wrongpassword' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Identifiants Garmin incorrects');
  });
});
