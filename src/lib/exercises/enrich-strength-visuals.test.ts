import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enrichStrengthExerciseVisuals } from './enrich-strength-visuals';

function makePrisma(
  sets: Array<{ id: string; exercise: string; exerciseCatalogId: string | null }>,
) {
  const update = vi.fn(
    async ({ where, data }: { where: { id: string }; data: { exerciseCatalogId: string } }) => {
      const row = sets.find((s) => s.id === where.id);
      if (row) row.exerciseCatalogId = data.exerciseCatalogId;
    },
  );

  return {
    activity: {
      findUnique: vi.fn(async () => ({
        type: 'STRENGTH' as const,
        strengthSets: sets,
      })),
    },
    strengthSet: { update },
  };
}

describe('enrichStrengthExerciseVisuals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists catalog ids for unmatched labels that resolve', async () => {
    const sets = [
      { id: '1', exercise: 'Pompe', exerciseCatalogId: null },
      { id: '2', exercise: 'Développé couché barre', exerciseCatalogId: '0025' },
      { id: '3', exercise: 'xyzzy inventé', exerciseCatalogId: null },
    ];
    const prisma = makePrisma(sets);

    const result = await enrichStrengthExerciseVisuals(prisma as never, 'act-1');

    expect(result.checked).toBe(3);
    expect(result.alreadyLinked).toBe(1);
    expect(result.matched).toBe(1);
    expect(result.unmatched).toEqual(['xyzzy inventé']);
    expect(sets[0]?.exerciseCatalogId).toBe('0662');
    expect(prisma.strengthSet.update).toHaveBeenCalledTimes(1);
  });
});
