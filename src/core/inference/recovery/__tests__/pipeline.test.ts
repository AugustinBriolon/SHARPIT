/**
 * RECOVERY INTELLIGENCE — Integration Tests
 *
 * Tests the complete pipeline from DayFeatures → Recommendation.
 * Uses in-memory implementations of all repositories.
 *
 * No database required. No network calls.
 *
 * What is tested:
 *   1. RecoveryInferenceOrchestrator.run() executes the full pipeline
 *   2. DecisionRecord is correctly persisted
 *   3. Digital Twin is correctly updated
 *   4. RecoveryInferenceOrchestrator.getLatest() returns cached result
 *   5. Pipeline is idempotent (re-running doesn't corrupt state)
 *   6. Pipeline works with minimal data (only load features available)
 */

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import type { DigitalTwinRepository } from '@/core/digital-twin/repository';
import type {
  AdaptationState,
  DigitalTwin,
  FatigueState,
  ReasoningState,
  RecoveryState,
} from '@/core/digital-twin/types';
import type { FeatureEngine } from '@/core/features/engine';
import type { DayFeatures, LoadFeatureSet, RecoveryFeatureSet } from '@/core/features/types';
import { RecoveryInferenceOrchestrator } from '../../orchestrator';
import type { DecisionRecord, DecisionRecordRepository, ModelId } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory repositories
// ─────────────────────────────────────────────────────────────────────────────

class InMemoryDigitalTwinRepository implements DigitalTwinRepository {
  private readonly store = new Map<string, DigitalTwin>();

  async findOrCreate(athleteId: string): Promise<DigitalTwin> {
    if (!this.store.has(athleteId)) {
      const twin: DigitalTwin = {
        id: randomUUID(),
        athleteId,
        state: {
          recovery: null,
          fatigue: null,
          adaptation: null,
          reasoning: null,
          physicalHealth: null,
        },
        updatedAt: new Date(),
        createdAt: new Date(),
      };
      this.store.set(athleteId, twin);
    }
    return this.store.get(athleteId)!;
  }

  async updateRecovery(athleteId: string, recoveryState: RecoveryState): Promise<DigitalTwin> {
    const existing = await this.findOrCreate(athleteId);
    const updated: DigitalTwin = {
      ...existing,
      state: { ...existing.state, recovery: recoveryState },
      updatedAt: new Date(),
    };
    this.store.set(athleteId, updated);
    return updated;
  }

  async getPreviousRecoveryScore(athleteId: string): Promise<number | null> {
    const twin = this.store.get(athleteId);
    return twin?.state.recovery?.readinessScore ?? null;
  }

  async updateFatigue(athleteId: string, fatigueState: FatigueState): Promise<DigitalTwin> {
    const existing = await this.findOrCreate(athleteId);
    const updated: DigitalTwin = {
      ...existing,
      state: { ...existing.state, fatigue: fatigueState },
      updatedAt: new Date(),
    };
    this.store.set(athleteId, updated);
    return updated;
  }

  async getPreviousFatigueState(athleteId: string): Promise<FatigueState | null> {
    const twin = this.store.get(athleteId);
    return twin?.state.fatigue ?? null;
  }

  async updateAdaptation(
    athleteId: string,
    adaptationState: AdaptationState,
  ): Promise<DigitalTwin> {
    const existing = await this.findOrCreate(athleteId);
    const updated: DigitalTwin = {
      ...existing,
      state: { ...existing.state, adaptation: adaptationState },
      updatedAt: new Date(),
    };
    this.store.set(athleteId, updated);
    return updated;
  }

  async getPreviousAdaptationState(athleteId: string): Promise<AdaptationState | null> {
    return this.store.get(athleteId)?.state.adaptation ?? null;
  }

  async updateReasoning(athleteId: string, reasoningState: ReasoningState): Promise<DigitalTwin> {
    const existing = await this.findOrCreate(athleteId);
    const updated: DigitalTwin = {
      ...existing,
      state: { ...existing.state, reasoning: reasoningState },
      updatedAt: new Date(),
    };
    this.store.set(athleteId, updated);
    return updated;
  }

  async getPreviousReasoningState(athleteId: string): Promise<ReasoningState | null> {
    return this.store.get(athleteId)?.state.reasoning ?? null;
  }

  async updatePhysicalHealth(
    athleteId: string,
    physicalHealthState: import('@/core/inference/physical-health/types').PhysicalHealthState,
  ): Promise<DigitalTwin> {
    const existing = await this.findOrCreate(athleteId);
    const updated: DigitalTwin = {
      ...existing,
      state: { ...existing.state, physicalHealth: physicalHealthState },
      updatedAt: new Date(),
    };
    this.store.set(athleteId, updated);
    return updated;
  }

  async getPreviousPhysicalHealthState(
    athleteId: string,
  ): Promise<import('@/core/inference/physical-health/types').PhysicalHealthState | null> {
    return this.store.get(athleteId)?.state.physicalHealth ?? null;
  }

  async updateEnvironmentalState(
    athleteId: string,
    state: import('@/core/digital-twin/types').EnvironmentalTwinState,
  ): Promise<DigitalTwin> {
    const existing = await this.findOrCreate(athleteId);
    const updated: DigitalTwin = {
      ...existing,
      state: { ...existing.state, environmental: state },
      updatedAt: new Date(),
    };
    this.store.set(athleteId, updated);
    return updated;
  }

  async getEnvironmentalState(
    athleteId: string,
  ): Promise<import('@/core/digital-twin/types').EnvironmentalTwinState | null> {
    return this.store.get(athleteId)?.state.environmental ?? null;
  }

  async getEnvironmentalImpact(
    athleteId: string,
  ): Promise<import('@/core/digital-twin/types').EnvironmentalTwinState['impact'] | null> {
    return this.store.get(athleteId)?.state.environmental?.impact ?? null;
  }

  getAll(): DigitalTwin[] {
    return Array.from(this.store.values());
  }
}

class InMemoryDecisionRecordRepository implements DecisionRecordRepository {
  private readonly records: DecisionRecord[] = [];

  async save(record: DecisionRecord): Promise<void> {
    this.records.push(record);
  }

  async findLatest(
    athleteId: string,
    modelId: ModelId,
    trainingDayId: string,
  ): Promise<DecisionRecord | null> {
    const matching = this.records
      .filter(
        (r) =>
          r.athleteId === athleteId && r.modelId === modelId && r.trainingDayId === trainingDayId,
      )
      .sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime());
    return matching[0] ?? null;
  }

  async findByRange(
    athleteId: string,
    fromTrainingDayId: string,
    toTrainingDayId: string,
  ): Promise<DecisionRecord[]> {
    return this.records.filter(
      (r) =>
        r.athleteId === athleteId &&
        r.trainingDayId >= fromTrainingDayId &&
        r.trainingDayId <= toTrainingDayId,
    );
  }

  async findRecent(athleteId: string, modelId: ModelId, limit: number): Promise<DecisionRecord[]> {
    return this.records
      .filter((r) => r.athleteId === athleteId && r.modelId === modelId)
      .sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime())
      .slice(0, limit);
  }

  getCount(): number {
    return this.records.length;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock FeatureEngine
// ─────────────────────────────────────────────────────────────────────────────

function createMockFeatureEngine(dayFeatures: DayFeatures): FeatureEngine {
  return {
    getDayFeatures: async (_athleteId: string, _trainingDayId: string) => dayFeatures,
  } as unknown as FeatureEngine;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ATHLETE_ID = 'athlete-integration-test';
const TRAINING_DAY = '2026-07-02';

function makeFullRecovery(): RecoveryFeatureSet {
  return {
    trainingDayId: TRAINING_DAY,
    sleepEfficiencyPercent: 84,
    sleepDebtMin: 25,
    sleepOnsetConsistencyMin: 20,
    sleepDurationTrend: -2,
    hrvAbsolute: 58,
    hrvDeltaFromBaseline: 6,
    hrvCoefficientOfVariation: 6,
    rhrAbsolute: 46,
    rhrDeltaFromBaseline: -1,
    subjectiveWellnessIndex: 7.8,
    subjectiveWellnessComponents: { mood: 4, energyLevel: 4, perceivedSoreness: 2 },
    rpeVsTargetZone: 0.5,
    confidence: 0.87,
    algorithmId: 'recovery-features-v1',
    sourceObsIds: ['obs-1', 'obs-2'],
  };
}

function makeFullLoad(): LoadFeatureSet {
  return {
    trainingDayId: TRAINING_DAY,
    acuteLoad: 290,
    chronicLoad: 265,
    acwr: 1.09,
    weeklyLoad: 290,
    loadMonotony: 1.4,
    loadStrain: 406,
    trainingFrequency: 5,
    restDayCount: 2,
    acuteChronicLoadTrend: 0.015,
    acuteLoadRun: 130,
    acuteLoadBike: 160,
    chronicLoadRun: 115,
    chronicLoadBike: 150,
    confidence: 0.9,
    algorithmId: 'load-features-v1',
    sourceObsIds: ['obs-3'],
  };
}

function makeFullDayFeatures(): DayFeatures {
  return {
    athleteId: ATHLETE_ID,
    trainingDayId: TRAINING_DAY,
    retrievedAt: new Date('2026-07-02T08:00:00Z'),
    sessions: [],
    load: makeFullLoad(),
    recovery: makeFullRecovery(),
    body: 'PENDING',
    condition: 'PENDING',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test setup factory
// ─────────────────────────────────────────────────────────────────────────────

function createPipeline(dayFeatures: DayFeatures = makeFullDayFeatures()) {
  const digitalTwinRepo = new InMemoryDigitalTwinRepository();
  const decisionRecordRepo = new InMemoryDecisionRecordRepository();
  const featureEngine = createMockFeatureEngine(dayFeatures);

  const orchestrator = new RecoveryInferenceOrchestrator({
    featureEngine,
    digitalTwinRepo,
    decisionRecordRepo,
  });

  return { orchestrator, digitalTwinRepo, decisionRecordRepo };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('RecoveryInferenceOrchestrator — full pipeline integration', () => {
  describe('run() — complete pipeline execution', () => {
    it('returns a result with all required fields', async () => {
      const { orchestrator } = createPipeline();
      const result = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      expect(result.athleteId).toBe(ATHLETE_ID);
      expect(result.trainingDayId).toBe(TRAINING_DAY);
      expect(result.computedAt).toBeInstanceOf(Date);
      expect(result.decisionRecordId).not.toBeNull();
      expect(result.digitalTwinUpdated).toBe(true);
    });

    it('produces a non-null readiness score with full data', async () => {
      const { orchestrator } = createPipeline();
      const result = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      expect(result.output.recoveryState.readinessScore).not.toBeNull();
      expect(result.output.recoveryState.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result.output.recoveryState.readinessScore).toBeLessThanOrEqual(100);
    });

    it('persists exactly one Decision Record', async () => {
      const { orchestrator, decisionRecordRepo } = createPipeline();
      await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      expect(decisionRecordRepo.getCount()).toBe(1);
    });

    it('Decision Record contains correct model identity', async () => {
      const { orchestrator, decisionRecordRepo } = createPipeline();
      await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      const record = await decisionRecordRepo.findLatest(
        ATHLETE_ID,
        'recovery-synthesis-v1',
        TRAINING_DAY,
      );
      expect(record).not.toBeNull();
      expect(record!.modelId).toBe('recovery-synthesis-v1');
      expect(record!.modelVersion).toBe('v1');
      expect(record!.athleteId).toBe(ATHLETE_ID);
      expect(record!.trainingDayId).toBe(TRAINING_DAY);
    });

    it('Decision Record explanation is absent for recovery model', async () => {
      const { orchestrator, decisionRecordRepo } = createPipeline();
      await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      const record = await decisionRecordRepo.findLatest(
        ATHLETE_ID,
        'recovery-synthesis-v1',
        TRAINING_DAY,
      );
      expect(record!.explanation).toBeUndefined();
    });

    it('Decision Record confidence matches model output', async () => {
      const { orchestrator, decisionRecordRepo } = createPipeline();
      const result = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      const record = await decisionRecordRepo.findLatest(
        ATHLETE_ID,
        'recovery-synthesis-v1',
        TRAINING_DAY,
      );
      expect(record!.confidence).toBe(result.output.recoveryState.confidence);
    });

    it('Decision Record inputSummary contains key features', async () => {
      const { orchestrator, decisionRecordRepo } = createPipeline();
      await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      const record = await decisionRecordRepo.findLatest(
        ATHLETE_ID,
        'recovery-synthesis-v1',
        TRAINING_DAY,
      );
      const summary = record!.inputSummary as { recovery: { hrvDeltaFromBaseline: number } };
      expect(summary.recovery).not.toBeNull();
      expect(summary.recovery.hrvDeltaFromBaseline).toBe(6);
    });
  });

  describe('Digital Twin updates', () => {
    it('Digital Twin is updated with recovery state after run()', async () => {
      const { orchestrator, digitalTwinRepo } = createPipeline();
      await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      const twin = await digitalTwinRepo.findOrCreate(ATHLETE_ID);
      expect(twin.state.recovery).not.toBeNull();
      expect(twin.state.recovery!.readinessScore).toBeGreaterThan(0);
    });

    it('Digital Twin recoveryState has correct model ID', async () => {
      const { orchestrator, digitalTwinRepo } = createPipeline();
      await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      const twin = await digitalTwinRepo.findOrCreate(ATHLETE_ID);
      expect(twin.state.recovery!.modelId).toBe('recovery-synthesis-v1');
    });

    it('Digital Twin recoveryState matches inference output', async () => {
      const { orchestrator, digitalTwinRepo } = createPipeline();
      const result = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      const twin = await digitalTwinRepo.findOrCreate(ATHLETE_ID);
      expect(twin.state.recovery!.readinessScore).toBe(result.output.recoveryState.readinessScore);
      expect(twin.state.recovery!.readinessCategory).toBe(
        result.output.recoveryState.readinessCategory,
      );
    });
  });

  describe('getLatest() — cached result retrieval', () => {
    it('returns null when no result exists yet', async () => {
      const { orchestrator } = createPipeline();
      const result = await orchestrator.getLatest(ATHLETE_ID, TRAINING_DAY);
      expect(result).toBeNull();
    });

    it('returns cached result after run()', async () => {
      const { orchestrator } = createPipeline();
      await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      const cached = await orchestrator.getLatest(ATHLETE_ID, TRAINING_DAY);
      expect(cached).not.toBeNull();
      expect(cached!.athleteId).toBe(ATHLETE_ID);
      expect(cached!.trainingDayId).toBe(TRAINING_DAY);
    });

    it('cached result readiness score matches original run', async () => {
      const { orchestrator } = createPipeline();
      const original = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);
      const cached = await orchestrator.getLatest(ATHLETE_ID, TRAINING_DAY);

      expect(cached!.output.recoveryState.readinessScore).toBe(
        original.output.recoveryState.readinessScore,
      );
    });
  });

  describe('Idempotency and re-runs', () => {
    it('running twice creates two Decision Records', async () => {
      const { orchestrator, decisionRecordRepo } = createPipeline();
      await orchestrator.run(ATHLETE_ID, TRAINING_DAY);
      await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      expect(decisionRecordRepo.getCount()).toBe(2);
    });

    it('re-running with same features produces same recovery score', async () => {
      const { orchestrator } = createPipeline();
      const result1 = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);
      const result2 = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      expect(result1.output.recoveryState.readinessScore).toBe(
        result2.output.recoveryState.readinessScore,
      );
      expect(result1.output.decision.verdict).toBe(result2.output.decision.verdict);
    });
  });

  describe('Minimal data scenario (load only, no recovery features)', () => {
    it('handles PENDING recovery features gracefully', async () => {
      const dayFeatures: DayFeatures = {
        athleteId: ATHLETE_ID,
        trainingDayId: TRAINING_DAY,
        retrievedAt: new Date(),
        sessions: [],
        load: makeFullLoad(),
        recovery: 'PENDING',
        body: 'PENDING',
        condition: 'PENDING',
      };

      const { orchestrator } = createPipeline(dayFeatures);
      const result = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      // With only load data, we can't compute a full score
      expect(result.output.recoveryState.readinessScore).toBeNull();
      // But we should still get a recommendation
      expect(result.output.recommendation.type).toBeDefined();
      expect(result.output.recommendation.keyEvidence.length).toBeGreaterThan(0);
    });
  });

  describe('Pipeline signals — end-to-end verification', () => {
    it('produces all 7 expected signal fields', async () => {
      const { orchestrator } = createPipeline();
      const result = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);
      const { signals } = result.output;

      expect(signals).toHaveProperty('autonomicBalance');
      expect(signals).toHaveProperty('sleepAdequacy');
      expect(signals).toHaveProperty('subjectiveWellness');
      expect(signals).toHaveProperty('loadStressContext');
      expect(signals).toHaveProperty('overreachingRisk');
      expect(signals).toHaveProperty('illnessRisk');
      expect(signals).toHaveProperty('dissonanceDetected');
    });

    it('signals are persisted verbatim in Decision Record', async () => {
      const { orchestrator, decisionRecordRepo } = createPipeline();
      const result = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      const record = await decisionRecordRepo.findLatest(
        ATHLETE_ID,
        'recovery-synthesis-v1',
        TRAINING_DAY,
      );
      const storedSignals = record!.signals as typeof result.output.signals;
      expect(storedSignals.autonomicBalance).toBe(result.output.signals.autonomicBalance);
      expect(storedSignals.overreachingRisk).toBe(result.output.signals.overreachingRisk);
    });

    it('recommendation type matches decision intensity', async () => {
      const { orchestrator } = createPipeline();
      const result = await orchestrator.run(ATHLETE_ID, TRAINING_DAY);

      expect(result.output.recommendation.type).toBe(result.output.decision.recommendedIntensity);
    });
  });
});
