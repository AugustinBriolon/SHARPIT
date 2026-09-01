import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    myFitnessPalAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    dailyNutrition: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/engines/observation-engine', () => ({
  observationEngine: { ingest: vi.fn(), ingestBatch: vi.fn() },
}));

vi.mock('@/lib/integrations/myfitnesspal/myfitnesspal', () => ({
  MfpSessionExpiredError: class MfpSessionExpiredError extends Error {},
  fetchDiaryDay: vi.fn(),
  fetchDisplayName: vi.fn(),
  fetchNutrientGoals: vi.fn(),
  refreshMfpSession: vi.fn(),
}));

describe('syncMfpNutrition credential resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECRET_ENCRYPTION_KEY = 'mfp-sync-test-key';
  });

  it('returns quietly when the account is already revoked (empty session)', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { syncMfpNutrition } = await import('@/lib/integrations/myfitnesspal/myfitnesspal-sync');

    vi.mocked(prisma.myFitnessPalAccount.findUnique).mockResolvedValue({
      athleteId: 'ath-1',
      sessionTokenEnc: '',
      displayName: 'Athlete',
    } as never);

    await expect(syncMfpNutrition('ath-1')).resolves.toEqual({ synced: 0, errors: 0 });
  });

  it('revokes and raises ProviderAuthError when stored ciphertext cannot be decrypted', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { syncMfpNutrition } = await import('@/lib/integrations/myfitnesspal/myfitnesspal-sync');
    const { encryptSecret } = await import('@/lib/secret-box');
    const { ProviderAuthError } = await import('@/lib/integrations/shared/connection-status');

    process.env.SECRET_ENCRYPTION_KEY = 'key-that-wrote-the-blob';
    const blob = encryptSecret('cookie');
    process.env.SECRET_ENCRYPTION_KEY = 'different-runtime-key';

    vi.mocked(prisma.myFitnessPalAccount.findUnique).mockResolvedValue({
      athleteId: 'ath-1',
      sessionTokenEnc: blob,
      displayName: 'Athlete',
    } as never);
    vi.mocked(prisma.myFitnessPalAccount.update).mockResolvedValue({} as never);

    await expect(syncMfpNutrition('ath-1')).rejects.toBeInstanceOf(ProviderAuthError);
    expect(prisma.myFitnessPalAccount.update).toHaveBeenCalledWith({
      where: { athleteId: 'ath-1' },
      data: { sessionTokenEnc: '' },
    });
  });
});
