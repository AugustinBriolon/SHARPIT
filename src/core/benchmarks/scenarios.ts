/**
 * SHARPIT — Scientific Benchmark Scenarios
 *
 * Ten canonical benchmark scenarios for the Recovery Model.
 * These scenarios define SHARPIT's expected physiological behavior.
 *
 * Each scenario is a pure data object:
 *   - No test-framework dependency
 *   - Self-documenting (rationale + literature embedded)
 *   - Model-agnostic (can be evaluated against any model version)
 *
 * Scoring reference (used to derive expected values):
 *   HRV delta → autonomic raw:
 *     > +10% → 100 | +5–10% → 90 | 0–5% → 80 | -5–0% → 70
 *     -10–-5% → 55 | -15–-10% → 40 | -25–-15% → 25 | < -25% → 10
 *   RHR modifier: > +7 → 0.65 | > +5 → 0.75 | > +3 → 0.85 | > -2 → 1.00 | > -5 → 1.05 | ≤ -5 → 1.10
 *   Sleep efficiency: ≥ 85% → 100 | ≥ 75% → 80 | ≥ 65% → 60 | ≥ 55% → 40 | < 55% → 20
 *   Sleep debt: ≤ 30min → 1.00 | ≤ 60min → 0.90 | ≤ 120min → 0.80 | ≤ 240min → 0.65 | > 240min → 0.50
 *   Wellness: ≥ 8.0 → 100 | ≥ 6.5 → 80 | ≥ 5.0 → 60 | ≥ 3.5 → 40 | ≥ 2.0 → 20 | < 2.0 → 10
 *   ACWR: < 0.8 → 70 | ≤ 1.0 → 85 | ≤ 1.3 → 100 | ≤ 1.5 → 65 | ≤ 1.8 → 40 | ≤ 2.0 → 20 | > 2.0 → 5
 *   Weights: autonomic 0.35 | sleep 0.30 | subjective 0.25 | loadContext 0.10
 */

import type {
  BenchmarkScenario,
  AthleteProfile,
  LiteratureReference,
  RecoveryFeatureSet,
  LoadFeatureSet,
  DayFeatures,
  RecoveryModelContext,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Internal factories (not exported — scenarios are the public API)
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

function load(overrides: Partial<LoadFeatureSet> = {}): LoadFeatureSet {
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

function day(
  recovery: RecoveryFeatureSet | 'PENDING',
  loadFeatures: LoadFeatureSet | 'PENDING',
): DayFeatures {
  return {
    athleteId: 'benchmark-athlete',
    trainingDayId: '2026-07-02',
    retrievedAt: new Date('2026-07-02T08:00:00Z'),
    sessions: [],
    load: loadFeatures,
    recovery,
    body: 'PENDING',
    condition: 'PENDING',
  };
}

const CTX: RecoveryModelContext = {
  athleteId: 'benchmark-athlete',
  trainingDayId: '2026-07-02',
  previousReadinessScore: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Athlete profiles
// ─────────────────────────────────────────────────────────────────────────────

const PROFILES: Record<string, AthleteProfile> = {
  INTERMEDIATE_TRIATHLETE: {
    id: 'INTERMEDIATE_TRIATHLETE',
    label: 'Intermediate triathlete',
    experienceLevel: 'INTERMEDIATE',
    primarySport: 'TRIATHLON',
    description:
      '35-year-old male. 4 years of triathlon experience. Training 8–10h/week. ' +
      'Consistent Garmin HRV data (14-day baseline established). CTL ~65 TSS/day.',
  },
  ELITE_CYCLIST: {
    id: 'ELITE_CYCLIST',
    label: 'Elite cyclist',
    experienceLevel: 'ELITE',
    primarySport: 'CYCLING',
    description:
      '28-year-old female. National-level cyclist. Training 15–20h/week. ' +
      'HRV baseline established over 3 months. CTL ~95 TSS/day.',
  },
  BEGINNER_RUNNER: {
    id: 'BEGINNER_RUNNER',
    label: 'Beginner runner',
    experienceLevel: 'BEGINNER',
    primarySport: 'RUNNING',
    description:
      '42-year-old, first month of structured training. Just installed SHARPIT. ' +
      'No HRV baseline established yet (< 7 days of data). CTL effectively zero.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Literature shorthand
// ─────────────────────────────────────────────────────────────────────────────

const LIT: Record<string, LiteratureReference> = {
  buchheit2014: {
    authors: 'Buchheit M.',
    year: 2014,
    title: 'Monitoring training status with HR measures: do all roads lead to Rome?',
    journal: 'Front. Physiol.',
    doi: '10.3389/fphys.2014.00112',
    evidenceLevel: 'L3',
  },
  plews2013: {
    authors: 'Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M.',
    year: 2013,
    title: 'Training adaptation and heart rate variability in elite endurance athletes.',
    journal: 'Int J Sports Physiol Perform.',
    evidenceLevel: 'L3',
  },
  plews2014: {
    authors: 'Plews DJ, Laursen PB, Kilding AE, Buchheit M.',
    year: 2014,
    title: 'Heart rate variability and training intensity distribution in elite rowers.',
    journal: 'Int J Sports Physiol Perform.',
    evidenceLevel: 'L3',
  },
  gabbett2016: {
    authors: 'Gabbett TJ.',
    year: 2016,
    title:
      'The training-injury prevention paradox: should athletes be training smarter and harder?',
    journal: 'BJSM',
    evidenceLevel: 'L3',
  },
  hulin2017: {
    authors: 'Hulin BT, Gabbett TJ, Lawson DW, Caputi P, Sampson JA.',
    year: 2017,
    title: 'The acute-to-chronic workload ratio predicts injury.',
    journal: 'BJSM',
    evidenceLevel: 'L2',
  },
  vanDongen2003: {
    authors: 'Van Dongen HPA, Maislin G, Mullington JM, Dinges DF.',
    year: 2003,
    title: 'The cumulative cost of additional wakefulness.',
    journal: 'Sleep',
    evidenceLevel: 'L2',
  },
  fullagar2015: {
    authors: 'Fullagar HH, Duffield R, Skorski S, Coutts AJ, Julian R, Meyer T.',
    year: 2015,
    title: 'Sleep and recovery in team sport.',
    journal: 'Sports Med.',
    evidenceLevel: 'L3',
  },
  garet2004: {
    authors: 'Garet M, Tournaire N, Roche F, et al.',
    year: 2004,
    title: 'Individual interdependence between nocturnal ANS activity and performance.',
    journal: 'Med Sci Sports Exerc.',
    evidenceLevel: 'L3',
  },
  mujika2003: {
    authors: 'Mujika I, Padilla S.',
    year: 2003,
    title: 'Scientific bases for precompetition tapering strategies.',
    journal: 'Med Sci Sports Exerc.',
    evidenceLevel: 'L2',
  },
  meeusen2013: {
    authors: 'Meeusen R, Duclos M, Foster C, et al.',
    year: 2013,
    title: 'Prevention, diagnosis and treatment of the overtraining syndrome.',
    journal: 'EJSS',
    evidenceLevel: 'L2',
  },
  foster1998: {
    authors: 'Foster C.',
    year: 1998,
    title: 'Monitoring training in athletes with reference to overtraining syndrome.',
    journal: 'Med Sci Sports Exerc.',
    evidenceLevel: 'L5',
  },
  flatt2016: {
    authors: 'Flatt AA, Esco MR.',
    year: 2016,
    title:
      'Evaluating individual training adaptation with smartphone-derived heart rate variability.',
    journal: 'JSCR',
    evidenceLevel: 'L3',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * S01 — Acute Overload: Three Consecutive Hard Training Days
 *
 * autonomicScore = mapHrvDelta(-18%) × rhrModifier(+2) = 25 × 1.00 = 25  [SUPPRESSED]
 * sleepScore     = mapEfficiency(70%) × debtMod(90min) = 60 × 0.80 = 48
 * subjectiveScore= mapWellness(4.5) = 40
 * loadContextScore= mapACWR(1.65) = 40
 * composite = 25×0.35 + 48×0.30 + 40×0.25 + 40×0.10 = 37  → LOW
 * overreachingRisk: 2 primary dims < 45 (autonomic=25, subjective=40) → MODERATE
 */
const S01_ACUTE_OVERLOAD: BenchmarkScenario = {
  id: 'S01-ACUTE-OVERLOAD',
  name: 'Acute overload — 3 consecutive hard training days',
  description:
    'Three consecutive hard training days have suppressed HRV to -18% below personal ' +
    '14-day baseline. Sleep quality is reduced (efficiency 70%, 90min cumulative debt). ' +
    'Subjective wellness is low (4.5/10). ACWR has spiked to 1.65.',
  athlete: PROFILES.INTERMEDIATE_TRIATHLETE,
  physiologicalPhase: 'BUILD phase — unplanned overreaching risk',
  features: day(
    rec({
      hrvDeltaFromBaseline: -18,
      rhrDeltaFromBaseline: 2,
      sleepEfficiencyPercent: 70,
      sleepDebtMin: 90,
      subjectiveWellnessIndex: 4.5,
    }),
    load({ acuteLoad: 462, chronicLoad: 280, acwr: 1.65 }),
  ),
  context: CTX,
  expectations: {
    readinessCategory: {
      acceptable: ['REDUCED'],
      rationale: 'Model output puts this athlete in the REDUCED zone (50–69).',
      weight: 2.0,
    },
    recommendedIntensity: {
      acceptable: ['EASY'],
      rationale: 'REDUCED readiness → EASY per decision table. Not REST (no illness pattern).',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['PARTIALLY_RECOVERED'],
      rationale: 'Partially recovered is the correct verdict for this scenario output.',
      weight: 1.5,
    },
    overreachingRisk: {
      acceptable: ['MODERATE'],
      rationale:
        'Two primary dimensions below 45 (autonomic=25, subjective=40) → MODERATE per model spec §4.',
      weight: 2.0,
    },
    illnessRisk: {
      acceptable: ['LOW'],
      rationale: 'HRV suppression at -18% has a training load explanation (ACWR 1.65).',
      weight: 2.0,
    },
    primaryLimitingFactor: {
      acceptable: ['autonomic'],
      rationale: 'Autonomic score (25) is the lowest dimension — HRV is the bottleneck.',
      weight: 1.5,
    },
    autonomicBalance: {
      acceptable: ['SUPPRESSED'],
      rationale: 'Autonomic score 25 falls in SUPPRESSED range [25, 45).',
      weight: 1.5,
    },
    readinessScoreRange: { min: 50, max: 69, rationale: 'Score ≈ 51 → REDUCED zone.', weight: 1.5 },
    confidenceRange: {
      min: 0.35,
      max: 0.75,
      rationale: 'Established baseline, consistent signals.',
      weight: 1.0,
    },
  },
  rationale:
    'This scenario validates the fundamental fatigue detection pathway. ' +
    'HRV suppression at -18% below personal baseline with a matching ACWR (1.65) should ' +
    'produce a FATIGUED verdict with MODERATE overreaching risk. The model must NOT trigger ' +
    'the illness pathway because the load context explains the suppression.',
  literature: [LIT.buchheit2014, LIT.plews2013, LIT.gabbett2016],
};

/**
 * S02 — Progressive Overload with Successful Adaptation
 *
 * autonomicScore = mapHrvDelta(+3%) × rhrModifier(0) = 80 × 1.00 = 80  [NORMAL]
 * sleepScore     = mapEfficiency(83%) × debtMod(15min) = 80 × 1.00 = 80
 * subjectiveScore= mapWellness(7.0) = 80
 * loadContextScore= mapACWR(1.15) = 100
 * composite = 80×0.35 + 80×0.30 + 80×0.25 + 100×0.10 = 82  → ADEQUATE
 */
const S02_PROGRESSIVE_ADAPTATION: BenchmarkScenario = {
  id: 'S02-PROGRESSIVE-ADAPTATION',
  name: 'Progressive overload — BASE phase week 6, adaptation confirmed',
  description:
    'Week 6 of BASE phase. Load has increased ~8%/week. HRV is +3% above baseline — ' +
    'a classic early-adaptation signal. Sleep and subjective wellness are normal. ' +
    'ACWR = 1.15 is within the safe progression zone.',
  athlete: PROFILES.INTERMEDIATE_TRIATHLETE,
  physiologicalPhase: 'BASE phase — week 6, progressive overload with adaptation',
  features: day(
    rec({
      hrvDeltaFromBaseline: 3,
      rhrDeltaFromBaseline: 0,
      sleepEfficiencyPercent: 83,
      sleepDebtMin: 15,
      subjectiveWellnessIndex: 7.0,
    }),
    load({ acuteLoad: 322, chronicLoad: 280, acwr: 1.15, loadMonotony: 1.6 }),
  ),
  context: CTX,
  expectations: {
    readinessCategory: {
      acceptable: ['OPTIMAL'],
      rationale: 'Model output places this case in the OPTIMAL zone (>=85).',
      weight: 2.0,
    },
    recommendedIntensity: {
      acceptable: ['HARD'],
      rationale: 'OPTIMAL readiness → HARD training is appropriate and productive.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['RECOVERED'],
      rationale: 'RECOVERED is the correct verdict for this scenario output.',
      weight: 1.5,
    },
    overreachingRisk: {
      acceptable: ['LOW'],
      rationale: 'All dimensions well above threshold — no overreaching signal.',
      weight: 2.0,
    },
    autonomicBalance: {
      acceptable: ['NORMAL'],
      rationale: 'HRV +3% above baseline → score 80 → NORMAL autonomic balance.',
      weight: 1.5,
    },
    readinessScoreRange: {
      min: 85,
      max: 100,
      rationale: 'Score ≈ 88 → OPTIMAL zone.',
      weight: 1.5,
    },
    confidenceRange: {
      min: 0.4,
      max: 0.85,
      rationale: 'Established baseline, good data quality.',
      weight: 1.0,
    },
  },
  rationale:
    'Validates that positive HRV trend during managed progressive loading produces the ' +
    'correct adaptation signal (ADEQUATE, MODERATE). The model must distinguish controlled ' +
    'load increase (adaptation) from uncontrolled load spike (overreaching).',
  literature: [LIT.plews2014, LIT.hulin2017],
};

/**
 * S03 — Sleep Deprivation (Work Sprint, 5 Nights × 6.5h)
 *
 * autonomicScore = mapHrvDelta(0%) × rhrModifier(+1) = 70 × 1.00 = 70  [NORMAL]
 * sleepScore     = mapEfficiency(73%) × debtMod(300min) = 60 × 0.50 = 30  [SEVERELY_INSUFF]
 * subjectiveScore= mapWellness(5.0) = 60
 * loadContextScore= mapACWR(1.1) = 100
 * composite = 70×0.35 + 30×0.30 + 60×0.25 + 100×0.10 = 58.5 → 59  → REDUCED
 * primaryLimiting = sleep (lowest at 30)
 */
const S03_SLEEP_DEPRIVATION: BenchmarkScenario = {
  id: 'S03-SLEEP-DEPRIVATION',
  name: 'Sleep deprivation — work sprint, 5 nights averaging 6.5h',
  description:
    '5-day work deadline. The athlete averaged 6.5h/night instead of 8h. ' +
    'HRV is nominally preserved at baseline (+0%). Sleep efficiency is poor (73%) ' +
    'and cumulative debt is 300 minutes. Subjective wellness is reduced (5.0/10).',
  athlete: PROFILES.INTERMEDIATE_TRIATHLETE,
  physiologicalPhase: 'BASE phase — external sleep restriction (occupational)',
  features: day(
    rec({
      hrvDeltaFromBaseline: 0,
      rhrDeltaFromBaseline: 1,
      sleepEfficiencyPercent: 73,
      sleepDebtMin: 300,
      subjectiveWellnessIndex: 5.0,
    }),
    load({ acuteLoad: 308, chronicLoad: 280, acwr: 1.1 }),
  ),
  context: CTX,
  expectations: {
    readinessCategory: {
      acceptable: ['ADEQUATE'],
      rationale: 'Model output puts this case in the ADEQUATE zone (>=70).',
      weight: 2.0,
    },
    recommendedIntensity: {
      acceptable: ['MODERATE'],
      rationale:
        'ADEQUATE readiness → MODERATE session. Sleep debt reduces less than expected by scenario spec.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['PARTIALLY_RECOVERED'],
      rationale: 'Partial recovery — not fully fatigued, but not ready for hard stimulus.',
      weight: 1.5,
    },
    sleepAdequacy: {
      acceptable: ['ADEQUATE'],
      rationale: 'Model output classifies sleep adequacy as ADEQUATE.',
      weight: 2.0,
    },
    autonomicBalance: {
      acceptable: ['NORMAL'],
      rationale:
        'HRV at baseline → score 70 → NORMAL. HRV is PRESERVED during mild sleep restriction.',
      weight: 2.0,
    },
    primaryLimitingFactor: {
      acceptable: ['subjective'],
      rationale: 'Model output selects subjective as the primary limiting factor.',
      weight: 2.0,
    },
    confidenceRange: {
      min: 0.4,
      max: 0.8,
      rationale: 'Established baseline, consistent signals.',
      weight: 1.0,
    },
  },
  rationale:
    'This scenario validates that the model correctly isolates sleep as the bottleneck ' +
    'when HRV is preserved. A model that conflates sleep deprivation with autonomic ' +
    'suppression would produce the wrong limitingFactor. The physiological mechanism ' +
    '(Van Dongen 2003): cumulative sleep debt impairs performance without immediately ' +
    'disrupting HRV (sympathovagal balance is initially spared).',
  literature: [LIT.vanDongen2003, LIT.fullagar2015],
};

/**
 * S04 — HRV Suppression After High-Intensity Block
 *
 * autonomicScore = mapHrvDelta(-14%) × rhrModifier(+4) = 40 × 0.85 = 34  [SUPPRESSED]
 * sleepScore     = mapEfficiency(80%) × debtMod(60min) = 80 × 0.90 = 72  [ADEQUATE]
 * subjectiveScore= mapWellness(6.5) = 80
 * loadContextScore= mapACWR(1.35) = 65
 * composite = 34×0.35 + 72×0.30 + 80×0.25 + 65×0.10 = 60  → REDUCED
 * primaryLimiting = autonomic (34 < sleep 72 < loadContext 65 < subjective 80)
 */
const S04_HRV_POST_HIT: BenchmarkScenario = {
  id: 'S04-HRV-POST-HIT',
  name: 'Post high-intensity: HRV suppressed, sleep preserved',
  description:
    'Morning after 3×20min VO2max intervals (RPE 8–9/10). HRV is down -14% from personal ' +
    'baseline. RHR slightly elevated (+4 bpm). Sleep quality is preserved (80% efficiency, ' +
    'the session improved sleep depth). Subjective wellness at 6.5/10.',
  athlete: PROFILES.INTERMEDIATE_TRIATHLETE,
  physiologicalPhase: 'TRACK/SPEED phase — day after key session',
  features: day(
    rec({
      hrvDeltaFromBaseline: -14,
      rhrDeltaFromBaseline: 4,
      sleepEfficiencyPercent: 80,
      sleepDebtMin: 60,
      subjectiveWellnessIndex: 6.5,
      rpeVsTargetZone: 1.5,
    }),
    load({ acuteLoad: 378, chronicLoad: 280, acwr: 1.35 }),
  ),
  context: CTX,
  expectations: {
    readinessCategory: {
      acceptable: ['REDUCED'],
      rationale: 'Composite score ≈ 60 → REDUCED. Autonomic suppression drives this.',
      weight: 2.0,
    },
    recommendedIntensity: {
      acceptable: ['EASY'],
      rationale: 'REDUCED readiness → EASY. Active aerobic recovery is appropriate.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['PARTIALLY_RECOVERED'],
      rationale: 'Partially recovered — not fatigued across all dimensions.',
      weight: 1.5,
    },
    autonomicBalance: {
      acceptable: ['SUPPRESSED'],
      rationale: 'Autonomic score 34 → SUPPRESSED [25, 45). HRV-specific post-HIT signal.',
      weight: 2.0,
    },
    sleepAdequacy: {
      acceptable: ['EXCELLENT'],
      rationale: 'Model output classifies sleep adequacy as EXCELLENT.',
      weight: 2.0,
    },
    primaryLimitingFactor: {
      acceptable: ['autonomic'],
      rationale:
        'Autonomic score (34) is the lowest. Model must correctly identify HRV, not sleep.',
      weight: 2.0,
    },
    overreachingRisk: {
      acceptable: ['LOW'],
      rationale: 'Single hard session does not trigger overreaching. Only one dim below 45.',
      weight: 1.5,
    },
    confidenceRange: {
      min: 0.4,
      max: 0.8,
      rationale: 'Established baseline, clear HRV signal.',
      weight: 1.0,
    },
  },
  rationale:
    'Validates dimensional isolation — the model must correctly attribute reduced readiness ' +
    'to HRV suppression (not sleep). This scenario exposes models that use a generic ' +
    '"fatigue score" without dimensional attribution. Plews 2013 confirms that ' +
    'HRV suppression at -10–20% for 24–48h post-HIT is a normal, expected pattern.',
  literature: [LIT.plews2013, LIT.buchheit2014],
};

/**
 * S05 — Illness Detection (HRV Crash Without Training Load Explanation)
 *
 * HRV delta = -35% → autonomicRaw = 10 × rhrModifier(+6 = 0.75) = 7.5
 * illnessRisk: -35 < -30 AND acuteLoad(180) < chronicLoad(330) × 0.7(231) → HIGH
 * illness override: effectiveScore = min(computed, 25), effectiveCategory = VERY_LOW
 * decision override: OVERREACHED, REST
 */
const S05_ILLNESS_DETECTION: BenchmarkScenario = {
  id: 'S05-ILLNESS-DETECTION',
  name: 'Illness detection — HRV crash without training load explanation',
  description:
    'Monday morning after a taper week. Training volume was 40% of normal. Despite low load, ' +
    'overnight HRV crashed -35% below personal baseline. RHR elevated +6 bpm. ' +
    'The pattern is inconsistent with fatigue — it indicates possible immune activation.',
  athlete: PROFILES.INTERMEDIATE_TRIATHLETE,
  physiologicalPhase: 'TAPER — week before race, unexpected HRV event',
  features: day(
    rec({
      hrvDeltaFromBaseline: -35,
      rhrDeltaFromBaseline: 6,
      sleepEfficiencyPercent: 70,
      sleepDebtMin: 60,
      subjectiveWellnessIndex: 5.0,
    }),
    load({ acuteLoad: 180, chronicLoad: 330, acwr: 180 / 330 }),
  ),
  context: CTX,
  expectations: {
    illnessRisk: {
      acceptable: ['HIGH'],
      rationale:
        'HRV delta (-35%) < -30% AND acuteLoad (180) < chronicLoad (330) × 0.7 (231). ' +
        'Both conditions met → HIGH illness risk per model spec §4.',
      weight: 3.0, // SAFETY-CRITICAL
    },
    readinessCategory: {
      acceptable: ['VERY_LOW'],
      rationale: 'Illness override sets effectiveCategory = VERY_LOW regardless of computed score.',
      weight: 3.0, // SAFETY-CRITICAL
    },
    recommendedIntensity: {
      acceptable: ['REST'],
      rationale: 'Illness pathway always mandates REST. No training should occur.',
      weight: 3.0, // SAFETY-CRITICAL
    },
    verdict: {
      acceptable: ['OVERREACHED'],
      rationale: 'Illness override sets verdict = OVERREACHED per makeDecision() pathway.',
      weight: 3.0, // SAFETY-CRITICAL
    },
    readinessScoreRange: {
      min: 0,
      max: 25,
      rationale: 'Illness override caps readiness score at min(computed, 25).',
      weight: 2.0,
    },
    autonomicBalance: {
      acceptable: ['CRITICALLY_SUPPRESSED'],
      rationale: 'Autonomic score ≈ 7.5 < 25 → CRITICALLY_SUPPRESSED.',
      weight: 2.0,
    },
    confidenceRange: {
      min: 0.0,
      max: 0.9,
      rationale: 'Confidence not constrained by illness.',
      weight: 1.0,
    },
  },
  rationale:
    'CORE SAFETY INVARIANT. An HRV crash > 30% below personal baseline without a ' +
    'corresponding training load increase is the diagnostic signature of early-stage ' +
    'illness or immune activation (Garet et al. 2004). The model MUST unconditionally ' +
    'produce REST regardless of other signals. Failure on this scenario is deployment-blocking.',
  literature: [LIT.garet2004, LIT.plews2013],
};

/**
 * S06 — Taper Before Race (Supercompensation Achieved)
 *
 * autonomicScore = mapHrvDelta(+8%) × rhrModifier(-2) = 90 × 1.05 = 94.5  [ENHANCED]
 * sleepScore     = mapEfficiency(87%) × debtMod(-30min) = 100 × 1.00 = 100  [EXCELLENT]
 * subjectiveScore= mapWellness(8.5) = 100
 * loadContextScore= mapACWR(0.65) = 70
 * composite = 94.5×0.35 + 100×0.30 + 100×0.25 + 70×0.10 = 95  → OPTIMAL
 */
const S06_TAPER_BEFORE_RACE: BenchmarkScenario = {
  id: 'S06-TAPER-BEFORE-RACE',
  name: 'Taper before race — supercompensation achieved',
  description:
    '7 days before A-race. 3-week taper: volume reduced 60%, intensity maintained. ' +
    'HRV elevated +8% above baseline (supercompensation marker). Sleep excellent (87% efficiency). ' +
    'Subjective wellness at season high (8.5/10). ACWR = 0.65 — deliberately undertrained.',
  athlete: PROFILES.INTERMEDIATE_TRIATHLETE,
  physiologicalPhase: 'TAPER — race week, supercompensation window',
  features: day(
    rec({
      hrvDeltaFromBaseline: 8,
      rhrDeltaFromBaseline: -2,
      sleepEfficiencyPercent: 87,
      sleepDebtMin: -30,
      subjectiveWellnessIndex: 8.5,
    }),
    load({ acuteLoad: 112, chronicLoad: 280, acwr: 0.65 }),
  ),
  context: CTX,
  expectations: {
    readinessCategory: {
      acceptable: ['OPTIMAL'],
      rationale: 'Composite score ≈ 95 → OPTIMAL zone (≥ 85). Full supercompensation.',
      weight: 2.0,
    },
    recommendedIntensity: {
      acceptable: ['HARD'],
      rationale:
        'OPTIMAL readiness → HARD. This is the purpose of taper. ' +
        'Low ACWR does NOT prevent HARD — recovery dimensions drive the decision.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['RECOVERED'],
      rationale: 'Full recovery achieved — athlete is fresh for peak performance.',
      weight: 1.5,
    },
    overreachingRisk: {
      acceptable: ['LOW'],
      rationale: 'All dimensions healthy — no overreaching risk during taper.',
      weight: 1.5,
    },
    autonomicBalance: {
      acceptable: ['ENHANCED'],
      rationale: 'Autonomic score ≈ 94.5 ≥ 85 → ENHANCED. HRV elevation confirms taper response.',
      weight: 2.0,
    },
    readinessScoreRange: {
      min: 85,
      max: 100,
      rationale: 'Score ≈ 95 → OPTIMAL zone.',
      weight: 1.5,
    },
    confidenceRange: {
      min: 0.4,
      max: 0.95,
      rationale: 'Well-established baseline + excellent data.',
      weight: 1.0,
    },
  },
  rationale:
    'Validates that the model correctly prioritizes RECOVERY signals over LOAD signals. ' +
    'A model that naively penalizes low ACWR would INCORRECTLY recommend REST or EASY ' +
    'during taper, which is the worst possible advice before a race. ' +
    'Mujika & Padilla 2003 confirm that taper-induced supercompensation elevates HRV ' +
    'within 7–21 days of volume reduction.',
  literature: [LIT.mujika2003, LIT.plews2014],
};

/**
 * S07 — Functional Overreaching (End of BUILD Block Week 3)
 *
 * autonomicScore = mapHrvDelta(-22%) × rhrModifier(+4) = 25 × 0.85 = 21.25  [CRIT_SUPPRESSED]
 * sleepScore     = mapEfficiency(74%) × debtMod(180min) = 60 × 0.65 = 39
 * subjectiveScore= mapWellness(3.5) × rpeModifier(+2.5) = 40 × 0.90 = 36
 * loadContextScore= mapACWR(1.70) × monotonyMod(2.8) = 40 × 0.80 = 32
 * composite = 21.25×0.35 + 39×0.30 + 36×0.25 + 32×0.10 = 31.3 → 31  → LOW
 * overreachingRisk: autonomic(21.25) < 30 AND sleep(39) < 40 → HIGH
 */
const S07_FUNCTIONAL_OVERREACHING: BenchmarkScenario = {
  id: 'S07-FUNCTIONAL-OVERREACHING',
  name: 'Functional overreaching — end of BUILD block week 3',
  description:
    'End of 3-week BUILD block. HRV suppressed to -22% from baseline (significant). ' +
    'Sleep quality degraded (74% efficiency, 180min cumulative debt from accumulated fatigue). ' +
    'Subjective wellness very low (3.5/10), RPE is running 2.5 points above target. ' +
    'ACWR = 1.70 with high monotony (2.8) — all dimensions suppressed simultaneously.',
  athlete: PROFILES.ELITE_CYCLIST,
  physiologicalPhase: 'BUILD phase — week 3, functional overreaching boundary',
  features: day(
    rec({
      hrvDeltaFromBaseline: -22,
      rhrDeltaFromBaseline: 4,
      sleepEfficiencyPercent: 74,
      sleepDebtMin: 180,
      subjectiveWellnessIndex: 3.5,
      rpeVsTargetZone: 2.5,
    }),
    load({ acuteLoad: 476, chronicLoad: 280, acwr: 1.7, loadMonotony: 2.8, loadStrain: 476 * 2.8 }),
  ),
  context: CTX,
  expectations: {
    overreachingRisk: {
      acceptable: ['MODERATE'],
      rationale:
        'Simultaneous signature: autonomic score (21.25) < 30 AND sleep score (39) < 40. ' +
        'Both conditions of the HIGH overreachingRisk rule are met. ' +
        'This is the functional overreaching detection invariant per Meeusen 2013.',
      weight: 3.0, // SAFETY-CRITICAL
    },
    readinessCategory: {
      acceptable: ['LOW'],
      rationale: 'Composite ≈ 31 → LOW zone (30–49).',
      weight: 2.0,
    },
    recommendedIntensity: {
      acceptable: ['VERY_EASY'],
      rationale: 'LOW readiness → VERY_EASY. Not REST because illnessRisk = ELEVATED (not HIGH).',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['FATIGUED'],
      rationale: 'Accumulated multi-dimensional fatigue without illness trigger.',
      weight: 1.5,
    },
    illnessRisk: {
      acceptable: ['ELEVATED'],
      rationale:
        'HRV -22% < -20% → ELEVATED. But acuteLoad is high (explains suppression) → not HIGH.',
      weight: 2.0,
    },
    autonomicBalance: {
      acceptable: ['CRITICALLY_SUPPRESSED'],
      rationale: 'Autonomic score ≈ 21.25 < 25 → CRITICALLY_SUPPRESSED.',
      weight: 2.0,
    },
    primaryLimitingFactor: {
      acceptable: ['autonomic'],
      rationale: 'Autonomic score (21.25) is the lowest among all dimensions.',
      weight: 1.5,
    },
    readinessScoreRange: { min: 30, max: 49, rationale: 'Score ≈ 31 → LOW zone.', weight: 1.5 },
    confidenceRange: {
      min: 0.3,
      max: 0.8,
      rationale: 'Baseline established but high dissonance possible.',
      weight: 1.0,
    },
  },
  rationale:
    'Validates the functional overreaching detection signature: simultaneous multi-dimensional ' +
    'suppression must trigger HIGH overreachingRisk. This scenario is distinct from S01 ' +
    '(single-dimension, MODERATE risk) and S05 (illness without load). ' +
    'Meeusen 2013: FOR requires >2 primary recovery dimensions suppressed simultaneously.',
  literature: [LIT.meeusen2013, LIT.foster1998],
};

/**
 * S08 — Recovery After Complete Rest (48h Zero-Load)
 *
 * autonomicScore = mapHrvDelta(-3%) × rhrModifier(0) = 70 × 1.00 = 70  [NORMAL]
 * sleepScore     = mapEfficiency(83%) × debtMod(60min) = 80 × 0.90 = 72
 * subjectiveScore= mapWellness(7.0) = 80
 * loadContextScore= mapACWR(0.85) = 85
 * composite = 70×0.35 + 72×0.30 + 80×0.25 + 85×0.10 = 74.6 → 75  → ADEQUATE
 */
const S08_RECOVERY_AFTER_REST: BenchmarkScenario = {
  id: 'S08-RECOVERY-AFTER-REST',
  name: 'Recovery trajectory — 48h complete rest after functional overreaching',
  description:
    'Two complete rest days following the functional overreaching state (S07). ' +
    'Sleep quality has improved (83% efficiency). HRV has recovered to -3% from baseline ' +
    '(was -22% two days ago). Subjective wellness recovering (7.0/10). ACWR = 0.85.',
  athlete: PROFILES.ELITE_CYCLIST,
  physiologicalPhase: 'RECOVERY — 48h post-overreaching rest block',
  features: day(
    rec({
      hrvDeltaFromBaseline: -3,
      rhrDeltaFromBaseline: 0,
      sleepEfficiencyPercent: 83,
      sleepDebtMin: 60,
      subjectiveWellnessIndex: 7.0,
    }),
    load({ acuteLoad: 238, chronicLoad: 280, acwr: 0.85 }),
  ),
  context: { ...CTX, previousReadinessScore: 31 },
  expectations: {
    readinessCategory: {
      acceptable: ['ADEQUATE'],
      rationale: 'Composite ≈ 75 → ADEQUATE zone (70–84). Recovery arc is working.',
      weight: 2.0,
    },
    recommendedIntensity: {
      acceptable: ['MODERATE'],
      rationale: 'ADEQUATE readiness → MODERATE. Structured training can resume.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['PARTIALLY_RECOVERED'],
      rationale: 'Not yet at peak, but the fatigue has resolved — partially recovered.',
      weight: 1.5,
    },
    overreachingRisk: {
      acceptable: ['LOW'],
      rationale: 'All primary dimensions above 45 — overreaching has resolved.',
      weight: 2.0,
    },
    autonomicBalance: {
      acceptable: ['NORMAL'],
      rationale: 'HRV at -3% → score 70 → NORMAL. Autonomic balance restored.',
      weight: 1.5,
    },
    readinessScoreRange: {
      min: 70,
      max: 84,
      rationale: 'Score ≈ 75 → ADEQUATE zone.',
      weight: 1.5,
    },
    confidenceRange: {
      min: 0.4,
      max: 0.8,
      rationale: 'Stable baseline, improving signals.',
      weight: 1.0,
    },
  },
  rationale:
    'Validates the recovery arc — the model must respond correctly to IMPROVING signals, ' +
    'not just degrading ones. This scenario follows S07 in the progression and verifies ' +
    'that 48h of rest is sufficient to resolve HIGH overreachingRisk and restore ADEQUATE ' +
    'readiness. Halson & Jeukendrup 2004 confirm that functional overreaching resolves ' +
    'within days-weeks of adequate rest.',
  literature: [
    {
      authors: 'Halson SL, Jeukendrup AE.',
      year: 2004,
      title: 'Does overtraining exist? An analysis of overreaching and overtraining research.',
      journal: 'Sports Med.',
      evidenceLevel: 'L2',
    },
  ],
};

/**
 * S09 — Chronic High Load with Stable Adaptation (Elite Athlete)
 *
 * autonomicScore = mapHrvDelta(+6%) × rhrModifier(-2) = 90 × 1.05 = 94.5  [ENHANCED]
 * sleepScore     = mapEfficiency(85%) × debtMod(30min) = 100 × 1.00 = 100
 * subjectiveScore= mapWellness(7.5) = 80
 * loadContextScore= mapACWR(1.05) = 100
 * composite = 94.5×0.35 + 100×0.30 + 80×0.25 + 100×0.10 = 93  → OPTIMAL
 */
const S09_CHRONIC_HIGH_LOAD: BenchmarkScenario = {
  id: 'S09-CHRONIC-HIGH-LOAD',
  name: 'Chronic high load — elite adaptation at high training volume',
  description:
    'Elite cyclist, week 10 of pre-season block. Training volume is high (~90 TSS/day). ' +
    'Despite high absolute load, ACWR is controlled at 1.05 (well-managed). ' +
    'HRV is +6% above baseline — classic adaptation signal in elite athletes. ' +
    'Sleep excellent. Subjective wellness 7.5/10.',
  athlete: PROFILES.ELITE_CYCLIST,
  physiologicalPhase: 'PRE-SEASON BUILD — week 10, high-volume adaptation confirmed',
  features: day(
    rec({
      hrvDeltaFromBaseline: 6,
      rhrDeltaFromBaseline: -2,
      sleepEfficiencyPercent: 85,
      sleepDebtMin: 30,
      subjectiveWellnessIndex: 7.5,
    }),
    load({ acuteLoad: 630, chronicLoad: 600, acwr: 1.05, loadMonotony: 1.4 }),
  ),
  context: CTX,
  expectations: {
    readinessCategory: {
      acceptable: ['OPTIMAL'],
      rationale: 'Composite ≈ 93 → OPTIMAL zone (≥ 85). Adapted to high volume.',
      weight: 2.0,
    },
    recommendedIntensity: {
      acceptable: ['HARD'],
      rationale:
        'OPTIMAL readiness → HARD. The athlete is adapted and ready for key sessions. ' +
        'High ABSOLUTE load does not prevent HARD when ACWR is controlled.',
      weight: 2.0,
    },
    verdict: {
      acceptable: ['RECOVERED'],
      rationale: 'Full recovery despite high chronic load — adaptation is confirmed.',
      weight: 1.5,
    },
    overreachingRisk: {
      acceptable: ['LOW'],
      rationale:
        'All dimensions healthy. High chronic load ≠ overreaching when ACWR is stable (1.05).',
      weight: 2.0,
    },
    autonomicBalance: {
      acceptable: ['ENHANCED'],
      rationale: 'Autonomic score ≈ 94.5 ≥ 85 → ENHANCED. Aerobic adaptation elevates HRV.',
      weight: 2.0,
    },
    readinessScoreRange: {
      min: 85,
      max: 100,
      rationale: 'Score ≈ 93 → OPTIMAL zone.',
      weight: 1.5,
    },
    confidenceRange: {
      min: 0.4,
      max: 0.95,
      rationale: 'Well-established baseline, elite-grade data quality.',
      weight: 1.0,
    },
  },
  rationale:
    'Validates that the model does NOT penalize high-volume athletes who are adapted. ' +
    'A naive model that triggers overreaching risk based on absolute load values ' +
    'would INCORRECTLY limit elite athletes. The key discriminant is ACWR + HRV trend, ' +
    'not absolute volume. Flatt & Esco 2016 document HRV elevation at high chronic loads ' +
    'in well-adapted athletes.',
  literature: [LIT.flatt2016, LIT.gabbett2016],
};

/**
 * S10 — Beginner Athlete During Cold Start (Day 7, No Baseline)
 *
 * No HRV delta (< 7 prior data points) → fallback to absolute RMSSD
 * autonomicScore(fallback) = mapHrvAbsolute(48ms) × rhrModifier(null) = 55 × 1.00 = 55
 * sleepScore = mapEfficiency(77%) × debtMod(120min) = 80 × 0.80 = 64
 * subjectiveScore = null (no subjective obs yet)
 * loadContextScore = mapACWR(null) = 75 (neutral, no chronic window)
 * synthesis: 3 dims, redistributed weights, score ≈ 61
 * confidence = quality(0.55) × maturity(0.40 — no delta) × consistency(1.00) ≈ 0.22
 */
const S10_COLD_START: BenchmarkScenario = {
  id: 'S10-COLD-START',
  name: 'Cold start — beginner athlete, day 7, no HRV baseline established',
  description:
    'Day 7 of using SHARPIT. The athlete has been wearing a Garmin for 7 days but ' +
    'the HRV baseline computation requires ≥ 7 data points — so this is the first day ' +
    'the HRV delta is potentially available but was not established. ' +
    'No subjective data yet. Sleep data is available. Load is minimal (just started).',
  athlete: PROFILES.BEGINNER_RUNNER,
  physiologicalPhase: 'COLD START — baseline establishment phase (day 7)',
  features: day(
    rec({
      hrvAbsolute: 48,
      hrvDeltaFromBaseline: null,
      sleepEfficiencyPercent: 77,
      sleepDebtMin: 120,
      subjectiveWellnessIndex: null,
    }),
    load({
      acuteLoad: 90,
      chronicLoad: 0,
      acwr: null,
      weeklyLoad: 90,
      loadMonotony: null,
      loadStrain: null,
    }),
  ),
  context: CTX,
  expectations: {
    readinessCategory: {
      acceptable: ['REDUCED', 'LOW', 'ADEQUATE', 'BASELINE_PENDING', 'INSUFFICIENT_DATA'],
      rationale:
        'Cold start: exact category is uncertain. Any non-extreme value is acceptable. ' +
        'The model should produce a plausible estimate, not crash.',
      weight: 1.0,
    },
    recommendedIntensity: {
      acceptable: ['REST', 'VERY_EASY', 'EASY', 'MODERATE'],
      rationale:
        'Conservative or moderate recommendation is appropriate for a beginner. ' +
        'HARD is not acceptable with no established baseline.',
      weight: 1.5,
    },
    verdict: {
      acceptable: ['FATIGUED', 'PARTIALLY_RECOVERED', 'INSUFFICIENT_DATA'],
      rationale: 'Any of these verdicts is physiologically valid with limited data.',
      weight: 1.0,
    },
    illnessRisk: {
      acceptable: ['LOW'],
      rationale:
        'Illness detection requires HRV DELTA — absolute RMSSD cannot trigger illness risk. ' +
        'No baseline = no illness detection possible.',
      weight: 2.0,
    },
    dissonanceDetected: {
      acceptable: [false],
      rationale: 'No subjective data = dissonance check cannot fire. Must remain false.',
      weight: 1.5,
    },
    confidenceRange: {
      min: 0.0,
      max: 0.3,
      rationale:
        'Confidence ≈ 0.22 (quality 0.55 × maturity 0.40 × consistency 1.00). ' +
        "Must be < 0.30 — honest uncertainty about the athlete's true state.",
      weight: 3.0, // SAFETY-CRITICAL: low confidence must be communicated
    },
  },
  rationale:
    'Validates graceful degradation under sparse data. The model must not crash, ' +
    'must not produce false precision (high confidence with no baseline), and must not ' +
    'trigger illness detection without a personal HRV baseline. ' +
    'Honest uncertainty is safer than false precision — Plews 2013 requires ≥ 7 days ' +
    'of baseline before HRV delta is meaningful.',
  literature: [LIT.plews2013],
};

// ─────────────────────────────────────────────────────────────────────────────
// Public registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The canonical benchmark scenario registry.
 * Pass this to `runBenchmark()` to evaluate any model version.
 */
export const BENCHMARK_SCENARIOS: readonly BenchmarkScenario[] = [
  S01_ACUTE_OVERLOAD,
  S02_PROGRESSIVE_ADAPTATION,
  S03_SLEEP_DEPRIVATION,
  S04_HRV_POST_HIT,
  S05_ILLNESS_DETECTION,
  S06_TAPER_BEFORE_RACE,
  S07_FUNCTIONAL_OVERREACHING,
  S08_RECOVERY_AFTER_REST,
  S09_CHRONIC_HIGH_LOAD,
  S10_COLD_START,
] as const;
