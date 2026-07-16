import { describe, expect, it, vi } from 'vitest';
import { createTravelContext } from './service';

function fakePrisma() {
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'travel-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }));
  return { athleteTravelContext: { create } } as never;
}

describe('createTravelContext', () => {
  it('stores the exact UTC midnight of the requested calendar day, matching the coerced input', async () => {
    const prisma = fakePrisma();

    const travel = await createTravelContext(prisma, {
      locationLabel: 'Stockholm, Suède',
      locationLat: 59.33,
      locationLng: 18.06,
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-10'),
    });

    expect(travel.startDate.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(travel.endDate.toISOString()).toBe('2026-08-10T00:00:00.000Z');
  });
});
