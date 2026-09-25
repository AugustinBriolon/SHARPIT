/**
 * DEVELOPER PLATFORM — Determinism Integration Tests
 *
 * Proves that the Feature Extraction Layer is deterministic:
 *   Given the same observation history, two independent replay runs
 *   must produce IDENTICAL feature value checksums.
 *
 * Core invariant:
 *   checksum(featureData, run1) === checksum(featureData, run2)
 *
 * What is checked:
 *   - Session TSS, method, confidence, sport-specific fields
 *   - Load features: acute/chronic load, ACWR, monotony, strain
 *   - Recovery features: sleep, HRV, RHR
 *   - Condition features: active count, severity
 *
 * What is NOT checked (intentionally volatile):
 *   - record.id (new UUID per run — expected to differ)
 *   - record.computedAt (timestamp — expected to differ)
 *   - record.version (monotonically increasing — may differ if state resets)
 *
 * Infrastructure:
 *   - InMemoryObservationRepository (no Prisma)
 *   - InMemoryFeatureRepository (no Prisma)
 *   - Static ExtractionContextProvider (deterministic context)
 *   - ReplayEngine with mode='dry-run'
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryObservationRepository } from '@/infrastructure/dev/in-memory-observation-repository';
import { ReplayEngine } from '../replay-engine';
import type { ExtractionContextProvider } from '@/core/features/engine';
import type { ExtractionContext } from '@/core/features/context';
import type {
  SessionObservation,
  SleepObservation,
  HrvObservation,
  RestingHrObservation,
  PhysicalConditionObservation,
} from '@/core/observation/types';
import { InMemoryFeatureRepository } from '@/infrastructure/dev/in-memory-feature-repository';
import { FeatureExplorer } from '../feature-explorer';
import { checksumFeatureData } from '../checksum';

// ─────────────────────────────────────────────────────────────────────────────
// Static context provider for tests
// ─────────────────────────────────────────────────────────────────────────────

const ATHLETE_ID = 'test-athlete-001';

const TEST_CONTEXT: ExtractionContext = {
  athleteId: ATHLETE_ID,
  trainingDayId: '', // overridden per-call
  timezone: 'UTC',
  ftpW: 250,
  maxHr: 185,
  restingHr: 48,
  lthr: 160,
  runThresholdPaceSecPerKm: 270, // 4:30/km threshold
  sleepTargetMinutes: 480,
};

class StaticContextProvider implements ExtractionContextProvider {
  async getContext(athleteId: string, trainingDayId: string): Promise<ExtractionContext> {
    return { ...TEST_CONTEXT, athleteId, trainingDayId };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Observation fixture builders
// ─────────────────────────────────────────────────────────────────────────────

let idCounter = 0;
function nextId() {
  return `obs-${String(++idCounter).padStart(4, '0')}`;
}

function mkSession(
  trainingDayId: string,
  overrides: Partial<SessionObservation> = {},
): SessionObservation {
  const ts = new Date(`${trainingDayId}T09:00:00Z`);
  return {
    id: nextId(),
    athleteId: ATHLETE_ID,
    type: 'SESSION',
    source: 'GARMIN',
    timestamp: ts,
    receivedAt: ts,
    normalizedAt: ts,
    trainingDayId,
    quality: 'MEASURED_DIRECT',
    qualityFlags: [],
    sportType: 'RUN',
    durationSec: 3600,
    externalId: `ext-${trainingDayId}-run`,
    ...overrides,
  } as SessionObservation;
}

function mkBikeSession(trainingDayId: string): SessionObservation {
  const ts = new Date(`${trainingDayId}T07:00:00Z`);
  return {
    id: nextId(),
    athleteId: ATHLETE_ID,
    type: 'SESSION',
    source: 'GARMIN',
    timestamp: ts,
    receivedAt: ts,
    normalizedAt: ts,
    trainingDayId,
    quality: 'MEASURED_DIRECT',
    qualityFlags: [],
    sportType: 'BIKE',
    durationSec: 5400,
    externalId: `ext-${trainingDayId}-bike`,
    powerData: {
      avgWatts: 200,
      normalizedPower: 220,
      intensityFactor: 0.88,
      quality: 'MEASURED_DIRECT',
    },
    hrData: {
      avgBpm: 155,
      maxBpm: 178,
      quality: 'MEASURED_OPTICAL',
    },
    elevationM: 850,
  } as SessionObservation;
}

function mkSleep(trainingDayId: string, totalMinutes = 420): SleepObservation {
  const bedtime = new Date(`${trainingDayId}T22:30:00Z`);
  const wake = new Date(`${trainingDayId}T06:30:00Z`);
  wake.setUTCDate(wake.getUTCDate() + 1);

  return {
    id: nextId(),
    athleteId: ATHLETE_ID,
    type: 'SLEEP',
    source: 'GARMIN',
    timestamp: bedtime,
    receivedAt: bedtime,
    normalizedAt: bedtime,
    trainingDayId,
    quality: 'MEASURED_OPTICAL',
    qualityFlags: ['OPTICAL_SENSOR'],
    totalMinutes,
    deepMin: Math.round(totalMinutes * 0.2),
    remMin: Math.round(totalMinutes * 0.25),
    lightMin: Math.round(totalMinutes * 0.5),
    awakeMin: Math.round(totalMinutes * 0.05),
    bedtimeMinFromMidnight: 22 * 60 + 30,
    wakeMinFromMidnight: 6 * 60 + 30,
    wakeTimestamp: wake,
  } as SleepObservation;
}

function mkHrv(trainingDayId: string, rmssd: number): HrvObservation {
  const ts = new Date(`${trainingDayId}T06:00:00Z`);
  return {
    id: nextId(),
    athleteId: ATHLETE_ID,
    type: 'HRV',
    source: 'GARMIN',
    timestamp: ts,
    receivedAt: ts,
    normalizedAt: ts,
    trainingDayId,
    quality: 'MEASURED_OPTICAL',
    qualityFlags: ['OPTICAL_SENSOR'],
    valueMsRmssd: rmssd,
    measurementMethod: 'OVERNIGHT_AVERAGE',
  } as HrvObservation;
}

function mkRhr(trainingDayId: string, bpm: number): RestingHrObservation {
  const ts = new Date(`${trainingDayId}T06:00:00Z`);
  return {
    id: nextId(),
    athleteId: ATHLETE_ID,
    type: 'RESTING_HR',
    source: 'GARMIN',
    timestamp: ts,
    receivedAt: ts,
    normalizedAt: ts,
    trainingDayId,
    quality: 'MEASURED_OPTICAL',
    qualityFlags: ['OPTICAL_SENSOR'],
    valueBpm: bpm,
  } as RestingHrObservation;
}

function mkCondition(trainingDayId: string): PhysicalConditionObservation {
  const ts = new Date(`${trainingDayId}T08:00:00Z`);
  return {
    id: nextId(),
    athleteId: ATHLETE_ID,
    type: 'PHYSICAL_CONDITION',
    source: 'MANUAL',
    timestamp: ts,
    receivedAt: ts,
    normalizedAt: ts,
    trainingDayId,
    quality: 'MANUAL',
    qualityFlags: [],
    category: 'PAIN',
    bodyRegion: 'Genou',
    bodySide: 'RIGHT',
    severity: 2,
    affectsTraining: false,
  } as PhysicalConditionObservation;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture: 5-day observation history
// ─────────────────────────────────────────────────────────────────────────────

const DAYS = [
  '2026-06-01', // Day 1: rest day
  '2026-06-02', // Day 2: run
  '2026-06-03', // Day 3: bike with power
  '2026-06-04', // Day 4: rest + condition
  '2026-06-05', // Day 5: run
];

async function seedObservations(repo: InMemoryObservationRepository) {
  // Reset counter for deterministic IDs
  idCounter = 0;

  await repo.save(mkSleep(DAYS[0], 480));
  await repo.save(mkHrv(DAYS[0], 62));
  await repo.save(mkRhr(DAYS[0], 48));

  await repo.save(mkSession(DAYS[1]));
  await repo.save(mkSleep(DAYS[1], 390));
  await repo.save(mkHrv(DAYS[1], 55));
  await repo.save(mkRhr(DAYS[1], 52));

  await repo.save(mkBikeSession(DAYS[2]));
  await repo.save(mkSleep(DAYS[2], 360));
  await repo.save(mkHrv(DAYS[2], 48));
  await repo.save(mkRhr(DAYS[2], 56));

  await repo.save(mkSleep(DAYS[3], 510));
  await repo.save(mkHrv(DAYS[3], 67));
  await repo.save(mkRhr(DAYS[3], 46));
  await repo.save(mkCondition(DAYS[3]));

  await repo.save(mkSession(DAYS[4], { durationSec: 5400, sportType: 'TRAIL_RUN' }));
  await repo.save(mkSleep(DAYS[4], 450));
  await repo.save(mkHrv(DAYS[4], 58));
  await repo.save(mkRhr(DAYS[4], 50));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Feature Engine — Determinism', () => {
  let obsRepo: InMemoryObservationRepository;
  let contextProvider: StaticContextProvider;
  let productionFeatureRepo: InMemoryFeatureRepository;

  beforeEach(async () => {
    obsRepo = new InMemoryObservationRepository();
    productionFeatureRepo = new InMemoryFeatureRepository();
    contextProvider = new StaticContextProvider();
    await seedObservations(obsRepo);
  });

  it('produces identical checksums across two independent dry-run replays', async () => {
    const replayEngine = new ReplayEngine(obsRepo, productionFeatureRepo, contextProvider);
    const since = new Date('2026-06-01T00:00:00Z');
    const until = new Date('2026-06-05T23:59:59Z');

    // Run 1
    const run1 = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since,
      until,
      mode: 'dry-run',
    });

    // Run 2 — independent instance, separate in-memory feature repo
    const run2 = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since,
      until,
      mode: 'dry-run',
    });

    // All checksums must be identical
    const comparison = ReplayEngine.compareChecksums(run1, run2);
    expect(comparison.divergences).toEqual([]);
    expect(comparison.deterministic).toBe(true);
  });

  it('produces the same checksum count across two replays', async () => {
    const replayEngine = new ReplayEngine(obsRepo, productionFeatureRepo, contextProvider);
    const since = new Date('2026-06-01T00:00:00Z');
    const until = new Date('2026-06-05T23:59:59Z');

    const run1 = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since,
      until,
      mode: 'dry-run',
    });
    const run2 = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since,
      until,
      mode: 'dry-run',
    });

    expect(Object.keys(run1.allChecksums).length).toBe(Object.keys(run2.allChecksums).length);
    expect(run1.summary.totalFeatureSets).toBe(run2.summary.totalFeatureSets);
  });

  it('produces correct session feature checksums across replays', async () => {
    const replayEngine = new ReplayEngine(obsRepo, productionFeatureRepo, contextProvider);
    const since = new Date('2026-06-02T00:00:00Z');
    const until = new Date('2026-06-02T23:59:59Z');

    const run1 = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since,
      until,
      mode: 'dry-run',
    });
    const run2 = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since,
      until,
      mode: 'dry-run',
    });

    // Should have exactly one session checksum for June 2nd
    const sessionChecksums1 = Object.entries(run1.allChecksums).filter(([key]) =>
      key.includes('session:'),
    );
    const sessionChecksums2 = Object.entries(run2.allChecksums).filter(([key]) =>
      key.includes('session:'),
    );

    expect(sessionChecksums1.length).toBe(1);
    expect(sessionChecksums2.length).toBe(1);
    expect(sessionChecksums1[0][1]).toBe(sessionChecksums2[0][1]);
  });

  it('produces correct load feature checksums across replays', async () => {
    const replayEngine = new ReplayEngine(obsRepo, productionFeatureRepo, contextProvider);
    const since = new Date('2026-06-05T00:00:00Z');
    const until = new Date('2026-06-05T23:59:59Z');

    const run1 = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since,
      until,
      mode: 'dry-run',
    });
    const run2 = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since,
      until,
      mode: 'dry-run',
    });

    const loadKey = '2026-06-05/load:2026-06-05';
    expect(run1.allChecksums[loadKey]).toBeDefined();
    expect(run1.allChecksums[loadKey]).toBe(run2.allChecksums[loadKey]);
  });

  it('produces identical checksums when running three consecutive replays', async () => {
    const replayEngine = new ReplayEngine(obsRepo, productionFeatureRepo, contextProvider);
    const since = new Date('2026-06-01T00:00:00Z');
    const until = new Date('2026-06-05T23:59:59Z');

    const [run1, run2, run3] = await Promise.all([
      replayEngine.replay({ athleteId: ATHLETE_ID, since, until, mode: 'dry-run' }),
      replayEngine.replay({ athleteId: ATHLETE_ID, since, until, mode: 'dry-run' }),
      replayEngine.replay({ athleteId: ATHLETE_ID, since, until, mode: 'dry-run' }),
    ]);

    const cmp12 = ReplayEngine.compareChecksums(run1, run2);
    const cmp13 = ReplayEngine.compareChecksums(run1, run3);

    expect(cmp12.deterministic).toBe(true);
    expect(cmp13.deterministic).toBe(true);
  });

  it('reports correct summary stats after replay', async () => {
    const replayEngine = new ReplayEngine(obsRepo, productionFeatureRepo, contextProvider);
    const since = new Date('2026-06-01T00:00:00Z');
    const until = new Date('2026-06-05T23:59:59Z');

    const result = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since,
      until,
      mode: 'dry-run',
    });

    expect(result.summary.daysAttempted).toBe(5);
    expect(result.summary.daysFailed).toBe(0);
    expect(result.summary.daysSucceeded).toBe(5);
    // At minimum: 5 LOAD + 5 RECOVERY + 5 CONDITION + 2 SESSION + 1 BODY-or-more
    expect(result.summary.totalFeatureSets).toBeGreaterThanOrEqual(15);
  });

  it('checksums are content-deterministic regardless of observation insertion order', async () => {
    // Pre-build observations once, with stable IDs — same objects in both repos.
    // Insertion order into the Map should not change feature values.
    idCounter = 100; // distinct range to avoid collisions with other tests
    const session = mkSession(DAYS[1]);
    const sleep = mkSleep(DAYS[1], 390);
    const hrv = mkHrv(DAYS[1], 55);
    const rhr = mkRhr(DAYS[1], 52);

    // Repo 1: chronological insertion order
    const repo1 = new InMemoryObservationRepository();
    await repo1.save(session);
    await repo1.save(sleep);
    await repo1.save(hrv);
    await repo1.save(rhr);

    // Repo 2: reverse insertion order — same observation objects, same IDs
    const repo2 = new InMemoryObservationRepository();
    await repo2.save(rhr);
    await repo2.save(hrv);
    await repo2.save(sleep);
    await repo2.save(session);

    const since = new Date(`${DAYS[1]}T00:00:00Z`);
    const until = new Date(`${DAYS[1]}T23:59:59Z`);

    const engine1 = new ReplayEngine(repo1, new InMemoryFeatureRepository(), contextProvider);
    const engine2 = new ReplayEngine(repo2, new InMemoryFeatureRepository(), contextProvider);

    const run1 = await engine1.replay({ athleteId: ATHLETE_ID, since, until, mode: 'dry-run' });
    const run2 = await engine2.replay({ athleteId: ATHLETE_ID, since, until, mode: 'dry-run' });

    // Feature values must be identical regardless of insertion order
    const sessionKey1 = Object.keys(run1.allChecksums).find((k) => k.includes('session:'));
    const sessionKey2 = Object.keys(run2.allChecksums).find((k) => k.includes('session:'));

    expect(sessionKey1).toBeDefined();
    expect(sessionKey2).toBeDefined();
    // Same session (same ID due to idCounter reset) must produce same checksum
    expect(run1.allChecksums[sessionKey1!]).toBe(run2.allChecksums[sessionKey2!]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Checksum unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('checksumFeatureData — determinism invariants', () => {
  it('produces identical checksums for identical objects', () => {
    const data = { tssScore: 85.5, tssMethod: 'TRIMP_HR', confidence: 0.75 };
    expect(checksumFeatureData(data)).toBe(checksumFeatureData(data));
  });

  it('produces identical checksums regardless of key insertion order', () => {
    const v1 = { a: 1, b: 2, c: 3 };
    const v2 = { c: 3, a: 1, b: 2 };
    expect(checksumFeatureData(v1)).toBe(checksumFeatureData(v2));
  });

  it('produces different checksums for different values', () => {
    const v1 = { tssScore: 85 };
    const v2 = { tssScore: 86 };
    expect(checksumFeatureData(v1)).not.toBe(checksumFeatureData(v2));
  });

  it('is stable across multiple calls with the same input', () => {
    const data = { acuteLoad: 350.2, chronicLoad: 280.1, acwr: 1.25 };
    const checksums = Array.from({ length: 5 }, () => checksumFeatureData(data));
    expect(new Set(checksums).size).toBe(1);
  });

  it('handles null values deterministically', () => {
    const v1 = { acwr: null, trend: null };
    const v2 = { acwr: null, trend: null };
    expect(checksumFeatureData(v1)).toBe(checksumFeatureData(v2));
  });

  it('handles nested objects deterministically', () => {
    const v1 = { sportBreakdown: { run: 100, bike: 50, other: 0 } };
    const v2 = { sportBreakdown: { other: 0, bike: 50, run: 100 } };
    expect(checksumFeatureData(v1)).toBe(checksumFeatureData(v2));
  });

  it('handles arrays preserving element order', () => {
    const v1 = { items: [1, 2, 3] };
    const v2 = { items: [3, 2, 1] };
    // Array order is semantically meaningful — different order = different checksum
    expect(checksumFeatureData(v1)).not.toBe(checksumFeatureData(v2));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature Explorer — basic integration
// ─────────────────────────────────────────────────────────────────────────────

describe('FeatureExplorer — integration with ReplayEngine', () => {
  it('can browse computed features after a replay run', async () => {
    const obsRepo = new InMemoryObservationRepository();
    const featureRepo = new InMemoryFeatureRepository();
    idCounter = 0;
    await seedObservations(obsRepo);

    const replayEngine = new ReplayEngine(obsRepo, featureRepo, new StaticContextProvider());

    // Use write mode so features are stored in featureRepo
    await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since: new Date('2026-06-02T00:00:00Z'),
      until: new Date('2026-06-02T23:59:59Z'),
      mode: 'write',
    });

    const explorer = new FeatureExplorer(featureRepo);
    const view = await explorer.getDayView(ATHLETE_ID, '2026-06-02');

    expect(view.sessions.length).toBeGreaterThanOrEqual(1);
    expect(view.load).not.toBeNull();
    expect(view.recovery).not.toBeNull();
    expect(view.condition).not.toBeNull();
    expect(view.summary.computed).toBeGreaterThan(0);
    expect(view.summary.avgConfidence).toBeGreaterThan(0);
  });

  it('checksums from explorer match checksums from replay', async () => {
    const obsRepo = new InMemoryObservationRepository();
    const featureRepo = new InMemoryFeatureRepository();
    idCounter = 0;
    await seedObservations(obsRepo);

    const replayEngine = new ReplayEngine(obsRepo, featureRepo, new StaticContextProvider());

    const result = await replayEngine.replay({
      athleteId: ATHLETE_ID,
      since: new Date('2026-06-03T00:00:00Z'),
      until: new Date('2026-06-03T23:59:59Z'),
      mode: 'write',
    });

    // Find the session checksum from replay
    const replaySessionChecksum = Object.entries(result.allChecksums).find(([k]) =>
      k.includes('session:'),
    );
    expect(replaySessionChecksum).toBeDefined();

    // Find the same session in the explorer
    const explorer = new FeatureExplorer(featureRepo);
    const view = await explorer.getDayView(ATHLETE_ID, '2026-06-03');
    const explorerChecksum = view.sessions[0]?.checksum;

    expect(explorerChecksum).toBeDefined();
    expect(explorerChecksum).toBe(replaySessionChecksum![1]);
  });
});
