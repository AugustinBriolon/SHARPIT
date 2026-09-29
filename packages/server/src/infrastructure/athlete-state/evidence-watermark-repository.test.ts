import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirstMock = vi.fn();
const findFirst = (...args: unknown[]) => findFirstMock(...args);

vi.mock('@sharpit/db/client', () => ({
  prisma: {
    activity: { findFirst },
    dailyHealth: { findFirst },
    bodyCompositionMeasurement: { findFirst },
    dailyNutrition: { findFirst },
    plannedSession: { findFirst },
    athleteProfile: { findFirst },
  },
}));

const { hasEvidenceWrittenSince } = await import('./evidence-watermark-repository');

const since = new Date('2026-09-29T12:00:00Z');

describe('hasEvidenceWrittenSince', () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    findFirstMock.mockResolvedValue(null);
  });

  it('is false when no evidence table has a row written since the sync started', async () => {
    await expect(hasEvidenceWrittenSince('athlete-1', since)).resolves.toBe(false);
    expect(findFirstMock).toHaveBeenCalledTimes(6);
  });

  it('is true as soon as one table has a fresh row', async () => {
    findFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'health-1' });
    await expect(hasEvidenceWrittenSince('athlete-1', since)).resolves.toBe(true);
  });

  it('scopes every lookup to the athlete and the sync start', async () => {
    await hasEvidenceWrittenSince('athlete-1', since);
    const wheres = findFirstMock.mock.calls.map(([args]) => args.where);
    expect(wheres.slice(0, 5)).toEqual(
      Array(5).fill({ athleteId: 'athlete-1', updatedAt: { gte: since } }),
    );
    expect(wheres[5]).toEqual({ id: 'athlete-1', updatedAt: { gte: since } });
  });
});
