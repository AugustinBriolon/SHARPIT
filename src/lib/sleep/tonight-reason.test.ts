import { describe, expect, it } from 'vitest';
import { tonightReason } from './tonight-reason';

const base = {
  nightStatus: 'present' as const,
  debt7Min: null,
  targetDeltaMin: null,
  restorativeRatio: null,
  regularityMin: null,
};

describe('tonightReason', () => {
  it('says the plan leans on earlier nights when last night has not synced', () => {
    expect(tonightReason({ ...base, nightStatus: 'pending' })).toContain('pas encore synchronisée');
    expect(tonightReason({ ...base, nightStatus: 'missing' })).toContain('Pas de données');
  });

  it('puts a week of debt ahead of a single short night', () => {
    const reason = tonightReason({ ...base, debt7Min: 120, targetDeltaMin: -45 });
    expect(reason).toContain('Dette');
    expect(reason).toContain('7 jours');
  });

  it('ignores a debt small enough to be noise', () => {
    expect(tonightReason({ ...base, debt7Min: 20, regularityMin: 15 })).toContain('Régularité');
  });

  it('reports a shortfall against the target when there is no standing debt', () => {
    expect(tonightReason({ ...base, targetDeltaMin: -45 })).toContain('sous l’objectif');
  });

  it('reports a shallow night only once duration is on target', () => {
    expect(tonightReason({ ...base, restorativeRatio: 32 })).toContain('32 %');
  });

  it('falls back to regularity, then to nothing at all', () => {
    expect(tonightReason({ ...base, regularityMin: 20 })).toContain('±20 min');
    expect(tonightReason(base)).toBeNull();
  });
});
