import { describe, expect, it } from 'vitest';
import {
  applyPlausibilityToEffect,
  buildJournalHabitFindings,
  collapseRedundantRecoveryFindings,
  compileJournalHabitFindings,
  compareFactorOutcome,
  dropContradictoryFactorFindings,
  median,
  outcomeLagDays,
  scoreObservationConfidence,
  shiftTrainingDayId,
  type FactorOutcomeEffect,
  type JournalAnalysisDay,
  type JournalHabitFinding,
} from '@sharpit/server/lib/journal/journal-habit-analysis';

function day(
  id: string,
  factor: 'yes' | 'no' | null,
  sleep: number | null,
  {
    recovery = 60,
    factorId = 'device_in_bed',
  }: { recovery?: number | null; factorId?: string } = {},
): JournalAnalysisDay {
  return {
    trainingDayId: id,
    factors: factor === null ? {} : { [factorId]: factor },
    sleepMinutes: sleep,
    recoveryScore: recovery,
    bodyBattery: recovery,
  };
}

describe('journal-habit-analysis', () => {
  it('uses median and prior-night lag 0 for screen / late meal', () => {
    expect(median([10, 30, 20])).toBe(20);
    expect(outcomeLagDays('device_in_bed', 'sleepMinutes')).toBe(0);
    expect(outcomeLagDays('late_meal', 'sleepMinutes')).toBe(0);
    expect(outcomeLagDays('shared_bed', 'sleepMinutes')).toBe(0);
    expect(outcomeLagDays('melatonin', 'sleepMinutes')).toBe(0);
    expect(outcomeLagDays('alcohol', 'sleepMinutes')).toBe(1);
  });

  it('compares median sleep with vs without habit (association)', () => {
    const days = [
      day('2026-09-01', 'yes', 360),
      day('2026-09-02', 'yes', 350),
      day('2026-09-03', 'yes', 370),
      day('2026-09-04', 'yes', 340),
      day('2026-09-05', 'yes', 355),
      day('2026-09-06', 'yes', 365),
      day('2026-09-07', 'no', 480),
      day('2026-09-08', 'no', 470),
      day('2026-09-09', 'no', 490),
      day('2026-09-10', 'no', 460),
      day('2026-09-11', 'no', 475),
      day('2026-09-12', 'no', 485),
    ];
    const result = compareFactorOutcome(days, 'device_in_bed', 'sleepMinutes');
    expect(result).not.toBeNull();
    expect(result!.medianYes).toBeLessThan(result!.medianNo);
    expect(result!.polarity).toBe('minus');
    expect(result!.nYes).toBe(6);
    expect(result!.nNo).toBe(6);
    expect(result!.confidence).toBe('high');
  });

  it('applies alcohol lag +1 against next-day sleep', () => {
    const days: JournalAnalysisDay[] = [
      {
        trainingDayId: '2026-09-01',
        factors: { alcohol: 'yes' },
        sleepMinutes: 500,
        recoveryScore: 80,
        bodyBattery: 80,
      },
      {
        trainingDayId: '2026-09-02',
        factors: { alcohol: 'no' },
        sleepMinutes: 340,
        recoveryScore: 40,
        bodyBattery: 40,
      },
      {
        trainingDayId: '2026-09-03',
        factors: { alcohol: 'yes' },
        sleepMinutes: 490,
        recoveryScore: 78,
        bodyBattery: 78,
      },
      {
        trainingDayId: '2026-09-04',
        factors: { alcohol: 'no' },
        sleepMinutes: 350,
        recoveryScore: 42,
        bodyBattery: 42,
      },
      {
        trainingDayId: '2026-09-05',
        factors: { alcohol: 'yes' },
        sleepMinutes: 480,
        recoveryScore: 76,
        bodyBattery: 76,
      },
      {
        trainingDayId: '2026-09-06',
        factors: { alcohol: 'no' },
        sleepMinutes: 360,
        recoveryScore: 44,
        bodyBattery: 44,
      },
      {
        trainingDayId: '2026-09-07',
        factors: { alcohol: 'yes' },
        sleepMinutes: 470,
        recoveryScore: 74,
        bodyBattery: 74,
      },
      {
        trainingDayId: '2026-09-08',
        factors: { alcohol: 'no' },
        sleepMinutes: 330,
        recoveryScore: 40,
        bodyBattery: 40,
      },
      {
        trainingDayId: '2026-09-09',
        factors: { alcohol: 'yes' },
        sleepMinutes: 460,
        recoveryScore: 72,
        bodyBattery: 72,
      },
      {
        trainingDayId: '2026-09-10',
        factors: { alcohol: 'no' },
        sleepMinutes: 345,
        recoveryScore: 41,
        bodyBattery: 41,
      },
    ];
    // Alcohol yes on odd evenings → next morning sleep is low (even days).
    const result = compareFactorOutcome(days, 'alcohol', 'sleepMinutes');
    expect(shiftTrainingDayId('2026-09-01', 1)).toBe('2026-09-02');
    expect(result).not.toBeNull();
    expect(result!.lagDays).toBe(1);
    expect(result!.medianYes).toBeLessThan(result!.medianNo);
  });

  it('scores high confidence only with enough samples and clear gap', () => {
    expect(
      scoreObservationConfidence({
        nYes: 2,
        nNo: 2,
        absDelta: 50,
        outcome: 'sleepMinutes',
      }),
    ).toBe('none');

    expect(
      scoreObservationConfidence({
        nYes: 3,
        nNo: 3,
        absDelta: 90,
        outcome: 'sleepMinutes',
      }),
    ).toBe('none');

    expect(
      scoreObservationConfidence({
        nYes: 6,
        nNo: 6,
        absDelta: 90,
        outcome: 'sleepMinutes',
      }),
    ).toBe('high');
  });

  it('emits multiple outcomes, skips constants, collapses recovery/BB redundancy', () => {
    const days: JournalAnalysisDay[] = [];
    for (let i = 0; i < 12; i += 1) {
      const screen = i < 6 ? 'yes' : 'no';
      days.push({
        trainingDayId: `2026-09-${String(i + 1).padStart(2, '0')}`,
        factors: {
          device_in_bed: screen,
          creatine: 'yes',
          alcohol: 'no',
        },
        sleepMinutes: screen === 'yes' ? 340 + i : 480 + i,
        recoveryScore: screen === 'yes' ? 40 + i : 75 + i,
        bodyBattery: screen === 'yes' ? 41 + i : 76 + i,
      });
    }

    const findings = buildJournalHabitFindings(days);
    expect(findings.every((f) => f.kind === 'effect')).toBe(true);
    expect(findings.some((f) => f.factorId === 'creatine')).toBe(false);
    expect(findings.some((f) => f.factorId === 'alcohol')).toBe(false);

    const screenFindings = findings.filter((f) => f.factorId === 'device_in_bed');
    expect(screenFindings.some((f) => f.outcome === 'sleepMinutes')).toBe(true);
    const recoveryLike = screenFindings.filter(
      (f) => f.outcome === 'recoveryScore' || f.outcome === 'bodyBattery',
    );
    expect(recoveryLike.length).toBeLessThanOrEqual(1);

    const redundant: JournalHabitFinding[] = [
      {
        kind: 'effect',
        yesValues: [],
        noValues: [],
        factorId: 'device_in_bed',
        outcome: 'recoveryScore',
        nYes: 5,
        nNo: 5,
        medianYes: 40,
        medianNo: 70,
        absDelta: 30,
        polarity: 'minus',
        confidence: 'high',
        lagDays: 0,
      },
      {
        kind: 'effect',
        yesValues: [],
        noValues: [],
        factorId: 'device_in_bed',
        outcome: 'bodyBattery',
        nYes: 5,
        nNo: 5,
        medianYes: 42,
        medianNo: 68,
        absDelta: 26,
        polarity: 'minus',
        confidence: 'high',
        lagDays: 0,
      },
    ];
    expect(collapseRedundantRecoveryFindings(redundant)).toHaveLength(1);
  });

  it('compiles sleep + recovery for the same habit into one row', () => {
    const findings: JournalHabitFinding[] = [
      {
        kind: 'effect',
        yesValues: [],
        noValues: [],
        factorId: 'device_in_bed',
        outcome: 'sleepMinutes',
        nYes: 5,
        nNo: 5,
        medianYes: 360,
        medianNo: 470,
        absDelta: 110,
        polarity: 'minus',
        confidence: 'high',
        lagDays: 0,
      },
      {
        kind: 'effect',
        yesValues: [],
        noValues: [],
        factorId: 'device_in_bed',
        outcome: 'recoveryScore',
        nYes: 5,
        nNo: 5,
        medianYes: 40,
        medianNo: 70,
        absDelta: 30,
        polarity: 'minus',
        confidence: 'high',
        lagDays: 0,
      },
      {
        kind: 'effect',
        yesValues: [],
        noValues: [],
        factorId: 'yoga',
        outcome: 'recoveryScore',
        nYes: 5,
        nNo: 5,
        medianYes: 75,
        medianNo: 55,
        absDelta: 20,
        polarity: 'plus',
        confidence: 'high',
        lagDays: 0,
      },
    ];

    const compiled = compileJournalHabitFindings(findings);
    expect(compiled).toHaveLength(2);
    const screen = compiled.find((item) => item.factorId === 'device_in_bed');
    expect(screen?.effects).toHaveLength(2);
    expect(screen?.polarity).toBe('minus');
    expect(compiled.some((item) => item.factorId === 'yoga' && item.polarity === 'plus')).toBe(
      true,
    );
  });

  it('keeps the per-day values behind each median', () => {
    const days = [
      day('2026-09-01', 'yes', 360),
      day('2026-09-02', 'yes', 350),
      day('2026-09-03', 'yes', 370),
      day('2026-09-04', 'no', 480),
      day('2026-09-05', 'no', 470),
      day('2026-09-06', 'no', 490),
    ];

    const effect = compareFactorOutcome(days, 'device_in_bed', 'sleepMinutes');

    expect(effect?.yesValues).toEqual([360, 350, 370]);
    expect(effect?.noValues).toEqual([480, 470, 490]);
    expect(effect?.medianYes).toBe(360);
  });

  it('suppresses short-sample probiotic sleep contrasts via plausibility', () => {
    const base: FactorOutcomeEffect = {
      factorId: 'probiotic',
      outcome: 'sleepMinutes',
      nYes: 4,
      nNo: 3,
      medianYes: 360,
      medianNo: 416,
      yesValues: [360, 350, 370, 355],
      noValues: [400, 416, 430],
      absDelta: 56,
      polarity: 'minus',
      confidence: 'medium',
      lagDays: 0,
    };
    expect(applyPlausibilityToEffect(base)).toBeNull();

    const solid = applyPlausibilityToEffect({
      ...base,
      nYes: 6,
      nNo: 6,
      confidence: 'high',
    });
    expect(solid?.confidence).toBe('medium');
  });

  it('drops a habit that both lifts and drags outcomes', () => {
    const findings: JournalHabitFinding[] = [
      {
        kind: 'effect',
        yesValues: [],
        noValues: [],
        factorId: 'probiotic',
        outcome: 'sleepMinutes',
        nYes: 6,
        nNo: 6,
        medianYes: 360,
        medianNo: 416,
        absDelta: 56,
        polarity: 'minus',
        confidence: 'medium',
        lagDays: 0,
      },
      {
        kind: 'effect',
        yesValues: [],
        noValues: [],
        factorId: 'probiotic',
        outcome: 'recoveryScore',
        nYes: 6,
        nNo: 6,
        medianYes: 70,
        medianNo: 31,
        absDelta: 39,
        polarity: 'plus',
        confidence: 'medium',
        lagDays: 0,
      },
      {
        kind: 'effect',
        yesValues: [],
        noValues: [],
        factorId: 'late_meal',
        outcome: 'sleepMinutes',
        nYes: 6,
        nNo: 6,
        medianYes: 400,
        medianNo: 460,
        absDelta: 60,
        polarity: 'minus',
        confidence: 'high',
        lagDays: 0,
      },
    ];

    const { kept, incoherentFactorIds } = dropContradictoryFactorFindings(findings);
    expect(incoherentFactorIds).toEqual(['probiotic']);
    expect(kept.map((f) => f.factorId)).toEqual(['late_meal']);
  });
});
