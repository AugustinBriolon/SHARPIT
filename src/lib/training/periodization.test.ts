import { addWeeks } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { findPlanWeekForDate, generateMacroPlan } from './periodization';

const START = new Date('2026-01-05T00:00:00'); // un lundi

describe('generateMacroPlan', () => {
  it("génère une semaine par semaine jusqu'à la course incluse", () => {
    const raceDate = addWeeks(START, 11); // 12 semaines
    const plan = generateMacroPlan({ raceDate, startDate: START, baselineCtl: 50 });
    expect(plan.totalWeeks).toBe(12);
    expect(plan.weeks).toHaveLength(12);
    expect(plan.weeks[0].weekIndex).toBe(0);
  });

  it('termine toujours par une semaine de course et un taper avant', () => {
    const plan = generateMacroPlan({
      raceDate: addWeeks(START, 15),
      startDate: START,
      baselineCtl: 45,
    });
    const phases = plan.weeks.map((w) => w.phase);
    expect(phases[phases.length - 1]).toBe('RACE');
    expect(phases).toContain('TAPER');
    expect(phases).toContain('BASE');
    expect(phases).toContain('BUILD');
  });

  it('borne la charge cible et réduit pendant le taper', () => {
    const plan = generateMacroPlan({
      raceDate: addWeeks(START, 11),
      startDate: START,
      baselineCtl: 60,
    });
    for (const w of plan.weeks) {
      expect(w.targetLoad).toBeGreaterThanOrEqual(20);
      expect(w.targetLoad).toBeLessThanOrEqual(900);
    }
    const peak = plan.weeks.find((w) => w.phase === 'PEAK')?.targetLoad ?? 0;
    const race = plan.weeks.find((w) => w.phase === 'RACE')?.targetLoad ?? 0;
    expect(race).toBeLessThan(peak);
  });

  it('lève une erreur si la course est dans le passé', () => {
    expect(() =>
      generateMacroPlan({
        raceDate: addWeeks(START, -2),
        startDate: START,
        baselineCtl: 40,
      }),
    ).toThrow();
  });
});

describe('findPlanWeekForDate', () => {
  it('retrouve la semaine contenant la date', () => {
    const plan = generateMacroPlan({
      raceDate: addWeeks(START, 11),
      startDate: START,
      baselineCtl: 50,
    });
    const target = addWeeks(START, 3);
    const week = findPlanWeekForDate(plan.weeks, target);
    expect(week?.weekIndex).toBe(3);
  });

  it('renvoie undefined hors plan', () => {
    const plan = generateMacroPlan({
      raceDate: addWeeks(START, 5),
      startDate: START,
      baselineCtl: 50,
    });
    expect(findPlanWeekForDate(plan.weeks, addWeeks(START, 40))).toBeUndefined();
  });
});
