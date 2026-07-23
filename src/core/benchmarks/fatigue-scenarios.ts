/**
 * SHARPIT — Fatigue Intelligence Benchmark Scenarios
 *
 * Five canonical benchmark scenarios for the Fatigue Model v1.
 * These validate the model's physiological correctness across:
 *   F01 — Safe BUILD phase (low fatigue, growth opportunity)
 *   F02 — Pre-race TAPER (managed fatigue reduction, form emerging)
 *   F03 — Functional OVERREACHING (accumulated fatigue, mandatory reduction)
 *   F04 — Psychological dominant fatigue (non-training stressor pattern)
 *   F05 — Acute high-intensity session (metabolic dominant, same-day)
 *
 * Each scenario specifies:
 *   - Athlete profile and physiological context
 *   - DayFeatures input + FatigueModelContext
 *   - Weighted physiological expectations (with rationale)
 *   - Scientific justification and literature references
 */

import type { AthleteProfile, LiteratureReference } from './types';
import type {
  LoadFeatureSet,
  RecoveryFeatureSet,
  SessionFeatureSet,
  DayFeatures,
} from '@/core/features/types';
import type { FatigueModelContext } from '@/core/inference/fatigue/types';
import type { RecoveryState } from '@/core/digital-twin/types';

// ─────────────────────────────────────────────────────────────────────────────
// Fatigue-specific expectation types
// ─────────────────────────────────────────────────────────────────────────────

import type {
  FatigueLevel,
  FatigueType,
  TrainingCapacity,
  FatigueVerdict,
} from '@/core/inference/fatigue/types';
import type { OverreachingRisk } from '@/core/digital-twin/types';
import type { ValueExpectation, RangeExpectation } from './types';

export type FatiguePhysiologicalExpectations = {
  readonly fatigueLevel: ValueExpectation<FatigueLevel>;
  readonly fatigueType?: ValueExpectation<FatigueType>;
  readonly trainingCapacity: ValueExpectation<TrainingCapacity>;
  readonly verdict: ValueExpectation<FatigueVerdict>;
  readonly confidenceRange: RangeExpectation;
  readonly fatigueIndexRange?: RangeExpectation;
  readonly functionalOverreachingRisk?: ValueExpectation<OverreachingRisk>;
  readonly isAccumulating?: ValueExpectation<boolean>;
};

export type FatigueBenchmarkScenario = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly athlete: AthleteProfile;
  readonly features: DayFeatures;
  readonly context: FatigueModelContext;
  readonly expectations: FatiguePhysiologicalExpectations;
  readonly physiologicalPhase: string;
  readonly rationale: string;
  readonly literature: readonly LiteratureReference[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal factories
// ─────────────────────────────────────────────────────────────────────────────

function rec(overrides: Partial<RecoveryFeatureSet> = {}): RecoveryFeatureSet {
  return {
    trainingDayId: '2026-07-02',
    sleepEfficiencyPercent: null,
    sleepDebtMin: null,
    sleepOnsetConsistencyMin: null,
    sleepDurationTrend: null,
    hrvAbsolute: null,
    hrvDeltaFromBaseline: null,
    hrvCoefficientOfVariation: null,
    rhrAbsolute: null,
    rhrDeltaFromBaseline: null,
    subjectiveWellnessIndex: null,
    subjectiveWellnessComponents: null,
    rpeVsTargetZone: null,
    confidence: 0.85,
    algorithmId: 'recovery-features-v1',
    sourceObsIds: [],
    ...overrides,
  };
}

function ld(overrides: Partial<LoadFeatureSet> = {}): LoadFeatureSet {
  return {
    trainingDayId: '2026-07-02',
    acuteLoad: 280,
    chronicLoad: 280,
    acwr: 1.0,
    weeklyLoad: 280,
    loadMonotony: null,
    loadStrain: null,
    trainingFrequency: 5,
    restDayCount: 2,
    acuteChronicLoadTrend: 0,
    acuteLoadRun: null,
    acuteLoadBike: null,
    chronicLoadRun: null,
    chronicLoadBike: null,
    confidence: 0.9,
    algorithmId: 'load-features-v1',
    sourceObsIds: [],
    ...overrides,
  };
}

function sess(overrides: Partial<SessionFeatureSet> = {}): SessionFeatureSet {
  return {
    sessionObsId: 'bench-sess-1',
    trainingDayId: '2026-07-02',
    sportType: 'RUN',
    durationSec: 3600,
    tssScore: 60,
    tssMethod: 'PACE_BASED',
    intensityFactor: 0.75,
    aerobicLoadFactor: 0.8,
    anaerobicLoadFactor: 0.2,
    timeInZones: null,
    hrDriftPercent: 3,
    mechanicalLoad: null,
    elevationStressScore: null,
    efficiencyFactor: null,
    paceVariabilityIndex: null,
    subjectiveRpe: null,
    fosterSessionLoad: null,
    sourceProvidedTss: null,
    confidence: 0.8,
    algorithmId: 'session-features-v1',
    sourceObsIds: [],
    ...overrides,
  };
}

function day(
  features: {
    load?: LoadFeatureSet;
    recovery?: RecoveryFeatureSet;
    sessions?: SessionFeatureSet[];
  } = {},
): DayFeatures {
  return {
    athleteId: 'bench-athlete',
    trainingDayId: '2026-07-02',
    retrievedAt: new Date('2026-07-02'),
    sessions: features.sessions ?? [],
    load: features.load ?? ld(),
    recovery: features.recovery ?? rec(),
    body: 'PENDING',
    condition: 'PENDING',
  };
}

function ctx(overrides: Partial<FatigueModelContext> = {}): FatigueModelContext {
  return {
    athleteId: 'bench-athlete',
    trainingDayId: '2026-07-02',
    recoveryState: null,
    consecutiveAccumulationDays: 0,
    recentFatigueHistory: [],
    ...overrides,
  };
}

function recoveryState(overrides: Partial<RecoveryState> = {}): RecoveryState {
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

// ─────────────────────────────────────────────────────────────────────────────
// Athlete profiles
// ─────────────────────────────────────────────────────────────────────────────

const PROFILES: Record<string, AthleteProfile> = {
  INTERMEDIATE_TRIATHLETE: {
    id: 'INTERMEDIATE_TRIATHLETE',
    label: 'Intermediate Triathlete',
    experienceLevel: 'INTERMEDIATE',
    primarySport: 'TRIATHLON',
    description:
      '3-year triathlete, 8-12h/week, CTL ~65, training for Olympic distance. Consistent HRV data, manual subjective logs.',
  },
  ADVANCED_CYCLIST: {
    id: 'ADVANCED_CYCLIST',
    label: 'Advanced Cyclist',
    experienceLevel: 'ADVANCED',
    primarySport: 'CYCLING',
    description:
      '7-year cyclist, 12-16h/week, CTL ~90. Power meter training. High anaerobic capacity, known for pushing through fatigue.',
  },
  BEGINNER_RUNNER: {
    id: 'BEGINNER_RUNNER',
    label: 'Beginner Runner',
    experienceLevel: 'BEGINNER',
    primarySport: 'RUNNING',
    description:
      '6-month runner, 4-6h/week, CTL ~25. No HRV device, occasional RPE logs. Limited mechanical tolerance.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Literature references
// ─────────────────────────────────────────────────────────────────────────────

const LIT: Record<string, LiteratureReference> = {
  GABBETT_2016: {
    authors: 'Gabbett, T.J.',
    year: 2016,
    title:
      'The training-injury prevention paradox: should athletes be training smarter and harder?',
    journal: 'British Journal of Sports Medicine',
    doi: '10.1136/bjsports-2016-096308',
    evidenceLevel: 'L2',
  },
  FOSTER_1998: {
    authors: 'Foster, C.',
    year: 1998,
    title: 'Monitoring training in athletes with reference to overtraining syndrome',
    journal: 'Medicine & Science in Sports & Exercise',
    evidenceLevel: 'L3',
  },
  MEEUSEN_2013: {
    authors: 'Meeusen, R. et al.',
    year: 2013,
    title: 'Prevention, diagnosis, and treatment of the overtraining syndrome — joint consensus',
    journal: 'European Journal of Sport Science',
    evidenceLevel: 'L2',
  },
  COGGAN_2003: {
    authors: 'Coggan, A., Allen, H.',
    year: 2003,
    title: 'Training and Racing with a Power Meter',
    evidenceLevel: 'L5',
  },
  KELLMANN_2001: {
    authors: 'Kellmann, M., Kallus, K.W.',
    year: 2001,
    title: 'Recovery-Stress Questionnaire for Athletes',
    evidenceLevel: 'L3',
  },
  KENTTA_1998: {
    authors: 'Kenttä, G., Hassmén, P.',
    year: 1998,
    title: 'Overtraining and recovery: a conceptual model',
    journal: 'Sports Medicine',
    evidenceLevel: 'L4',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// F01 — Safe BUILD phase
// ─────────────────────────────────────────────────────────────────────────────

const F01_BUILD_PHASE: FatigueBenchmarkScenario = {
  id: 'F01-BUILD-PHASE',
  name: 'Safe build phase — ACWR in optimal zone',
  description:
    'Intermediate triathlete in week 3 of a build block. ACWR = 0.95, good sleep, positive subjective state. ' +
    'CTL is building progressively within safe parameters. This scenario validates that the model identifies a ' +
    'productive training state and recommends building rather than backing off.',
  athlete: PROFILES.INTERMEDIATE_TRIATHLETE!,
  features: day({
    load: ld({ acwr: 0.95, loadMonotony: 1.4, acuteLoad: 266, chronicLoad: 280 }),
    recovery: rec({
      sleepEfficiencyPercent: 83,
      sleepDebtMin: 20,
      subjectiveWellnessIndex: 7.8,
      subjectiveWellnessComponents: { mood: 4, energyLevel: 4, perceivedSoreness: 2 },
    }),
    sessions: [sess({ tssScore: 55, anaerobicLoadFactor: 0.15, hrDriftPercent: 2 })],
  }),
  context: ctx({
    recoveryState: recoveryState({ readinessScore: 74, readinessCategory: 'ADEQUATE' }),
    consecutiveAccumulationDays: 0,
    recentFatigueHistory: [38, 42, 35, 40, 44, 38, 36],
  }),
  expectations: {
    fatigueLevel: {
      acceptable: ['FRESH', 'FUNCTIONAL_LOW'],
      rationale:
        'ACWR 0.95 is below the safe zone ceiling (1.3). Fatigue index should be FRESH (0-20) or FUNCTIONAL_LOW (21-40). ' +
        'LoadFatigue = round(0.95/1.5×100) = 63 raw, but good subjective and minimal soreness pull the composite down.',
      weight: 2.0,
    },
    trainingCapacity: {
      acceptable: ['FULL'],
      rationale:
        'Productive training state with good recovery and safe load — full training capacity is appropriate.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['BUILD', 'MAINTAIN'],
      rationale:
        'ACWR < 1.0 with good subjective state signals a growth opportunity. BUILD or MAINTAIN is the correct recommendation. ' +
        'REDUCE or REST would be incorrect and would impede adaptation.',
      weight: 3.0,
    },
    confidenceRange: {
      min: 0.55,
      max: 1.0,
      rationale:
        'Multiple data sources available (load, recovery, session). Confidence should be moderate to high.',
      weight: 1.0,
    },
    functionalOverreachingRisk: {
      acceptable: ['LOW'],
      rationale:
        'No signs of overreaching. ACWR is safe, recovery is good, no consecutive accumulation days.',
      weight: 3.0,
    },
  },
  physiologicalPhase: 'Base Build week 3',
  rationale:
    'Validates that the Fatigue Model correctly identifies a productive training state. A false positive ' +
    '(over-flagging fatigue) in this scenario would incorrectly suppress training adaptation. ' +
    'The ACWR 0.8–1.3 zone is the established "sweet spot" for load management (Gabbett 2016).',
  literature: [LIT.GABBETT_2016!, LIT.COGGAN_2003!],
};

// ─────────────────────────────────────────────────────────────────────────────
// F02 — Pre-race TAPER
// ─────────────────────────────────────────────────────────────────────────────

const F02_PRE_RACE_TAPER: FatigueBenchmarkScenario = {
  id: 'F02-PRE-RACE-TAPER',
  name: 'Pre-race taper — fatigue dissipating, form emerging',
  description:
    'Advanced cyclist 5 days before an A-race. ACWR has dropped to 0.6 (load reduction phase). ' +
    'Previous build accumulated fatigue is clearing. The model should detect low/declining fatigue, ' +
    'good recovery, and a trajectory that is RESOLVING.',
  athlete: PROFILES.ADVANCED_CYCLIST!,
  features: day({
    load: ld({
      acwr: 0.6,
      loadMonotony: 0.8,
      acuteLoad: 168,
      chronicLoad: 280,
    }),
    recovery: rec({
      sleepEfficiencyPercent: 87,
      sleepDebtMin: 0,
      subjectiveWellnessIndex: 8.5,
      subjectiveWellnessComponents: { mood: 5, energyLevel: 5, perceivedSoreness: 1 },
    }),
    sessions: [sess({ tssScore: 30, anaerobicLoadFactor: 0.1, hrDriftPercent: 1 })],
  }),
  context: ctx({
    recoveryState: recoveryState({
      readinessScore: 85,
      readinessCategory: 'OPTIMAL',
      dimensions: {
        autonomic: { score: 90, status: 'ENHANCED', available: true },
        sleep: { score: 88, status: 'excellent', available: true },
        subjective: { score: 85, status: 'HIGH', available: true },
        loadContext: { score: 75, status: 'OPTIMAL', available: true },
      },
    }),
    consecutiveAccumulationDays: 0,
    // History shows declining fatigue — taper worked
    recentFatigueHistory: [28, 32, 38, 44, 50, 58, 62],
  }),
  expectations: {
    fatigueLevel: {
      acceptable: ['FRESH', 'FUNCTIONAL_LOW'],
      rationale:
        'ACWR 0.60 → LoadFatigue = round(0.60/1.5×100) = 40. Excellent subjective and autonomic state pull the composite to FRESH or FUNCTIONAL_LOW range. ' +
        'This is the expected physiological state 5 days before a race.',
      weight: 3.0,
    },
    trainingCapacity: {
      acceptable: ['FULL'],
      rationale:
        'Race-ready athlete with excellent recovery. Full training capacity confirms readiness.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['MAINTAIN', 'BUILD'],
      rationale:
        'Low ACWR may trigger BUILD signal, but pre-race context makes MAINTAIN or BUILD appropriate. ' +
        'REDUCE would be incorrect — the fatigue has already been managed.',
      weight: 2.0,
    },
    confidenceRange: {
      min: 0.5,
      max: 1.0,
      rationale:
        'Full data available, 7-day history. Confidence is moderate-high. ' +
        'PACE_BASED TSS method (qualityFactor 0.50) for the light taper session reduces ' +
        'metabolic confidence, pulling composite to ~0.56. 0.50 is the realistic floor.',
      weight: 1.0,
    },
    functionalOverreachingRisk: {
      acceptable: ['LOW'],
      rationale: 'No overreaching risk during successful taper.',
      weight: 3.0,
    },
  },
  physiologicalPhase: 'Race-week taper (day -5)',
  rationale:
    "Validates the model's ability to identify successful taper as a positive state (not undertrained). " +
    'The PMC model (Coggan) predicts that TSB becomes positive during taper, corresponding to form. ' +
    'A model that incorrectly classifies this as dangerous low ACWR would damage trust.',
  literature: [LIT.COGGAN_2003!, LIT.MEEUSEN_2013!],
};

// ─────────────────────────────────────────────────────────────────────────────
// F03 — Functional OVERREACHING
// ─────────────────────────────────────────────────────────────────────────────

const F03_FUNCTIONAL_OVERREACHING: FatigueBenchmarkScenario = {
  id: 'F03-FUNCTIONAL-OVERREACHING',
  name: 'Functional overreaching — 8 consecutive accumulation days',
  description:
    'Advanced cyclist who has been training at ACWR > 1.4 for 8 consecutive days. ' +
    'HRV is suppressed, sleep debt is accumulating, subjective scores are declining. ' +
    'This is a classic functional overreaching pattern. The model must correctly identify ' +
    'the overreaching risk and mandate load reduction.',
  athlete: PROFILES.ADVANCED_CYCLIST!,
  features: day({
    load: ld({
      acwr: 1.42,
      loadMonotony: 2.3, // high monotony amplifies load fatigue
      acuteLoad: 420,
      chronicLoad: 296,
    }),
    recovery: rec({
      sleepEfficiencyPercent: 72,
      sleepDebtMin: 240,
      subjectiveWellnessIndex: 4.5,
      subjectiveWellnessComponents: { mood: 2, energyLevel: 2, perceivedSoreness: 7 },
    }),
    sessions: [sess({ tssScore: 90, anaerobicLoadFactor: 0.45, hrDriftPercent: 12 })],
  }),
  context: ctx({
    recoveryState: recoveryState({
      readinessScore: 38,
      readinessCategory: 'LOW',
      overreachingRisk: 'HIGH',
      dissonanceDetected: false,
      dimensions: {
        autonomic: { score: 35, status: 'SUPPRESSED', available: true },
        sleep: { score: 40, status: 'INSUFFICIENT', available: true },
        subjective: { score: 30, status: 'LOW', available: true },
        loadContext: { score: 20, status: 'CRITICAL', available: true },
      },
    }),
    consecutiveAccumulationDays: 8,
    recentFatigueHistory: [72, 68, 65, 63, 60, 58, 55, 52],
  }),
  expectations: {
    fatigueLevel: {
      acceptable: ['ACCUMULATED', 'NON_FUNCTIONAL_RISK', 'OVERREACHING_RISK'],
      rationale:
        'ACWR 1.42 × monotony 2.3 penalty → LoadFatigue near 100. ' +
        'NeuromuscularFatigue elevated from suppressed autonomic score + high soreness. ' +
        'CumulativeTrajectory elevated from 8 consecutive days + 240min sleep debt. ' +
        'Composite should reach ACCUMULATED (61-75) or higher.',
      weight: 3.0,
    },
    trainingCapacity: {
      acceptable: ['LIGHT_ONLY', 'REST_ONLY'],
      rationale:
        'ACCUMULATED or higher fatigue with high monotony and suppressed recovery mandates ' +
        'light or rest-only training capacity. This is a safety-critical expectation.',
      weight: 3.0,
    },
    verdict: {
      acceptable: ['REDUCE', 'REST_WEEK'],
      rationale:
        'Load reduction is mandatory at this fatigue level. REDUCE or REST_WEEK are both correct. ' +
        'BUILD or MAINTAIN would be dangerous and constitute a safety failure.',
      weight: 3.0,
    },
    confidenceRange: {
      min: 0.5,
      max: 1.0,
      rationale:
        'Multiple data sources including HRV, sleep, subjective, load. Confidence should be moderate-high.',
      weight: 1.0,
    },
    functionalOverreachingRisk: {
      acceptable: ['HIGH', 'CRITICAL'],
      rationale:
        'ACWR > 1.3 for 8 consecutive days + suppressed autonomic score = HIGH or CRITICAL overreaching risk. ' +
        'This is the core physiological signal this scenario validates.',
      weight: 3.0,
    },
    isAccumulating: {
      acceptable: [true],
      rationale:
        'Fatigue history is monotonically increasing — trajectory is clearly accumulating.',
      weight: 2.0,
    },
  },
  physiologicalPhase: 'Overload week (unplanned) day 8',
  rationale:
    'The most safety-critical scenario in the Fatigue benchmark. ' +
    'Failure to detect functional overreaching is the primary harm scenario for SHARPIT. ' +
    'Meeusen et al. (2013) define functional overreaching as performance decrements that reverse ' +
    'with days to weeks of rest. This pattern (ACWR > 1.3 for ≥7 days, HRV suppressed, ' +
    'mood declining) is textbook functional overreaching.',
  literature: [LIT.MEEUSEN_2013!, LIT.GABBETT_2016!, LIT.FOSTER_1998!],
};

// ─────────────────────────────────────────────────────────────────────────────
// F04 — Psychological dominant fatigue
// ─────────────────────────────────────────────────────────────────────────────

const F04_PSYCHOLOGICAL_DOMINANT: FatigueBenchmarkScenario = {
  id: 'F04-PSYCHOLOGICAL-DOMINANT',
  name: 'Psychological dominant fatigue — non-training stressor',
  description:
    'Intermediate triathlete with very low training load (ACWR 0.45 — rest week/illness recovery) ' +
    'but severely depressed mood and energy (1/5 scale). This pattern is consistent with non-training ' +
    'stressors (work stress, life events, mild illness). The model should identify the fatigue type as ' +
    'PSYCHOLOGICAL_DOMINANT and avoid attributing it to training load.',
  athlete: PROFILES.INTERMEDIATE_TRIATHLETE!,
  features: day({
    load: ld({ acwr: 0.45, loadMonotony: 0.5, acuteLoad: 126, chronicLoad: 280 }),
    recovery: rec({
      sleepEfficiencyPercent: 75,
      sleepDebtMin: 90,
      subjectiveWellnessIndex: 2.5,
      subjectiveWellnessComponents: { mood: 1, energyLevel: 1, perceivedSoreness: 2 },
    }),
    sessions: [],
  }),
  context: ctx({
    recoveryState: recoveryState({
      readinessScore: 50,
      readinessCategory: 'REDUCED',
      illnessRisk: 'LOW',
      dissonanceDetected: false,
      dimensions: {
        autonomic: { score: 68, status: 'NORMAL', available: true },
        sleep: { score: 60, status: 'adequate', available: true },
        subjective: { score: 20, status: 'VERY_LOW', available: true },
        loadContext: { score: 80, status: 'UNDERTRAINED', available: true },
      },
    }),
    consecutiveAccumulationDays: 1,
    recentFatigueHistory: [45, 40, 38, 35, 30, 28, 25],
  }),
  expectations: {
    fatigueLevel: {
      acceptable: ['FUNCTIONAL_LOW', 'FUNCTIONAL_HIGH', 'ACCUMULATED'],
      rationale:
        'LoadFatigue is low (ACWR 0.45 → ~30). Metabolic fatigue is minimal (no sessions). ' +
        'PsychologicalFatigue is very high (mood=1, energy=1 → 90). ' +
        'The composite will be pulled into FUNCTIONAL_LOW or FUNCTIONAL_HIGH range by the dominant psychological signal.',
      weight: 2.0,
    },
    fatigueType: {
      acceptable: ['PSYCHOLOGICAL_DOMINANT', 'MIXED'],
      rationale:
        'With LoadFatigue ~30 and PsychologicalFatigue ~90, the dominant dimension is clearly psychological. ' +
        'The model should identify this as PSYCHOLOGICAL_DOMINANT (or MIXED if load and psych are within 10pts).',
      weight: 3.0,
    },
    trainingCapacity: {
      acceptable: ['FULL', 'REDUCED'],
      rationale:
        'Load fatigue is low — the physical capacity is intact. But psychological fatigue limits motivation. ' +
        'FULL or REDUCED are appropriate given the non-training origin of the fatigue.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['MAINTAIN', 'REDUCE'],
      rationale:
        'The correct recommendation is to investigate the stressor, not to drastically reduce training. ' +
        'MAINTAIN (hold current volume) or REDUCE slightly is appropriate.',
      weight: 2.0,
    },
    confidenceRange: {
      min: 0.4,
      max: 0.85,
      rationale: 'Subjective-only fatigue signal has lower confidence ceiling (0.80 per spec).',
      weight: 1.0,
    },
    functionalOverreachingRisk: {
      acceptable: ['LOW', 'MODERATE'],
      rationale:
        'Despite high psychological fatigue, training-origin overreaching risk should be LOW ' +
        'because load is very low. The illness guard does not apply (illnessRisk = LOW).',
      weight: 2.0,
    },
  },
  physiologicalPhase: 'Rest week / external stressor week',
  rationale:
    "Validates the model's ability to distinguish psychological fatigue from training fatigue. " +
    'Kenttä & Hassmén (1998) document the prevalence of non-training psychological fatigue in athletes. ' +
    'This scenario prevents the model from incorrectly attributing all fatigue to training load, ' +
    'which would cause the model to recommend unnecessary training reduction.',
  literature: [LIT.KENTTA_1998!, LIT.KELLMANN_2001!],
};

// ─────────────────────────────────────────────────────────────────────────────
// F05 — Acute high-intensity session (metabolic dominant)
// ─────────────────────────────────────────────────────────────────────────────

const F05_ACUTE_HIGH_INTENSITY: FatigueBenchmarkScenario = {
  id: 'F05-ACUTE-HIGH-INTENSITY',
  name: 'Acute high-intensity session — metabolic dominant fatigue',
  description:
    'Beginner runner who completed their first VO2max interval session (90% anaerobic load, ' +
    'HR drift 18%, 80 TSS). No prior accumulated fatigue. The model should flag ' +
    'metabolic fatigue as the dominant acute dimension while keeping overall fatigue manageable, ' +
    'since this is an isolated event with no history of accumulation.',
  athlete: PROFILES.BEGINNER_RUNNER!,
  features: day({
    load: ld({ acwr: 1.05, loadMonotony: 1.6, acuteLoad: 294, chronicLoad: 280 }),
    recovery: rec({
      sleepEfficiencyPercent: 80,
      sleepDebtMin: 30,
      subjectiveWellnessIndex: 6.0,
      subjectiveWellnessComponents: { mood: 3, energyLevel: 3, perceivedSoreness: 5 },
    }),
    sessions: [
      sess({
        sportType: 'RUN',
        tssScore: 80,
        tssMethod: 'RPE_BASED',
        anaerobicLoadFactor: 0.9,
        hrDriftPercent: 18,
        aerobicLoadFactor: 0.1,
      }),
    ],
  }),
  context: ctx({
    recoveryState: recoveryState({
      readinessScore: 62,
      readinessCategory: 'REDUCED',
      dimensions: {
        autonomic: { score: 65, status: 'NORMAL', available: true },
        sleep: { score: 68, status: 'adequate', available: true },
        subjective: { score: 55, status: 'NORMAL', available: true },
        loadContext: { score: 55, status: 'ELEVATED', available: true },
      },
    }),
    consecutiveAccumulationDays: 0,
    recentFatigueHistory: [35, 40, 38, 42, 36, 40, 38],
  }),
  expectations: {
    fatigueLevel: {
      acceptable: ['FUNCTIONAL_LOW', 'FUNCTIONAL_HIGH'],
      rationale:
        'LoadFatigue ≈ 70 (ACWR 1.05). MetabolicFatigue = high from 90% anaerobic load × 80 TSS. ' +
        'NeuromuscularFatigue: moderate from soreness (5/10) and RUN mechanical factor. ' +
        'CumulativeTrajectory: 0 accumulation days. Composite should land in FUNCTIONAL range (21-60).',
      weight: 2.0,
    },
    fatigueType: {
      acceptable: ['METABOLIC_DOMINANT', 'LOAD_DOMINANT', 'MIXED'],
      rationale:
        'MetabolicFatigue is the highest acute dimension (90% anaerobic load + 18% HR drift amplifier). ' +
        'METABOLIC_DOMINANT is expected but LOAD_DOMINANT or MIXED are acceptable if load scores higher.',
      weight: 2.0,
    },
    trainingCapacity: {
      acceptable: ['REDUCED', 'FULL'],
      rationale:
        'After a high-intensity session, REDUCED capacity tomorrow is appropriate for recovery. ' +
        'FULL is acceptable if the model determines overall fatigue is still FUNCTIONAL_LOW.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['MAINTAIN', 'REDUCE'],
      rationale:
        'After an isolated high-intensity session, the recommendation should be MAINTAIN or REDUCE ' +
        'to allow metabolic recovery. BUILD would be inappropriate. REST_WEEK would be an overreaction.',
      weight: 2.0,
    },
    confidenceRange: {
      min: 0.35,
      max: 0.8,
      rationale:
        'Session data is RPE-based (lower quality) and beginner has limited history. ' +
        'Confidence ceiling should be below 0.80.',
      weight: 1.0,
    },
    functionalOverreachingRisk: {
      acceptable: ['LOW', 'MODERATE'],
      rationale:
        'This is an isolated event with zero consecutive accumulation days. ' +
        'Overreaching risk should remain LOW or at most MODERATE.',
      weight: 3.0,
    },
  },
  physiologicalPhase: 'Intensity week — day after VO2max session',
  rationale:
    "Validates the model's ability to identify acute metabolic fatigue from a single high-intensity " +
    'session without over-generalizing to long-term overreaching risk. HR drift > 15% is a validated ' +
    'marker of glycogen depletion (Gabbett 2016). The 90% anaerobic load with 18% HR drift should produce ' +
    'the highest same-day metabolic fatigue index in this scenario set.',
  literature: [LIT.GABBETT_2016!, LIT.FOSTER_1998!],
};

// ─────────────────────────────────────────────────────────────────────────────
// Public export
// ─────────────────────────────────────────────────────────────────────────────

export const FATIGUE_BENCHMARK_SCENARIOS: readonly FatigueBenchmarkScenario[] = [
  F01_BUILD_PHASE,
  F02_PRE_RACE_TAPER,
  F03_FUNCTIONAL_OVERREACHING,
  F04_PSYCHOLOGICAL_DOMINANT,
  F05_ACUTE_HIGH_INTENSITY,
];
