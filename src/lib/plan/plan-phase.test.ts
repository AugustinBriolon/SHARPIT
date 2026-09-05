import { describe, expect, it } from 'vitest';
import { resolvePlanPhase } from '@/lib/plan/plan-phase';

const PLAN = {
  raceDate: '2026-10-04',
  weeks: [
    {
      weekStart: '2026-08-31',
      phase: 'BUILD' as const,
      isDeload: false,
      focus: 'Seuil',
    },
    {
      weekStart: '2026-09-07',
      phase: 'PEAK' as const,
      isDeload: true,
      focus: 'Récupération',
    },
  ],
};

describe('resolvePlanPhase', () => {
  it('reads the current generated-plan week', () => {
    expect(resolvePlanPhase(PLAN, new Date(2026, 8, 2))).toEqual({
      phaseLabel: 'Développement',
      isDeload: false,
      weeksToRace: 4,
      focus: 'Seuil',
    });
  });

  it('is absent when there is no generated plan, or the week is outside it', () => {
    expect(resolvePlanPhase(null, new Date(2026, 8, 2))).toBeNull();
    expect(resolvePlanPhase(PLAN, new Date(2026, 6, 1))).toBeNull();
  });
});
