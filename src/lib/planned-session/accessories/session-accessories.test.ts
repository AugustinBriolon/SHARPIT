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

  it('infers rings, dip station and portable load from strength text', () => {
    expect(
      resolveSessionAccessories({
        type: 'STRENGTH',
        title: 'Haut du corps',
        strengthPrescription: {
          version: 1,
          sets: [
            { exercise: 'Rowing aux anneaux', sets: 4, reps: 8, order: 0 },
            { exercise: 'Dips lestés', sets: 4, reps: 6, order: 1 },
          ],
        },
      }).map((i) => i.id),
    ).toEqual(
      expect.arrayContaining(['strength_rings', 'strength_dip_bars', 'strength_weighted_vest']),
    );
  });

  it('infers the yoga block from a mobility session', () => {
    expect(
      resolveSessionAccessories({
        type: 'STRENGTH',
        title: 'Mobilité hanches',
        description: 'Pigeon avec brique sous la fesse',
      }).map((i) => i.id),
    ).toContain('mobility_yoga_block');
  });

  it('packs portable load for a run session', () => {
    expect(
      resolveSessionAccessories({
        type: 'RUN',
        title: 'Côtes',
        description: 'Côtes en gilet lesté 10 kg',
      }).map((i) => i.id),
    ).toEqual(['strength_weighted_vest']);
  });
});
