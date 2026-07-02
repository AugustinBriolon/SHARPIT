/**
 * SHARPIT — Reasoning Engine Benchmark Scenarios
 *
 * Five canonical benchmark scenarios for the Reasoning Engine v1.
 * These validate cross-model synthesis correctness across:
 *   RE01 — Optimal training day (all models green)
 *   RE02 — Overreaching emergency (safety-first: RECOVER verdict mandatory)
 *   RE03 — Adaptation plateau with good recovery (LOAD_INCREASE opportunity)
 *   RE04 — Model conflict (recovery OK but fatigue REST_ONLY → CAUTION)
 *   RE05 — Race readiness (adaptation peak, optimal recovery → RACE_READY)
 *
 * The Reasoning Engine reads exclusively from AthleteState (Digital Twin).
 * No feature inputs — second-order inference over already-computed states.
 *
 * See docs/models/REASONING_ENGINE.md for scoring rules.
 */

import type {
  AthleteProfile,
  LiteratureReference,
  ValueExpectation,
  RangeExpectation,
} from './types';
import type { RecoveryState, FatigueState, AdaptationState } from '@/core/digital-twin/types';
import type { OverallVerdict, PhysiologicalConsistency } from '@/core/digital-twin/types';
import type { ReasoningModelInput } from '@/core/inference/reasoning/types';

// ─────────────────────────────────────────────────────────────────────────────
// Reasoning-specific types
// ─────────────────────────────────────────────────────────────────────────────

export type ReasoningPhysiologicalExpectations = {
  readonly overallVerdict: ValueExpectation<OverallVerdict>;
  readonly physiologicalConsistency: ValueExpectation<PhysiologicalConsistency>;
  readonly consistencyScoreRange: RangeExpectation;
  readonly confidenceRange: RangeExpectation;
  readonly hasConflicts?: ValueExpectation<boolean>;
  readonly hasOpportunities?: ValueExpectation<boolean>;
};

export type ReasoningBenchmarkScenario = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly athlete: AthleteProfile;
  readonly input: ReasoningModelInput;
  readonly expectations: ReasoningPhysiologicalExpectations;
  readonly physiologicalPhase: string;
  readonly rationale: string;
  readonly literature: readonly LiteratureReference[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal factories
// ─────────────────────────────────────────────────────────────────────────────

function recovery(overrides: Partial<RecoveryState> = {}): RecoveryState {
  return {
    readinessScore: 72,
    readinessCategory: 'ADEQUATE',
    dimensions: {
      autonomic: { score: 75, status: 'NORMAL', available: true },
      sleep: { score: 70, status: 'adequate', available: true },
      subjective: { score: 65, status: 'NORMAL', available: true },
      loadContext: { score: 60, status: 'ELEVATED', available: true },
    },
    primaryLimitingFactor: 'loadContext',
    estimatedTimeToFullRecovery: null,
    overreachingRisk: 'LOW',
    illnessRisk: 'LOW',
    dissonanceDetected: false,
    confidence: 0.85,
    dataCompleteness: 'FULL',
    modelId: 'recovery-synthesis-v1',
    computedAt: new Date('2026-07-02'),
    trainingDayId: '2026-07-02',
    ...overrides,
  };
}

function fatigue(overrides: Partial<FatigueState> = {}): FatigueState {
  return {
    fatigueIndex: 28,
    fatigueLevel: 'FUNCTIONAL_LOW',
    fatigueType: 'LOAD_DOMINANT',
    dimensions: {
      load: { score: 30, status: 'moderate', available: true },
      neuromuscular: { score: 25, status: 'low', available: true },
      metabolic: { score: 20, status: 'low', available: true },
      cumulative: { score: 15, status: 'low', available: true },
      psychological: { score: 10, status: 'low', available: true },
    },
    trajectory: 'STABLE',
    consecutiveAccumulationDays: 0,
    dominantDimension: 'LOAD',
    primaryLimitingFactor: null,
    functionalOverreachingRisk: 'LOW',
    estimatedTimeToFresh: null,
    performanceImpairmentEstimate: 5,
    trainingCapacity: 'FULL',
    confidence: 0.8,
    dataCompleteness: 'FULL',
    modelId: 'fatigue-v1',
    computedAt: new Date('2026-07-02'),
    trainingDayId: '2026-07-02',
    ...overrides,
  };
}

function adaptation(overrides: Partial<AdaptationState> = {}): AdaptationState {
  return {
    adaptationIndex: 68,
    adaptationStatus: 'MAINTAINING',
    adaptationTrend: 'STABLE',
    dimensions: {
      loadProgression: { score: 65, status: 'adequate', available: true },
      neuromuscularEfficiency: { score: 70, status: 'good', available: true },
      autonomicAdaptation: { score: 65, status: 'normal', available: true },
      recoveryQuality: { score: 72, status: 'good', available: true },
    },
    limitingFactor: null,
    estimatedAdaptationPeak: null,
    plateauRisk: false,
    overreachingWithoutAdaptationDetected: false,
    confidence: 0.8,
    dataCompleteness: 'FULL',
    modelId: 'adaptation-v1',
    computedAt: new Date('2026-07-02'),
    trainingDayId: '2026-07-02',
    ...overrides,
  };
}

function input(
  r: RecoveryState | null,
  f: FatigueState | null,
  a: AdaptationState | null,
): ReasoningModelInput {
  return {
    trainingDayId: '2026-07-02',
    athleteId: 'bench-athlete',
    athleteState: { recovery: r, fatigue: f, adaptation: a, reasoning: null },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Athlete profiles
// ─────────────────────────────────────────────────────────────────────────────

const PROFILES: Record<string, AthleteProfile> = {
  INTERMEDIATE_RUNNER: {
    id: 'INTERMEDIATE_RUNNER',
    label: 'Intermediate Runner',
    experienceLevel: 'INTERMEDIATE',
    primarySport: 'RUNNING',
    description: '4-year runner, 7-10h/week, CTL ~65. Complete digital twin with all three models.',
  },
  ADVANCED_TRIATHLETE: {
    id: 'ADVANCED_TRIATHLETE',
    label: 'Advanced Triathlete',
    experienceLevel: 'ADVANCED',
    primarySport: 'TRIATHLON',
    description: '8-year triathlete, 14-18h/week, CTL ~90. All systems monitored.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Literature references
// ─────────────────────────────────────────────────────────────────────────────

const LIT: Record<string, LiteratureReference> = {
  MEEUSEN_2013: {
    authors: 'Meeusen, R. et al.',
    year: 2013,
    title: 'Prevention, diagnosis and treatment of the overtraining syndrome',
    journal: 'European Journal of Sport Science',
    doi: '10.1080/17461391.2012.730061',
    evidenceLevel: 'L2',
  },
  HALSON_2014: {
    authors: 'Halson, S.L.',
    year: 2014,
    title: 'Monitoring training load to understand fatigue in athletes',
    journal: 'Sports Medicine',
    doi: '10.1007/s40279-014-0253-z',
    evidenceLevel: 'L2',
  },
  BUCHHEIT_2017: {
    authors: 'Buchheit, M.',
    year: 2017,
    title: 'Applying the acute:chronic workload ratio in elite football',
    journal: 'British Journal of Sports Medicine',
    doi: '10.1136/bjsports-2016-097280',
    evidenceLevel: 'L2',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RE01 — Optimal training day (all models green)
// ─────────────────────────────────────────────────────────────────────────────

const RE01: ReasoningBenchmarkScenario = {
  id: 'RE01',
  name: 'Optimal training day — all systems green',
  description:
    'All three models report positive states: OPTIMAL recovery, FRESH fatigue, POSITIVELY_ADAPTING. ' +
    'The Reasoning Engine must synthesize all signals into TRAIN_HARD and ALIGNED consistency.',
  athlete: PROFILES.INTERMEDIATE_RUNNER,
  input: input(
    recovery({ readinessScore: 88, readinessCategory: 'OPTIMAL', overreachingRisk: 'LOW' }),
    fatigue({ fatigueIndex: 12, fatigueLevel: 'FRESH', trainingCapacity: 'FULL' }),
    adaptation({
      adaptationIndex: 78,
      adaptationStatus: 'POSITIVELY_ADAPTING',
      adaptationTrend: 'IMPROVING',
    }),
  ),
  expectations: {
    overallVerdict: {
      acceptable: ['TRAIN_HARD'],
      rationale: 'All models green — TRAIN_HARD is the only scientifically justified verdict',
      weight: 3.0,
    },
    physiologicalConsistency: {
      acceptable: ['ALIGNED'],
      rationale: 'All three models point TRAIN direction — perfect alignment',
      weight: 2.0,
    },
    consistencyScoreRange: {
      min: 90,
      max: 100,
      rationale: 'All models TRAIN direction → consistency score must be high',
      weight: 1.5,
    },
    confidenceRange: {
      min: 0.6,
      max: 1.0,
      rationale: 'Three full models → high confidence',
      weight: 1.0,
    },
  },
  physiologicalPhase: 'Peak training week — high-quality mesocycle',
  rationale:
    'Validates that TRAIN_HARD requires all models to be in green state simultaneously. ' +
    'Any deviation in individual model state should prevent TRAIN_HARD.',
  literature: [LIT.HALSON_2014, LIT.BUCHHEIT_2017],
};

// ─────────────────────────────────────────────────────────────────────────────
// RE02 — Overreaching emergency (safety-first: RECOVER mandatory)
// ─────────────────────────────────────────────────────────────────────────────

const RE02: ReasoningBenchmarkScenario = {
  id: 'RE02',
  name: 'Overreaching emergency — safety-first RECOVER verdict',
  description:
    'Fatigue model reports OVERREACHING_RISK with REST_ONLY capacity. Recovery is LOW. ' +
    'The Reasoning Engine must produce RECOVER regardless of adaptation state. ' +
    'This is the primary safety test — failure to produce RECOVER here is a critical regression.',
  athlete: PROFILES.ADVANCED_TRIATHLETE,
  input: input(
    recovery({
      readinessScore: 38,
      readinessCategory: 'LOW',
      overreachingRisk: 'HIGH',
      primaryLimitingFactor: 'autonomic',
      estimatedTimeToFullRecovery: 3,
    }),
    fatigue({
      fatigueIndex: 91,
      fatigueLevel: 'OVERREACHING_RISK',
      trainingCapacity: 'REST_ONLY',
      consecutiveAccumulationDays: 9,
      functionalOverreachingRisk: 'CRITICAL',
      performanceImpairmentEstimate: 35,
    }),
    adaptation({ adaptationIndex: 45, adaptationStatus: 'PLATEAUING' }),
  ),
  expectations: {
    overallVerdict: {
      acceptable: ['RECOVER'],
      rationale:
        'OVERREACHING_RISK + REST_ONLY + LOW readiness → RECOVER is the only safe verdict. Safety-critical.',
      weight: 3.0,
    },
    physiologicalConsistency: {
      acceptable: ['CONFLICTING', 'PARTIALLY_ALIGNED'],
      rationale:
        'Recovery LOW + Fatigue REST point REST; Adaptation PLATEAUING points EASY — some alignment',
      weight: 1.0,
    },
    consistencyScoreRange: {
      min: 0,
      max: 80,
      rationale: 'Models not fully aligned — score should reflect partial/conflicting state',
      weight: 1.0,
    },
    confidenceRange: {
      min: 0.3,
      max: 0.95,
      rationale:
        'All 3 models present; PARTIALLY_ALIGNED consistency — moderate-to-high confidence expected',
      weight: 1.0,
    },
    hasConflicts: {
      acceptable: [false, true],
      rationale: 'Conflicts may or may not be detected depending on exact state combination',
      weight: 1.0,
    },
  },
  physiologicalPhase: 'Overtraining — accumulated fatigue emergency',
  rationale:
    'The primary safety test for the Reasoning Engine. RECOVER verdict must be produced when ' +
    'OVERREACHING_RISK is detected. Failure here is a critical regression that must block deployment.',
  literature: [LIT.MEEUSEN_2013],
};

// ─────────────────────────────────────────────────────────────────────────────
// RE03 — Adaptation plateau with good recovery (load increase opportunity)
// ─────────────────────────────────────────────────────────────────────────────

const RE03: ReasoningBenchmarkScenario = {
  id: 'RE03',
  name: 'Adaptation plateau — load increase opportunity',
  description:
    'Adaptation is PLATEAUING with plateau risk flagged. Recovery is ADEQUATE, fatigue is FRESH. ' +
    'The Reasoning Engine must detect the opportunity for a load increase ' +
    'and produce a TRAIN_HARD or TRAIN_SMART verdict to encourage progression.',
  athlete: PROFILES.INTERMEDIATE_RUNNER,
  input: input(
    recovery({ readinessScore: 74, readinessCategory: 'ADEQUATE' }),
    fatigue({ fatigueIndex: 18, fatigueLevel: 'FRESH', trainingCapacity: 'FULL' }),
    adaptation({
      adaptationIndex: 40,
      adaptationStatus: 'PLATEAUING',
      plateauRisk: true,
      adaptationTrend: 'STABLE',
    }),
  ),
  expectations: {
    overallVerdict: {
      acceptable: ['TRAIN_HARD', 'TRAIN_SMART'],
      rationale:
        'Recovery ADEQUATE + Fatigue FRESH → training is appropriate; plateau needs more stimulus',
      weight: 3.0,
    },
    physiologicalConsistency: {
      acceptable: ['PARTIALLY_ALIGNED', 'ALIGNED'],
      rationale: 'Recovery→TRAIN, Fatigue→TRAIN, Adaptation→EASY — 2/3 agree on TRAIN',
      weight: 1.5,
    },
    consistencyScoreRange: {
      min: 50,
      max: 100,
      rationale: 'Majority TRAIN direction → moderate-high consistency',
      weight: 1.0,
    },
    confidenceRange: {
      min: 0.5,
      max: 0.95,
      rationale: 'Three available models, good data quality',
      weight: 1.0,
    },
    hasOpportunities: {
      acceptable: [true],
      rationale:
        'LOAD_INCREASE opportunity must be detected: ADEQUATE recovery + FRESH fatigue + PLATEAUING',
      weight: 2.0,
    },
  },
  physiologicalPhase: 'Stagnation phase — stimulus needed',
  rationale:
    'Validates that the Reasoning Engine detects the load increase opportunity window ' +
    'when recovery and fatigue allow training but adaptation has plateaued.',
  literature: [LIT.BUCHHEIT_2017, LIT.HALSON_2014],
};

// ─────────────────────────────────────────────────────────────────────────────
// RE04 — Capacity conflict (recovery OK but fatigue REST_ONLY)
// ─────────────────────────────────────────────────────────────────────────────

const RE04: ReasoningBenchmarkScenario = {
  id: 'RE04',
  name: 'Capacity conflict — recovery OK but fatigue REST_ONLY',
  description:
    'Recovery markers are ADEQUATE (readiness 68), but fatigue model says REST_ONLY capacity. ' +
    'This is a CAPACITY_CONFLICT: objective readiness markers contradict load-based capacity. ' +
    'The Reasoning Engine must detect the conflict and produce CAUTION or RECOVER.',
  athlete: PROFILES.ADVANCED_TRIATHLETE,
  input: input(
    recovery({ readinessScore: 68, readinessCategory: 'ADEQUATE' }),
    fatigue({
      fatigueIndex: 76,
      fatigueLevel: 'NON_FUNCTIONAL_RISK',
      trainingCapacity: 'REST_ONLY',
      consecutiveAccumulationDays: 6,
      functionalOverreachingRisk: 'HIGH',
    }),
    adaptation({ adaptationIndex: 52, adaptationStatus: 'MAINTAINING' }),
  ),
  expectations: {
    overallVerdict: {
      acceptable: ['RECOVER', 'CAUTION'],
      rationale: 'REST_ONLY capacity → RECOVER or CAUTION are the only safe verdicts',
      weight: 3.0,
    },
    physiologicalConsistency: {
      acceptable: ['CONFLICTING', 'PARTIALLY_ALIGNED'],
      rationale: 'Recovery→TRAIN conflicts with Fatigue→REST — conflict expected',
      weight: 2.0,
    },
    consistencyScoreRange: {
      min: 0,
      max: 70,
      rationale: 'Conflicting directions → low consistency score',
      weight: 1.5,
    },
    confidenceRange: {
      min: 0.3,
      max: 0.8,
      rationale: 'Conflicting signals reduce reasoning confidence',
      weight: 1.0,
    },
    hasConflicts: {
      acceptable: [true],
      rationale: 'CAPACITY_CONFLICT must be detected: ADEQUATE recovery + REST_ONLY fatigue',
      weight: 2.0,
    },
  },
  physiologicalPhase: 'Overreaching threshold — accumulated training block',
  rationale:
    'Validates the CAPACITY_CONFLICT detection and that safety-first verdict logic ' +
    'correctly prioritises fatigue REST_ONLY over recovery ADEQUATE.',
  literature: [LIT.MEEUSEN_2013, LIT.HALSON_2014],
};

// ─────────────────────────────────────────────────────────────────────────────
// RE05 — Race readiness (adaptation peak, optimal recovery)
// ─────────────────────────────────────────────────────────────────────────────

const RE05: ReasoningBenchmarkScenario = {
  id: 'RE05',
  name: 'Race readiness — adaptation peak imminent',
  description:
    'Recovery is OPTIMAL (92), fatigue is FRESH (10), adaptation shows POSITIVELY_ADAPTING ' +
    'with estimatedAdaptationPeak = 3 days. ' +
    'The Reasoning Engine must detect RACE_READY state.',
  athlete: PROFILES.ADVANCED_TRIATHLETE,
  input: input(
    recovery({ readinessScore: 92, readinessCategory: 'OPTIMAL', overreachingRisk: 'LOW' }),
    fatigue({ fatigueIndex: 10, fatigueLevel: 'FRESH', trainingCapacity: 'FULL' }),
    adaptation({
      adaptationIndex: 82,
      adaptationStatus: 'POSITIVELY_ADAPTING',
      adaptationTrend: 'IMPROVING',
      estimatedAdaptationPeak: 3,
      plateauRisk: false,
    }),
  ),
  expectations: {
    overallVerdict: {
      acceptable: ['RACE_READY', 'TRAIN_HARD'],
      rationale: 'OPTIMAL recovery + FRESH fatigue + peak ≤ 5 days → RACE_READY expected',
      weight: 3.0,
    },
    physiologicalConsistency: {
      acceptable: ['ALIGNED'],
      rationale: 'All three models point TRAIN direction — perfect alignment',
      weight: 2.0,
    },
    consistencyScoreRange: {
      min: 85,
      max: 100,
      rationale: 'All TRAIN directions → high consistency score',
      weight: 1.5,
    },
    confidenceRange: {
      min: 0.65,
      max: 1.0,
      rationale: 'High-quality data, all models available',
      weight: 1.0,
    },
    hasOpportunities: {
      acceptable: [true],
      rationale: 'RACE_READINESS opportunity must be detected when adaptation peak ≤ 7 days',
      weight: 2.0,
    },
  },
  physiologicalPhase: 'Pre-race taper — form peak',
  rationale:
    'Validates that the Reasoning Engine correctly identifies the supercompensation peak window ' +
    'and produces RACE_READY when all conditions align.',
  literature: [LIT.BUCHHEIT_2017, LIT.HALSON_2014],
};

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export const REASONING_BENCHMARK_SCENARIOS: readonly ReasoningBenchmarkScenario[] = [
  RE01,
  RE02,
  RE03,
  RE04,
  RE05,
];
