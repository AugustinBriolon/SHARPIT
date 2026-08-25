import { describe, expect, it } from 'vitest';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { withDemoSnapshotFreshness } from '@/lib/demo/demo-presentation';
import { resolveMorningOrientation } from '@/lib/today/morning-orientation';

function awaitingSleepSnapshot(): AthleteSnapshot {
  return {
    snapshotId: 'demo',
    athleteId: 'demo-athlete',
    trainingDayId: '2026-08-25',
    generatedAt: new Date().toISOString(),
    freshness: {
      athleteId: 'demo-athlete',
      trainingDayId: '2026-08-25',
      computedAt: new Date().toISOString(),
      domains: [
        {
          domain: 'sleep',
          lastUpdatedAt: null,
          freshness: 'awaiting_data',
          state: 'awaiting_data',
          productMessage: 'Les données de sommeil de la nuit ne sont pas encore arrivées.',
        },
        {
          domain: 'recovery',
          lastUpdatedAt: null,
          freshness: 'awaiting_data',
          state: 'awaiting_data',
          productMessage: 'En attente des signaux de récupération (sommeil, VFC).',
        },
      ],
      providers: [
        {
          provider: 'garmin',
          connected: true,
          lastSyncAt: new Date().toISOString(),
          stale: false,
          syncing: false,
        },
      ],
      overallFresh: false,
      primaryProductMessage: 'Les données de sommeil de la nuit ne sont pas encore arrivées.',
    },
    recovery: null,
    fatigue: null,
    adaptation: null,
    physicalHealth: null,
    environment: null,
    decision: null,
    dailyPhase: {
      phase: 'MORNING',
      whyFocus: 'readiness',
      signals: { sessionStatus: 'PLANNED_TODAY' },
    },
    adviceActionable: true,
    confidence: 0.72,
    confidenceLabel: 'Modérée',
    domainMessages: {
      sleep: 'Les données de sommeil de la nuit ne sont pas encore arrivées.',
      recovery: 'En attente des signaux de récupération (sommeil, VFC).',
    },
  } as unknown as AthleteSnapshot;
}

describe('withDemoSnapshotFreshness', () => {
  it('forces sleep and recovery fresh so demo never lands in EVIDENCE_PENDING', () => {
    const patched = withDemoSnapshotFreshness(awaitingSleepSnapshot());
    const orientation = resolveMorningOrientation({
      phase: 'MORNING',
      snapshot: patched,
      recalibration: null,
    });

    expect(patched.freshness.domains.find((d) => d.domain === 'sleep')?.freshness).toBe('fresh');
    expect(patched.domainMessages.sleep).toBeUndefined();
    expect(orientation?.phase).not.toBe('EVIDENCE_PENDING');
    expect(orientation?.showRefreshEvidence).toBe(false);
  });
});
