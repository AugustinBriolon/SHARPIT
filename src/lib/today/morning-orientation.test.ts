import { describe, expect, it } from 'vitest';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import {
  acceptedChoiceKind,
  nightEvidenceReady,
  resolveMorningOrientation,
  sessionChoiceLabel,
  type MorningRecalibrationInput,
} from '@/lib/today/morning-orientation';

function recalibration(
  overrides: Partial<MorningRecalibrationInput> &
    Pick<MorningRecalibrationInput, 'direction' | 'status' | 'changeSummary'>,
): MorningRecalibrationInput {
  return {
    decisionId: 'd1',
    sessionId: 's1',
    why: 'récupération',
    fromIntensity: 'TEMPO',
    toIntensity: 'ENDURANCE',
    fromDurationMin: 45,
    toDurationMin: 45,
    fromLoad: 55,
    toLoad: 41,
    ...overrides,
  };
}

function makeSnapshot(overrides?: {
  adviceActionable?: boolean;
  sleepFreshness?: 'fresh' | 'awaiting_data' | 'syncing' | 'stale' | 'computing';
  recoveryFreshness?: 'fresh' | 'awaiting_data' | 'syncing' | 'stale' | 'computing';
  garminSyncing?: boolean;
}): AthleteSnapshot {
  const sleep = overrides?.sleepFreshness ?? 'fresh';
  const recovery = overrides?.recoveryFreshness ?? 'fresh';
  return {
    snapshotId: 's1',
    athleteId: 'default',
    trainingDayId: '2026-07-21',
    generatedAt: new Date().toISOString(),
    freshness: {
      athleteId: 'default',
      trainingDayId: '2026-07-21',
      computedAt: new Date().toISOString(),
      domains: [
        {
          domain: 'sleep',
          lastUpdatedAt: null,
          freshness: sleep,
          state: sleep,
          productMessage: sleep === 'awaiting_data' ? 'Sommeil pas encore là' : null,
        },
        {
          domain: 'recovery',
          lastUpdatedAt: null,
          freshness: recovery,
          state: recovery,
          productMessage: null,
        },
      ],
      providers: [
        {
          provider: 'garmin',
          connected: true,
          lastSyncAt: new Date().toISOString(),
          stale: false,
          syncing: overrides?.garminSyncing ?? false,
        },
      ],
      overallFresh: sleep === 'fresh' && recovery === 'fresh',
      primaryProductMessage: sleep === 'awaiting_data' ? 'Sommeil pas encore là' : null,
    },
    recovery: null,
    fatigue: null,
    adaptation: null,
    physicalHealth: null,
    dailyStrain: null,
    reasoning: null,
    decision: null,
    readiness: 70,
    sleepScore: 80,
    adaptationIndex: 50,
    adaptationStatus: 'MAINTAINING',
    adaptationTrend: 'STABLE',
    todaysDecision: 'TRAIN_SMART',
    limitingFactor: null,
    confidence: 0.7,
    briefing: null,
    recommendation: null,
    primaryProductMessage: null,
    domainMessages: {
      sleep:
        sleep === 'awaiting_data'
          ? 'Les données de sommeil de la nuit ne sont pas encore arrivées.'
          : undefined,
    },
    adviceActionable: overrides?.adviceActionable ?? true,
    insufficientDataMessage: null,
    effortUnavailableMessage: null,
    confidenceLabel: 'Estimation solide',
    dailyPhase: {
      phase: 'MORNING',
      signals: {
        sessionStatus: 'PLANNED',
        athleteState: 'READY',
        timeOfDay: 'MORNING',
      },
      whyFocus: 'readiness',
    },
    phaseNarrative: null,
    sessionsDoneToday: [],
    plannedToday: [],
  } as unknown as AthleteSnapshot;
}

describe('nightEvidenceReady', () => {
  it('is false when sleep is awaiting', () => {
    expect(nightEvidenceReady(makeSnapshot({ sleepFreshness: 'awaiting_data' }))).toBe(false);
  });

  it('is true when sleep and recovery are fresh', () => {
    expect(nightEvidenceReady(makeSnapshot())).toBe(true);
  });
});

describe('resolveMorningOrientation', () => {
  it('returns EVIDENCE_PENDING without firm actions', () => {
    const r = resolveMorningOrientation({
      phase: 'MORNING',
      snapshot: makeSnapshot({ sleepFreshness: 'awaiting_data' }),
      recalibration: null,
    });
    expect(r?.phase).toBe('EVIDENCE_PENDING');
    expect(r?.heroHeadline).toMatch(/pas encore prête/i);
    expect(r?.showFirmActions).toBe(false);
  });

  it('does not trap on EVIDENCE_PENDING when night proofs are fresh but advice is gated', () => {
    const r = resolveMorningOrientation({
      phase: 'MORNING',
      snapshot: makeSnapshot({ adviceActionable: false }),
      recalibration: null,
    });
    expect(r?.phase).toBe('ORIENTATION_READY');
    expect(r?.showRefreshEvidence).toBe(false);
    expect(r?.showFirmActions).toBe(false);
    expect(r?.heroHeadline).toBeNull();
  });

  it('hides firm actions when there is no recalibration proposal', () => {
    const r = resolveMorningOrientation({
      phase: 'MORNING',
      snapshot: makeSnapshot({ adviceActionable: true }),
      recalibration: null,
    });
    expect(r?.phase).toBe('ORIENTATION_READY');
    expect(r?.showFirmActions).toBe(false);
    expect(r?.holdDecisionId).toBeNull();
    expect(r?.hideHeroConfidence).toBe(false);
  });

  it('hides hero confidence while night evidence is still pending', () => {
    const r = resolveMorningOrientation({
      phase: 'MORNING',
      snapshot: makeSnapshot({ sleepFreshness: 'awaiting_data' }),
      recalibration: null,
    });
    expect(r?.phase).toBe('EVIDENCE_PENDING');
    expect(r?.hideHeroConfidence).toBe(true);
  });

  it('shows firm actions + comparison sides when a DOWN proposal is presented', () => {
    const r = resolveMorningOrientation({
      phase: 'MORNING',
      snapshot: makeSnapshot({ adviceActionable: true }),
      recalibration: recalibration({
        direction: 'DOWN',
        changeSummary: 'Tempo → Endurance',
        status: 'PRESENTED',
      }),
    });
    expect(r?.showFirmActions).toBe(true);
    expect(r?.confirmEase?.decisionId).toBe('d1');
    expect(r?.confirmEase?.current).toEqual({
      intensityLabel: 'Tempo',
      durationMin: 45,
      load: 55,
    });
    expect(r?.confirmEase?.proposed).toEqual({
      intensityLabel: 'Endurance',
      durationMin: 45,
      load: 41,
    });
    expect(r?.holdDecisionId).toBe('d1');
  });

  it('keeps day verdict on ACCEPTED — annotates session only', () => {
    const r = resolveMorningOrientation({
      phase: 'MORNING',
      snapshot: makeSnapshot(),
      recalibration: recalibration({
        direction: 'UP',
        changeSummary: 'Endurance → Tempo · charge 25 → 28',
        why: 'ressenti',
        status: 'ACCEPTED',
        fromIntensity: 'ENDURANCE',
        toIntensity: 'TEMPO',
        fromLoad: 25,
        toLoad: 28,
      }),
    });
    expect(r?.phase).toBe('POST_CHOICE');
    expect(r?.heroHeadline).toBeNull();
    expect(r?.sessionChoice?.kind).toBe('INCREASE_CONFIRMED');
    expect(r?.sessionChoice?.label).toBe('Hausse confirmée');
    expect(r?.sessionChoice?.label).not.toMatch(/allègement/i);
  });

  it('labels DOWN accept as allègement on the session', () => {
    const r = resolveMorningOrientation({
      phase: 'MORNING',
      snapshot: makeSnapshot(),
      recalibration: recalibration({
        direction: 'DOWN',
        changeSummary: 'Tempo → Endurance',
        status: 'ACCEPTED',
      }),
    });
    expect(r?.sessionChoice?.label).toBe('Allègement confirmé');
    expect(r?.heroHeadline).toBeNull();
  });

  it('exposes confirmIncrease for UP proposals', () => {
    const r = resolveMorningOrientation({
      phase: 'MORNING',
      snapshot: makeSnapshot({ adviceActionable: true }),
      recalibration: recalibration({
        direction: 'UP',
        changeSummary: 'Endurance → Tempo',
        why: 'ressenti',
        status: 'PRESENTED',
        fromIntensity: 'ENDURANCE',
        toIntensity: 'TEMPO',
      }),
    });
    expect(r?.confirmEase).toBeNull();
    expect(r?.confirmIncrease?.decisionId).toBe('d1');
    expect(r?.confirmIncrease?.proposed.intensityLabel).toBe('Tempo');
  });
});

describe('sessionChoiceLabel', () => {
  it('distinguishes ease vs increase', () => {
    expect(sessionChoiceLabel(acceptedChoiceKind('DOWN'))).toBe('Allègement confirmé');
    expect(sessionChoiceLabel(acceptedChoiceKind('UP'))).toBe('Hausse confirmée');
  });
});
