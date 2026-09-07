import { describe, expect, it } from 'vitest';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import {
  buildPlanTrajectoryPreviews,
  buildSignalPreviews,
  pickTodayResumeSignalPreviews,
  type SignalPreviewScores,
} from './signal-previews';

const DAY = new Date('2026-07-03T12:00:00');

const SCORES: SignalPreviewScores = {
  sleepScore: 86,
  recoveryScore: 68,
  effortScore: 5.8,
  adaptationScore: 54,
  adaptationUnavailableCaption: null,
  effortUnavailableCaption: null,
};

function snapshot(partial: Partial<AthleteSnapshot> = {}): AthleteSnapshot {
  return {
    snapshotId: 's1',
    athleteId: 'a1',
    trainingDayId: '2026-07-03',
    generatedAt: DAY.toISOString(),
    freshness: {} as AthleteSnapshot['freshness'],
    recovery: null,
    fatigue: null,
    adaptation: null,
    physicalHealth: null,
    dailyStrain: null,
    reasoning: null,
    decision: null,
    readiness: 68,
    sleepScore: 86,
    adaptationIndex: 54,
    adaptationStatus: 'MAINTAINING',
    adaptationTrend: 'STABLE',
    ...partial,
  } as AthleteSnapshot;
}

describe('buildSignalPreviews', () => {
  it('builds a sleep gauge with status, baseline band, and deep-sleep detail', () => {
    const entries = [
      {
        date: DAY,
        sleepMinutes: 452,
        sleepDeepMin: 90,
        sleepRemMin: 90,
        sleepLightMin: 240,
        sleepAwakeMin: 20,
      },
      ...Array.from({ length: 5 }, (_, i) => ({
        date: new Date(DAY.getTime() - (i + 1) * 86_400_000),
        sleepMinutes: 420,
        sleepDeepMin: 55,
        sleepRemMin: 80,
      })),
    ];

    const previews = buildSignalPreviews({
      day: DAY,
      scores: SCORES,
      snapshot: snapshot(),
      healthEntries: entries,
    });

    const sleep = previews.find((p) => p.key === 'sleep');
    expect(sleep?.subtitle).toBe('Nuit dernière · 7h 32m');
    expect(sleep?.scoreDisplay).toBe('86');
    expect(sleep?.visual.kind).toBe('gauge');
    if (sleep?.visual.kind === 'gauge') {
      expect(sleep.visual.score).toBe(86);
      expect(sleep.visual.statusLabel).toBe('Sommeil excellent');
      expect(sleep.visual.baselineTitle).toMatch(/moyenne/i);
      expect(sleep.visual.baselineDetail).toMatch(/sommeil profond/i);
      expect(sleep.visual.trend).toBeTruthy();
    }
  });

  it('omits gauge enrichment when sleep score is missing', () => {
    const previews = buildSignalPreviews({
      day: DAY,
      scores: { ...SCORES, sleepScore: null },
      snapshot: snapshot(),
      healthEntries: [{ date: DAY, sleepMinutes: 400 }],
    });

    expect(previews.find((p) => p.key === 'sleep')?.visual).toEqual({ kind: 'none' });
  });

  it('builds a recovery gauge with HRV baseline band when enough points exist', () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      date: new Date(DAY.getTime() - (4 - i) * 86_400_000),
      hrv: 40 + i * 5,
    }));

    const previews = buildSignalPreviews({
      day: DAY,
      scores: SCORES,
      snapshot: snapshot({
        recovery: {
          readinessCategory: 'ADEQUATE',
          primaryLimitingFactor: null,
        } as AthleteSnapshot['recovery'],
      }),
      healthEntries: entries,
    });

    const recovery = previews.find((p) => p.key === 'recovery');
    expect(recovery?.subtitle).toBe('État du jour');
    expect(recovery?.visual.kind).toBe('gauge');
    if (recovery?.visual.kind === 'gauge') {
      expect(recovery.visual.statusLabel).toBe('Récupération correcte');
      expect(recovery.visual.baselineTitle).toMatch(/baseline/i);
      expect(recovery.visual.trend).toBe('up');
    }
  });

  it('surfaces recovery limiter subtitle when readiness is low', () => {
    const previews = buildSignalPreviews({
      day: DAY,
      scores: { ...SCORES, recoveryScore: 42 },
      snapshot: snapshot({
        recovery: {
          readinessCategory: 'LOW',
          primaryLimitingFactor: 'autonomic',
        } as AthleteSnapshot['recovery'],
      }),
      healthEntries: [],
    });

    const recovery = previews.find((p) => p.key === 'recovery');
    expect(recovery?.subtitle).toBe('Frein · VFC');
    expect(recovery?.visual.kind).toBe('gauge');
    if (recovery?.visual.kind === 'gauge') {
      expect(recovery.visual.statusLabel).toBe('Récupération réduite');
    }
  });

  it('builds an adaptation spectrum with status and trend', () => {
    const previews = buildSignalPreviews({
      day: DAY,
      scores: SCORES,
      snapshot: snapshot({
        adaptationStatus: 'POSITIVELY_ADAPTING',
        adaptationTrend: 'IMPROVING',
      }),
      healthEntries: [],
    });

    const adaptation = previews.find((p) => p.key === 'adaptation');
    expect(adaptation?.visual).toEqual({ kind: 'spectrum', position: 54 });
    expect(adaptation?.subtitle).toBe('Progression · En progression');
  });

  it('builds a battery spark for charge with dominant contributor', () => {
    const entries = Array.from({ length: 4 }, (_, i) => ({
      date: new Date(DAY.getTime() - (3 - i) * 86_400_000),
      bodyBattery: 30 + i * 10,
    }));

    const previews = buildSignalPreviews({
      day: DAY,
      scores: SCORES,
      snapshot: snapshot({
        dailyStrain: {
          available: true,
          strainScore: 5.8,
          dominantContributor: 'TRAINING',
        } as AthleteSnapshot['dailyStrain'],
      }),
      healthEntries: entries,
    });

    const effort = previews.find((p) => p.key === 'effort');
    expect(effort?.scoreDisplay).toBe('5,8');
    expect(effort?.subtitle).toBe('Entraînement');
    expect(effort?.visual.kind).toBe('spark');
  });

  it('falls back without inventing visuals when series are empty', () => {
    const previews = buildSignalPreviews({
      day: DAY,
      scores: {
        sleepScore: null,
        recoveryScore: null,
        effortScore: null,
        adaptationScore: null,
        adaptationUnavailableCaption: 'Historique insuffisant',
        effortUnavailableCaption: null,
      },
      snapshot: snapshot({
        adaptationStatus: 'INSUFFICIENT_DATA',
        adaptationTrend: null,
        adaptationIndex: null,
      }),
      healthEntries: [],
    });

    expect(previews.every((p) => p.visual.kind === 'none' || p.key === 'adaptation')).toBe(true);
    expect(previews.find((p) => p.key === 'adaptation')?.subtitle).toBe('Historique insuffisant');
    expect(previews.find((p) => p.key === 'adaptation')?.visual).toEqual({ kind: 'none' });
  });

  it('picks only overnight signals for the Today résumé', () => {
    const previews = buildSignalPreviews({
      day: DAY,
      scores: SCORES,
      snapshot: snapshot(),
      healthEntries: [],
    });
    expect(pickTodayResumeSignalPreviews(previews).map((p) => p.key)).toEqual([
      'sleep',
      'recovery',
    ]);
  });
});

describe('buildPlanTrajectoryPreviews', () => {
  it('exposes adaptation + charge spectra from the snapshot alone', () => {
    const previews = buildPlanTrajectoryPreviews(
      snapshot({
        adaptationStatus: 'POSITIVELY_ADAPTING',
        adaptationTrend: 'IMPROVING',
        dailyStrain: {
          available: true,
          strainScore: 6.2,
          dominantContributor: 'CARDIOVASCULAR',
        } as AthleteSnapshot['dailyStrain'],
      }),
    );

    expect(previews.map((p) => p.key)).toEqual(['adaptation', 'effort']);
    expect(previews[0]?.visual).toEqual({ kind: 'spectrum', position: 54 });
    expect(previews[1]?.scoreDisplay).toBe('6,2');
    expect(previews[1]?.visual.kind).toBe('spectrum');
    expect(previews[1]?.subtitle).toBe('Cardiovasculaire');
  });
});
