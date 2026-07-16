import { describe, expect, it } from 'vitest';
import {
  deriveTravelTrainingConstraint,
  normalizeTravelDisciplines,
} from '@/lib/travel-context/disciplines';
import { generateMacroPlan } from '@/lib/periodization';
import {
  applyTravelConstraintsToMacroWeeks,
  overlappingCalendarDays,
  resolveConstraintForWeek,
  resolvePlanTargetUnderTravel,
} from '@/lib/travel-context/training-constraint';

describe('deriveTravelTrainingConstraint', () => {
  it('maps mobility-only to MOBILITY_ONLY', () => {
    expect(deriveTravelTrainingConstraint(['MOBILITY'])).toBe('MOBILITY_ONLY');
  });

  it('maps strength without endurance to REDUCED', () => {
    expect(deriveTravelTrainingConstraint(['STRENGTH', 'MOBILITY'])).toBe('REDUCED');
  });

  it('keeps FULL when an endurance sport is allowed', () => {
    expect(deriveTravelTrainingConstraint(['RUN', 'STRENGTH', 'MOBILITY'])).toBe('FULL');
  });

  it('maps empty selection to FULL', () => {
    expect(deriveTravelTrainingConstraint([])).toBe('FULL');
  });

  it('maps noStructuredTraining to NONE', () => {
    expect(deriveTravelTrainingConstraint([], { noStructuredTraining: true })).toBe('NONE');
  });
});

describe('normalizeTravelDisciplines', () => {
  it('dedupes and filters invalid values', () => {
    expect(normalizeTravelDisciplines(['RUN', 'RUN', 'NOPE', 'MOBILITY'])).toEqual([
      'RUN',
      'MOBILITY',
    ]);
  });
});

describe('overlappingCalendarDays', () => {
  it('counts inclusive overlap', () => {
    expect(
      overlappingCalendarDays(
        new Date('2026-08-03'),
        new Date('2026-08-09'),
        new Date('2026-08-01'),
        new Date('2026-08-06'),
      ),
    ).toBe(4);
  });

  it('returns 0 when ranges do not overlap', () => {
    expect(
      overlappingCalendarDays(
        new Date('2026-08-10'),
        new Date('2026-08-16'),
        new Date('2026-08-01'),
        new Date('2026-08-06'),
      ),
    ).toBe(0);
  });
});

describe('applyTravelConstraintsToMacroWeeks', () => {
  it('caps Écrins week to MOBILITY_ONLY without touching distant weeks', () => {
    const plan = generateMacroPlan({
      raceDate: new Date('2026-10-11'),
      startDate: new Date('2026-07-13'),
      baselineCtl: 53,
    });

    const patched = applyTravelConstraintsToMacroWeeks(plan.weeks, [
      {
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-06'),
        label: 'Randonnée Les Écrins',
        trainingConstraint: 'MOBILITY_ONLY',
        allowedDisciplines: ['MOBILITY'],
      },
    ]);

    const constrained = patched.filter((w, i) => w.focus !== plan.weeks[i]?.focus);
    expect(constrained.length).toBeGreaterThanOrEqual(1);
    for (const week of constrained) {
      expect(week.targetLoad).toBeLessThanOrEqual(60);
      expect(week.isDeload).toBe(true);
      expect(week.focus).toMatch(/Mobilité|mobilité/i);
      expect(week.focus).toMatch(/Écrins/);
    }

    const [weekJul13] = patched;
    expect(weekJul13?.targetLoad).toBe(plan.weeks[0]?.targetLoad);
    expect(weekJul13?.focus).toBe(plan.weeks[0]?.focus);
  });

  it('requires at least 3 overlapping days', () => {
    const resolved = resolveConstraintForWeek(new Date('2026-07-27'), [
      {
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-06'),
        trainingConstraint: 'MOBILITY_ONLY',
        allowedDisciplines: ['MOBILITY'],
      },
    ]);
    expect(resolved).toBeNull();
  });
});

describe('resolvePlanTargetUnderTravel', () => {
  it('overrides macro target for MOBILITY_ONLY window', () => {
    const result = resolvePlanTargetUnderTravel({
      startDate: new Date('2026-08-03'),
      days: 7,
      targetLoad: 371,
      planFocus: 'Intensité progressive',
      travels: [
        {
          startDate: new Date('2026-08-01'),
          endDate: new Date('2026-08-06'),
          label: 'Écrins',
          trainingConstraint: 'MOBILITY_ONLY',
          allowedDisciplines: ['MOBILITY'],
        },
      ],
    });

    expect(result.constraint).toBe('MOBILITY_ONLY');
    expect(result.targetLoad).toBe(60);
    expect(result.allowedDisciplines).toEqual(['MOBILITY']);
    expect(result.planFocus).toMatch(/Mobilité|mobilité/i);
  });
});
