import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@sharpit/db/client', () => ({
  prisma: { plannedSession: { findMany: vi.fn(), findFirst: vi.fn() } },
}));
vi.mock('@sharpit/server/lib/decision-memory/repository', () => ({
  createCoachingDecision: vi.fn().mockResolvedValue({ id: 'decision-new' }),
  expireDecision: vi.fn().mockResolvedValue(undefined),
  findCoachingDecisionById: vi.fn(),
  findMorningRecalibrationDecision: vi.fn(),
  recordDecisionAction: vi.fn(),
}));
vi.mock('@sharpit/server/lib/decision-memory/build-snapshot-context', () => ({
  buildDecisionSnapshotContext: vi.fn().mockReturnValue({}),
}));
vi.mock('@sharpit/server/lib/athlete-state/snapshot-service', () => ({
  getOrBuildAthleteSnapshot: vi.fn(),
}));
vi.mock('@sharpit/server/lib/journal/wellness-checkin', () => ({
  hasMorningWellnessCheckin: vi.fn().mockResolvedValue(false),
}));
vi.mock('@sharpit/app/lib/today/rich/morning-orientation', () => ({
  nightEvidenceReady: vi.fn().mockReturnValue(true),
}));

const swim = {
  id: 'ps-swim',
  type: 'SWIM',
  intensity: 'ENDURANCE',
  durationMin: 60,
  load: 50,
  title: 'Natation endurance',
  description: null,
  completed: false,
  activityId: null,
  date: new Date('2026-10-02T12:00:00'),
  startTime: null,
  goalId: null,
};

const recoverNight = {
  decision: { overallVerdict: 'RECOVER', confidenceTier: 'HIGH' },
  fatigue: { trainingCapacity: 'REDUCED' },
};

async function deps() {
  const { prisma } = await import('@sharpit/db/client');
  const repo = await import('@sharpit/server/lib/decision-memory/repository');
  const snapshots = await import('@sharpit/server/lib/athlete-state/snapshot-service');
  const night = await import('@sharpit/app/lib/today/rich/morning-orientation');
  return { prisma, repo, snapshots, night };
}

describe('morning recalibration service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma, repo, snapshots, night } = await deps();
    vi.mocked(prisma.plannedSession.findMany).mockResolvedValue([swim] as never);
    vi.mocked(repo.findMorningRecalibrationDecision).mockResolvedValue(null);
    vi.mocked(snapshots.getOrBuildAthleteSnapshot).mockResolvedValue(recoverNight as never);
    vi.mocked(night.nightEvidenceReady).mockReturnValue(true);
  });

  it('proposes once the night is read, without waiting for the check-in', async () => {
    const { ensureMorningRecalibration } = await import('./service');

    const result = await ensureMorningRecalibration('athlete-1', '2026-10-02');

    expect(result.created).toBe(true);
    expect(result.presentation).toMatchObject({
      decisionId: 'decision-new',
      direction: 'DOWN',
      toIntensity: 'RECOVERY',
      toDurationMin: 45,
    });
  });

  it('stays silent while the night is still being read', async () => {
    const { night, repo } = await deps();
    vi.mocked(night.nightEvidenceReady).mockReturnValue(false);
    const { ensureMorningRecalibration } = await import('./service');

    const result = await ensureMorningRecalibration('athlete-1', '2026-10-02');

    expect(result.presentation).toBeNull();
    expect(repo.createCoachingDecision).not.toHaveBeenCalled();
  });

  it('replaces a proposal still waiting once the check-in arrives', async () => {
    const { repo } = await deps();
    vi.mocked(repo.findMorningRecalibrationDecision)
      .mockResolvedValueOnce({ id: 'decision-old', status: 'PRESENTED' } as never)
      .mockResolvedValueOnce({
        id: 'decision-old',
        status: 'EXPIRED',
        proposal: { sessionId: 'ps-swim' },
        snapshotContext: { morningRecalibration: {} },
      } as never);
    const { refreshMorningRecalibrationAfterCheckIn } = await import('./service');

    const result = await refreshMorningRecalibrationAfterCheckIn('athlete-1', '2026-10-02');

    expect(repo.expireDecision).toHaveBeenCalledWith('decision-old');
    expect(result.created).toBe(true);
    expect(result.presentation?.decisionId).toBe('decision-new');
  });

  it('keeps a proposal the athlete already answered', async () => {
    const { repo } = await deps();
    vi.mocked(repo.findMorningRecalibrationDecision).mockResolvedValue({
      id: 'decision-old',
      status: 'ACCEPTED',
      proposal: { sessionId: 'ps-swim', type: 'SWIM' },
      snapshotContext: {
        morningRecalibration: { direction: 'DOWN', changeSummary: 'x', why: 'y' },
      },
    } as never);
    const { prisma } = await deps();
    vi.mocked(prisma.plannedSession.findFirst).mockResolvedValue({ type: 'SWIM' } as never);
    const { refreshMorningRecalibrationAfterCheckIn } = await import('./service');

    const result = await refreshMorningRecalibrationAfterCheckIn('athlete-1', '2026-10-02');

    expect(repo.expireDecision).not.toHaveBeenCalled();
    expect(repo.createCoachingDecision).not.toHaveBeenCalled();
    expect(result.presentation?.status).toBe('ACCEPTED');
  });
});
