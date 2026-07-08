export type ProductInsightImportance = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ProductInsightDecisionImpact =
  | 'INFORMATIVE'
  | 'TRAINING_TODAY'
  | 'RECOVERY_BEHAVIOR'
  | 'LOAD_PROGRESSION'
  | 'BODY_TRAJECTORY'
  | 'HEALTH_AWARENESS'
  | 'TRUST';

export type RelatedTwinDimension =
  | 'RECOVERY'
  | 'FATIGUE'
  | 'ADAPTATION'
  | 'DAILY_STRAIN'
  | 'SLEEP'
  | 'BODY'
  | 'CONDITION'
  | 'REASONING';

export type ProductInsightId = string;

export type ProductInsight = {
  id: ProductInsightId;
  title: string;
  summary: string;
  explanation: string;
  evidence: string[];
  confidence: number;
  importance: ProductInsightImportance;
  decisionImpact: ProductInsightDecisionImpact;
  relatedDimensions: RelatedTwinDimension[];
};

export type ProductInsightBundle = {
  primary: ProductInsight[];
  supporting: ProductInsight[];
  contextual: ProductInsight[];
};

export type RecoveryInsightInput = {
  readinessScore: number | null;
  limitingFactorLabel: string | null;
  recommendedIntensityLabel: string;
  rationale: string[];
  autonomicLabel: string;
  wellnessLabel: string;
  loadLabel: string;
  dissonanceDetected: boolean;
  estimatedRecoveryDays: number | null;
  overreachingLabel?: string | null;
  illnessLabel?: string | null;
  keyEvidence: string[];
  confidence: number;
};

export type SleepInsightInput = {
  sleepScore: number | null;
  adequacyLabel: string;
  targetDeltaMin: number | null;
  sleepDelta7d: number | null;
  recommendedBedtime: string | null;
  recommendedDurationLabel: string | null;
  debt7Min: number | null;
  regularityMin: number | null;
  recoveryNote: string | null;
  coachInsightLines: string[];
  confidence: number;
};

export type EffortInsightInput = {
  strainScore: number | null;
  fatigueTypeLabel: string;
  verdictLabel: string;
  rationale: string[];
  trainingCapacityLabel: string;
  dominantDimensionLabel: string | null;
  limitingFactorLabel: string | null;
  estimatedDaysToFresh: number | null;
  performancePercent: number | null;
  acwr: number;
  weeklyLoad: number;
  tsb: number | null;
  overreachingLabel?: string | null;
  keyEvidence: string[];
  confidence: number;
};

export type AdaptationInsightInput = {
  adaptationIndex: number | null;
  statusLabel: string;
  trendLabel: string;
  verdictLabel: string;
  rationale: string[];
  limitingFactorLabel: string | null;
  plateauRisk: boolean;
  overreachingWithoutAdaptation: boolean;
  loadMultiplier: number;
  keyEvidence: string[];
  confidence: number;
};

export type BodyInsightInput = {
  latestWeightKg: number | null;
  weightDelta7d: number | null;
  bodyFatDelta7d: number | null;
  waterPercent: number | null;
  visceralFat: number | null;
  sourceLabel: string | null;
  measuredAtLabel: string | null;
};
