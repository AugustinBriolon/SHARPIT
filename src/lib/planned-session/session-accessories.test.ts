import { describe, expect, it } from 'vitest';
import { resolveSessionAccessories } from './session-accessories';

describe('resolveSessionAccessories', () => {
  it('uses explicit accessories when present', () => {
    const items = resolveSessionAccessories({
      type: 'SWIM',
      description: 'Endurance',
      accessories: ['swim_pull_buoy', 'swim_fins'],
    });
    expect(items.map((i) => i.id)).toEqual(['swim_pull_buoy', 'swim_fins']);
  });

  it('infers pull buoy and bands from text', () => {
    expect(
      resolveSessionAccessories({
        type: 'SWIM',
        description: 'Travail bras avec pull buoy',
      }).map((i) => i.id),
    ).toContain('swim_pull_buoy');

    expect(
      resolveSessionAccessories({
        type: 'STRENGTH',
        title: 'Mobilité',
        strengthPrescription: {
          version: 1,
          sets: [{ exercise: 'Clamshell avec élastique', sets: 3, reps: 12, order: 0 }],
        },
      }).map((i) => i.id),
    ).toEqual(expect.arrayContaining(['strength_bands', 'mobility_bands']));
  });
});
