import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, DELETE } from './route';
import { prisma } from '@sharpit/db/client';
import * as authModule from '@/lib/auth/current-athlete';

vi.mock('@sharpit/db/client', () => ({
  prisma: {
    deviceToken: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: { apiGeneral: {} },
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  rateLimitJsonResponse: vi.fn(),
}));

describe('/api/v1/push/device-token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('rejects an invalid token with 400', async () => {
      const req = new NextRequest('https://sharpit.app/api/v1/push/device-token', {
        method: 'POST',
        body: JSON.stringify({ token: 'short' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Token APNs invalide');
    });

    it('cleans brackets and spaces from device token and upserts cleanly', async () => {
      vi.mocked(authModule.getCurrentAthleteId).mockResolvedValueOnce('ath-1');
      vi.mocked(prisma.deviceToken.upsert).mockResolvedValueOnce({
        id: 'tok-1',
        athleteId: 'ath-1',
        token: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        platform: 'ios',
        bundleId: 'app.sharpit.ios',
        enabled: true,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rawToken = '<12345678 90abcdef 12345678 90abcdef 12345678 90abcdef 12345678 90abcdef>';
      const req = new NextRequest('https://sharpit.app/api/v1/push/device-token', {
        method: 'POST',
        body: JSON.stringify({ token: rawToken }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.apiVersion).toBe(1);

      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith({
        where: { token: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' },
        create: {
          athleteId: 'ath-1',
          token: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          platform: 'ios',
          bundleId: 'app.sharpit.ios',
          enabled: true,
        },
        update: {
          athleteId: 'ath-1',
          platform: 'ios',
          bundleId: 'app.sharpit.ios',
          enabled: true,
        },
      });
    });
  });

  describe('DELETE', () => {
    it('removes device token for the current athlete', async () => {
      vi.mocked(authModule.getCurrentAthleteId).mockResolvedValueOnce('ath-1');
      vi.mocked(prisma.deviceToken.deleteMany).mockResolvedValueOnce({ count: 1 });

      const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const req = new NextRequest('https://sharpit.app/api/v1/push/device-token', {
        method: 'DELETE',
        body: JSON.stringify({ token }),
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.apiVersion).toBe(1);

      expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: {
          token,
          athleteId: 'ath-1',
        },
      });
    });
  });
});
