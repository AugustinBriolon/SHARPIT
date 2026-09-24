import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildMorningPushPayload,
  toApnsPayload,
  sendMorningPushForAthlete,
  sendMorningVerdictPushes,
} from './morning-push';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { prisma } from '@/lib/prisma';
import * as apnsModule from '@/lib/push/apns';
import * as snapshotRepo from '@/infrastructure/athlete-state/snapshot-repository';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    athleteProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    deviceToken: {
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

vi.mock('@/infrastructure/athlete-state/snapshot-repository', () => ({
  getLatestAthleteSnapshot: vi.fn(),
}));

describe('morning-push', () => {
  const dummySnapshot = {
    athleteId: 'ath-1',
    trainingDayId: '2026-09-24',
    snapshotId: 'snap-1',
    todaysDecision: 'TRAIN_HARD',
    decision: { overallVerdict: 'TRAIN_HARD' },
    primaryProductMessage: 'Super forme ce matin — séance clé au programme.',
    briefing: null,
    insufficientDataMessage: null,
  } as unknown as AthleteSnapshot;

  describe('buildMorningPushPayload', () => {
    it('maps TRAIN_HARD verdict to French label and builds deep link', () => {
      const payload = buildMorningPushPayload(dummySnapshot, 'https://sharpit.app');
      expect(payload.title).toBe('Entraîne-toi fort');
      expect(payload.body).toBe('Super forme ce matin — séance clé au programme.');
      expect(payload.url).toBe('https://sharpit.app/today');
      expect(payload.verdict).toBe('TRAIN_HARD');
      expect(payload.trainingDayId).toBe('2026-09-24');
    });

    it('maps RECOVER verdict correctly', () => {
      const recoverSnap = {
        ...dummySnapshot,
        todaysDecision: 'RECOVER',
        primaryProductMessage: 'Sommeil perturbé — repos recommandé.',
      } as unknown as AthleteSnapshot;

      const payload = buildMorningPushPayload(recoverSnap, 'https://sharpit.app');
      expect(payload.title).toBe('Récupère');
      expect(payload.body).toBe('Sommeil perturbé — repos recommandé.');
    });

    it('truncates body exceeding 140 chars gracefully', () => {
      const longMessage = 'A'.repeat(200);
      const longSnap = {
        ...dummySnapshot,
        primaryProductMessage: longMessage,
      } as unknown as AthleteSnapshot;

      const payload = buildMorningPushPayload(longSnap);
      expect(payload.body.length).toBeLessThanOrEqual(140);
      expect(payload.body.endsWith('…')).toBe(true);
    });
  });

  describe('toApnsPayload', () => {
    it('creates an Apple APNs compliant alert payload', () => {
      const morning = buildMorningPushPayload(dummySnapshot, 'https://sharpit.app');
      const apns = toApnsPayload(morning);

      expect(apns.aps.alert.title).toBe('Entraîne-toi fort');
      expect(apns.aps.sound).toBe('default');
      expect(apns.aps.badge).toBe(1);
      expect(apns.aps.category).toBe('MORNING_VERDICT');
      expect(apns.url).toBe('https://sharpit.app/today');
      expect(apns.trainingDayId).toBe('2026-09-24');
    });
  });

  describe('sendMorningPushForAthlete', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('skips when athlete already received morning push today (silence over noise)', async () => {
      vi.mocked(prisma.athleteProfile.findUnique).mockResolvedValueOnce({
        id: 'ath-1',
        deletedAt: null,
        lastMorningPushDate: '2026-09-24',
        deviceTokens: [{ id: 'dev-1', token: 'token123', bundleId: 'app.sharpit.ios' }],
      } as never);

      const result = await sendMorningPushForAthlete('ath-1', {
        trainingDayId: '2026-09-24',
      });

      expect(result.skippedReason).toBe('ALREADY_SENT_TODAY');
      expect(result.sent).toBe(0);
    });

    it('sends when force is true even if already sent today', async () => {
      vi.mocked(prisma.athleteProfile.findUnique).mockResolvedValueOnce({
        id: 'ath-1',
        deletedAt: null,
        lastMorningPushDate: '2026-09-24',
        deviceTokens: [{ id: 'dev-1', token: 'token123', bundleId: 'app.sharpit.ios' }],
      } as never);

      vi.mocked(snapshotRepo.getLatestAthleteSnapshot).mockResolvedValueOnce(dummySnapshot);
      vi.spyOn(apnsModule, 'sendApnsNotification').mockResolvedValueOnce({
        success: true,
        status: 200,
        deviceToken: 'token123',
      });
      vi.mocked(prisma.athleteProfile.update).mockResolvedValueOnce({} as never);

      const result = await sendMorningPushForAthlete('ath-1', {
        trainingDayId: '2026-09-24',
        force: true,
      });

      expect(result.sent).toBe(1);
      expect(result.skippedReason).toBeUndefined();
      expect(prisma.athleteProfile.update).toHaveBeenCalledWith({
        where: { id: 'ath-1' },
        data: { lastMorningPushDate: '2026-09-24' },
      });
    });

    it('skips when athlete has no active device tokens', async () => {
      vi.mocked(prisma.athleteProfile.findUnique).mockResolvedValueOnce({
        id: 'ath-1',
        deletedAt: null,
        lastMorningPushDate: null,
        deviceTokens: [],
      } as never);

      const result = await sendMorningPushForAthlete('ath-1', {
        trainingDayId: '2026-09-24',
      });

      expect(result.skippedReason).toBe('NO_DEVICE_TOKENS');
      expect(result.sent).toBe(0);
    });

    it('deactivates device token when APNs reports 410 Unregistered', async () => {
      vi.mocked(prisma.athleteProfile.findUnique).mockResolvedValueOnce({
        id: 'ath-1',
        deletedAt: null,
        lastMorningPushDate: null,
        deviceTokens: [{ id: 'dev-1', token: 'dead-token', bundleId: 'app.sharpit.ios' }],
      } as never);

      vi.mocked(snapshotRepo.getLatestAthleteSnapshot).mockResolvedValueOnce(dummySnapshot);
      vi.spyOn(apnsModule, 'sendApnsNotification').mockResolvedValueOnce({
        success: false,
        status: 410,
        reason: 'Unregistered',
        deviceToken: 'dead-token',
      });

      const result = await sendMorningPushForAthlete('ath-1', {
        trainingDayId: '2026-09-24',
      });

      expect(result.failed).toBe(1);
      expect(result.deactivated).toBe(1);
      expect(prisma.deviceToken.update).toHaveBeenCalledWith({
        where: { token: 'dead-token' },
        data: { enabled: false },
      });
    });
  });

  describe('sendMorningVerdictPushes', () => {
    it('dispatches pushes to eligible athletes only', async () => {
      vi.mocked(prisma.athleteProfile.findMany).mockResolvedValueOnce([
        { id: 'ath-1' },
        { id: 'ath-2' },
      ] as never);

      vi.mocked(prisma.athleteProfile.findUnique)
        .mockResolvedValueOnce({
          id: 'ath-1',
          deletedAt: null,
          lastMorningPushDate: null,
          deviceTokens: [{ id: 'dev-1', token: 'token-1', bundleId: 'app.sharpit.ios' }],
        } as never)
        .mockResolvedValueOnce({
          id: 'ath-2',
          deletedAt: null,
          lastMorningPushDate: null,
          deviceTokens: [{ id: 'dev-2', token: 'token-2', bundleId: 'app.sharpit.ios' }],
        } as never);

      vi.mocked(snapshotRepo.getLatestAthleteSnapshot).mockResolvedValue(dummySnapshot);
      vi.spyOn(apnsModule, 'sendApnsNotification').mockResolvedValue({
        success: true,
        status: 200,
        deviceToken: 'token',
      });
      vi.mocked(prisma.athleteProfile.update).mockResolvedValue({} as never);

      const summary = await sendMorningVerdictPushes({ trainingDayId: '2026-09-24' });

      expect(summary.totalAthletes).toBe(2);
      expect(summary.sentCount).toBe(2);
      expect(summary.failedCount).toBe(0);
    });
  });
});
