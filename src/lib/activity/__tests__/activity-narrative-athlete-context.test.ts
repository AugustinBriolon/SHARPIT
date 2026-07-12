import { describe, expect, it } from 'vitest';
import {
  buildPhysicalConditionFacts,
  buildRecoveryContextFacts,
  buildThresholdPerformanceFacts,
  buildTrainingLoadFacts,
  type NarrativeHealthRow,
} from '@/lib/activity-narrative-athlete-context';

describe('activity-narrative-athlete-context', () => {
  it('surfaces sleep debt and low readiness trend', () => {
    const activityDate = new Date('2026-07-12T08:00:00Z');
    const health: NarrativeHealthRow[] = [
      {
        date: new Date('2026-07-11'),
        sleepMinutes: 330,
        hrv: 42,
        restingHr: 54,
        recoveryScore: 38,
        readinessLevel: 'LOW',
        hrvStatus: 'LOW',
        bodyBattery: 35,
      },
      {
        date: new Date('2026-07-10'),
        sleepMinutes: 360,
        hrv: 45,
        restingHr: 53,
        recoveryScore: 45,
        readinessLevel: 'LOW',
        hrvStatus: 'LOW',
        bodyBattery: 40,
      },
      {
        date: new Date('2026-07-09'),
        sleepMinutes: 350,
        hrv: 44,
        restingHr: 52,
        recoveryScore: 42,
        readinessLevel: 'LOW',
        hrvStatus: 'LOW',
        bodyBattery: 38,
      },
      {
        date: new Date('2026-07-01'),
        sleepMinutes: 420,
        hrv: 58,
        restingHr: 48,
        recoveryScore: 72,
        readinessLevel: 'HIGH',
        hrvStatus: 'BALANCED',
        bodyBattery: 70,
      },
    ];

    const lines = buildRecoveryContextFacts(activityDate, health);
    expect(lines.some((l) => l.includes('readiness 38/100'))).toBe(true);
    expect(lines.some((l) => l.includes('Dette de sommeil'))).toBe(true);
    expect(lines.some((l) => l.includes('Readiness en baisse'))).toBe(true);
  });

  it('compares run performance to personal thresholds', () => {
    const lines = buildThresholdPerformanceFacts(
      {
        type: 'RUN',
        duration: 5400,
        load: 85,
        runMetrics: { paceSecPerKm: 360, avgHr: 162, avgPower: null },
        bikeMetrics: null,
        weather: null,
      },
      { ftpW: 250, lthr: 182, maxHr: 195, runThresholdPaceSecPerKm: 295 },
    );

    expect(lines.some((l) => l.includes('LTHR'))).toBe(true);
    expect(lines.some((l) => l.includes('allure seuil'))).toBe(true);
    expect(lines.some((l) => l.includes('89% LTHR'))).toBe(true);
  });

  it('lists active physical conditions with severity', () => {
    const lines = buildPhysicalConditionFacts([
      {
        id: 'n1',
        category: 'PAIN',
        title: 'Sciatique',
        bodyPart: 'Ischio',
        side: 'LEFT',
        severity: 7,
        status: 'ACTIVE',
        description: 'Douleur en flexion',
        affectsTraining: true,
        checkins: [
          { severity: 7, date: new Date('2026-07-11') },
          { severity: 5, date: new Date('2026-07-05') },
        ],
      },
    ]);

    expect(lines[0]).toContain('Sciatique');
    expect(lines[0]).toContain('sévérité 7/10');
    expect(lines[0]).toContain('aggravation');
  });

  it('computes weekly load at session date', () => {
    const activityDate = new Date('2026-07-12T12:00:00Z');
    const lines = buildTrainingLoadFacts(activityDate, [
      { date: new Date('2026-07-11'), load: 60 },
      { date: new Date('2026-07-10'), load: 45 },
      { date: new Date('2026-07-08'), load: 90 },
      { date: new Date('2026-06-01'), load: 30 },
    ]);

    expect(lines.some((l) => l.includes('Charge 7 jours'))).toBe(true);
    expect(lines.some((l) => l.includes('ACWR'))).toBe(true);
  });
});
