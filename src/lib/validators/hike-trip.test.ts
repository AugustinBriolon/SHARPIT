import { describe, expect, it } from 'vitest';
import { createHikeTripSchema, patchHikeTripSchema } from './hike-trip';

describe('createHikeTripSchema', () => {
  it('accepts a valid payload', () => {
    const result = createHikeTripSchema.safeParse({
      name: ' Tour du Mont Blanc ',
      activityIds: ['a1', 'a2'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Tour du Mont Blanc');
      expect(result.data.activityIds).toEqual(['a1', 'a2']);
    }
  });

  it('rejects an empty name', () => {
    const result = createHikeTripSchema.safeParse({
      name: '   ',
      activityIds: ['a1', 'a2'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects fewer than two activity ids', () => {
    const result = createHikeTripSchema.safeParse({
      name: 'Week-end',
      activityIds: ['a1'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'Au moins deux randonnées')).toBe(true);
    }
  });
});

describe('patchHikeTripSchema', () => {
  it('accepts a rename', () => {
    const result = patchHikeTripSchema.safeParse({ name: 'Nouveau nom' });
    expect(result.success).toBe(true);
  });

  it('accepts add and remove lists', () => {
    const result = patchHikeTripSchema.safeParse({
      addActivityIds: ['a3'],
      removeActivityIds: ['a1'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty patch', () => {
    const result = patchHikeTripSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'Aucune modification')).toBe(true);
    }
  });
});
