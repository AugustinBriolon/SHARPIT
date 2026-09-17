import { describe, expect, it } from 'vitest';
import {
  BRICK_MIN_LEGS,
  clearedBrickMetadata,
  demoteBrickLegsAfterRemoval,
  shouldDemoteBrick,
} from '@/lib/planned-session/brick/brick-demotion';

describe('shouldDemoteBrick', () => {
  it('keeps a brick when at least two legs remain', () => {
    expect(shouldDemoteBrick(BRICK_MIN_LEGS)).toBe(false);
    expect(shouldDemoteBrick(3)).toBe(false);
  });

  it('demotes when one leg remains after removing the other', () => {
    expect(shouldDemoteBrick(1)).toBe(true);
  });

  it('demotes when no legs remain', () => {
    expect(shouldDemoteBrick(0)).toBe(true);
  });
});

describe('clearedBrickMetadata', () => {
  it('clears brick group and order with no demoted label fields', () => {
    expect(clearedBrickMetadata()).toEqual({
      brickGroupId: null,
      brickOrder: null,
    });
  });
});

describe('demoteBrickLegsAfterRemoval', () => {
  const bike = { id: 'bike', brickGroupId: 'brick-1', brickOrder: 0 };
  const run = { id: 'run', brickGroupId: 'brick-1', brickOrder: 1 };
  const solo = { id: 'solo', brickGroupId: null, brickOrder: null };

  it('clears brick metadata on the surviving leg of a 2-leg brick', () => {
    expect(demoteBrickLegsAfterRemoval([bike, run, solo], 'bike')).toEqual([
      { id: 'run', brickGroupId: null, brickOrder: null },
      solo,
    ]);
  });

  it('leaves a brick intact when two or more legs remain', () => {
    const swim = { id: 'swim', brickGroupId: 'brick-1', brickOrder: 2 };
    expect(demoteBrickLegsAfterRemoval([bike, run, swim], 'swim')).toEqual([bike, run]);
  });

  it('does not touch unrelated sessions when removing a non-brick session', () => {
    expect(demoteBrickLegsAfterRemoval([bike, run, solo], 'solo')).toEqual([bike, run]);
  });
});
