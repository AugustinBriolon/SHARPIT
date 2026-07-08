import type { AdaptationInferenceResult } from '@/core/inference/adaptation-orchestrator';
import type { FatigueInferenceResult } from '@/core/inference/fatigue-orchestrator';
import type { RecoveryInferenceResult } from '@/core/inference/orchestrator';
import type { ReasoningInferenceResult } from '@/core/inference/reasoning-orchestrator';
import { adaptationEngine } from '@/lib/engines/adaptation-engine';
import { fatigueEngine } from '@/lib/engines/fatigue-engine';
import { featureEngine } from '@/lib/engines/feature-engine';
import { reasoningEngine } from '@/lib/engines/reasoning-engine';
import { recoveryEngine } from '@/lib/engines/recovery-engine';
import { computeDailyStrain } from '@/lib/daily-strain';
import {
  activityMatchesTrainingDay,
  approximateTrainingDayUtcRange,
  DEFAULT_TRAINING_DAY_START_HOUR,
  DEFAULT_TRAINING_DAY_TIMEZONE,
} from '@/lib/training-day';
import type {
  AdaptationData,
  DailyStrainData,
  FatigueData,
  ReasoningData,
  RecoveryData,
  TodayState,
} from '@/hooks/use-today';
import { prisma } from '@/lib/prisma';

function readStateComputedAt(state: unknown): Date | null {
  if (!state || typeof state !== 'object') return null;
  const raw = (state as { computedAt?: unknown }).computedAt;
  if (typeof raw !== 'string' && !(raw instanceof Date)) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function isReasoningStale(athleteId: string, reasoningComputedAt: Date): Promise<boolean> {
  const twin = await prisma.digitalTwin.findUnique({
    where: { athleteId },
    select: { recoveryState: true, fatigueState: true, adaptationState: true },
  });
  if (!twin) return true;

  const subModelTimes = [
    readStateComputedAt(twin.recoveryState),
    readStateComputedAt(twin.fatigueState),
    readStateComputedAt(twin.adaptationState),
  ].filter((d): d is Date => d !== null);

  return subModelTimes.some((computedAt) => computedAt > reasoningComputedAt);
}

function formatRecoveryResult(result: RecoveryInferenceResult): RecoveryData {
  const { output, computedAt } = result;
  const { recoveryState, recommendation, signals, decision } = output;

  return {
    readinessScore: recoveryState.readinessScore,
    readinessCategory: recoveryState.readinessCategory,
    confidence: recoveryState.confidence,
    dataCompleteness: recoveryState.dataCompleteness,
    dimensions: {
      autonomic: recoveryState.dimensions.autonomic,
      sleep: recoveryState.dimensions.sleep,
      subjective: recoveryState.dimensions.subjective,
      loadContext: recoveryState.dimensions.loadContext,
    },
    primaryLimitingFactor: recoveryState.primaryLimitingFactor,
    estimatedTimeToFullRecovery: recoveryState.estimatedTimeToFullRecovery,
    signals: {
      autonomicBalance: signals.autonomicBalance,
      sleepAdequacy: signals.sleepAdequacy,
      subjectiveWellness: signals.subjectiveWellness,
      loadStressContext: signals.loadStressContext,
      overreachingRisk: signals.overreachingRisk,
      illnessRisk: signals.illnessRisk,
      dissonanceDetected: signals.dissonanceDetected,
    },
    decision: {
      verdict: decision.verdict,
      recommendedIntensity: decision.recommendedIntensity,
      rationale: [...decision.rationale],
    },
    recommendation: {
      type: recommendation.type,
      keyEvidence: [...recommendation.keyEvidence],
      confidence: recommendation.confidence,
    },
    computedAt: computedAt.toISOString(),
  };
}

function formatFatigueResult(result: FatigueInferenceResult): FatigueData {
  const { output, computedAt } = result;
  const { fatigueState, recommendation, signals, decision } = output;

  return {
    fatigueIndex: fatigueState.fatigueIndex,
    fatigueLevel: fatigueState.fatigueLevel,
    fatigueType: fatigueState.fatigueType,
    confidence: fatigueState.confidence,
    dataCompleteness: fatigueState.dataCompleteness,
    dimensions: {
      load: fatigueState.dimensions.load,
      neuromuscular: fatigueState.dimensions.neuromuscular,
      metabolic: fatigueState.dimensions.metabolic,
      cumulative: fatigueState.dimensions.cumulative,
      psychological: fatigueState.dimensions.psychological,
    },
    trajectory: fatigueState.trajectory,
    consecutiveAccumulationDays: fatigueState.consecutiveAccumulationDays,
    dominantDimension: fatigueState.dominantDimension,
    primaryLimitingFactor: fatigueState.primaryLimitingFactor,
    trainingCapacity: fatigueState.trainingCapacity,
    estimatedTimeToFresh: fatigueState.estimatedTimeToFresh,
    performanceImpairmentEstimate: fatigueState.performanceImpairmentEstimate,
    signals: {
      functionalOverreachingRisk: signals.functionalOverreachingRisk,
      isAccumulating: signals.isAccumulating,
    },
    decision: {
      verdict: decision.verdict,
      trainingCapacity: decision.trainingCapacity,
      rationale: [...decision.rationale],
    },
    recommendation: {
      type: recommendation.type,
      keyEvidence: [...recommendation.keyEvidence],
      confidence: recommendation.confidence,
    },
    computedAt: computedAt.toISOString(),
  };
}

function formatAdaptationResult(result: AdaptationInferenceResult): AdaptationData {
  const { output, computedAt } = result;
  const { adaptationState, recommendation, signals, decision } = output;

  return {
    adaptationIndex: adaptationState.adaptationIndex,
    adaptationStatus: adaptationState.adaptationStatus,
    adaptationTrend: adaptationState.adaptationTrend,
    confidence: adaptationState.confidence,
    dimensions: {
      loadProgression: adaptationState.dimensions.loadProgression,
      neuromuscularEfficiency: adaptationState.dimensions.neuromuscularEfficiency,
      autonomicAdaptation: adaptationState.dimensions.autonomicAdaptation,
      recoveryQuality: adaptationState.dimensions.recoveryQuality,
    },
    limitingFactor: adaptationState.limitingFactor,
    estimatedAdaptationPeak: adaptationState.estimatedAdaptationPeak,
    plateauRisk: adaptationState.plateauRisk,
    overreachingWithoutAdaptationDetected: adaptationState.overreachingWithoutAdaptationDetected,
    signals: {
      availableDimensionCount: signals.availableDimensionCount,
      historyLength: signals.historyLength,
    },
    decision: {
      verdict: decision.verdict,
      loadMultiplier: decision.loadMultiplier,
      rationale: [...decision.rationale],
    },
    recommendation: {
      type: recommendation.type,
      keyEvidence: [...recommendation.keyEvidence],
    },
    computedAt: computedAt.toISOString(),
  };
}

function formatReasoningResult(result: ReasoningInferenceResult): ReasoningData {
  const { output, computedAt } = result;
  const { reasoningState, signals } = output;

  return {
    overallVerdict: reasoningState.overallVerdict,
    systemAttentionPriority: reasoningState.systemAttentionPriority,
    physiologicalConsistency: reasoningState.physiologicalConsistency,
    consistencyScore: reasoningState.consistencyScore,
    confidence: reasoningState.confidence,
    dataCompleteness: reasoningState.dataCompleteness,
    keyFindings: reasoningState.keyFindings as ReasoningData['keyFindings'],
    limitingFactor: reasoningState.limitingFactor,
    opportunities: reasoningState.opportunities as ReasoningData['opportunities'],
    conflicts: reasoningState.conflicts as ReasoningData['conflicts'],
    topAction: reasoningState.topAction,
    evidenceGraph: reasoningState.evidenceGraph,
    signals: {
      availableModelCount: signals.availableModelCount,
      hasRecoveryState: signals.hasRecoveryState,
      hasFatigueState: signals.hasFatigueState,
      hasAdaptationState: signals.hasAdaptationState,
      modelDirections: signals.modelDirections,
    },
    computedAt: computedAt.toISOString(),
  };
}

async function loadRecoveryState(
  athleteId: string,
  trainingDayId: string,
  forceRefresh: boolean,
): Promise<RecoveryData | null> {
  try {
    if (!forceRefresh) {
      const cached = await recoveryEngine.getLatest(athleteId, trainingDayId);
      if (cached) return formatRecoveryResult(cached);
    }
    const result = await recoveryEngine.run(athleteId, trainingDayId);
    return formatRecoveryResult(result);
  } catch (error) {
    console.error('[today-state-server/recovery]', error);
    return null;
  }
}

async function loadFatigueState(
  athleteId: string,
  trainingDayId: string,
  forceRefresh: boolean,
): Promise<FatigueData | null> {
  try {
    if (!forceRefresh) {
      const cached = await fatigueEngine.getLatest(athleteId, trainingDayId);
      if (cached) return formatFatigueResult(cached);
    }
    const result = await fatigueEngine.run(athleteId, trainingDayId);
    return formatFatigueResult(result);
  } catch (error) {
    console.error('[today-state-server/fatigue]', error);
    return null;
  }
}

async function loadAdaptationState(
  athleteId: string,
  trainingDayId: string,
  forceRefresh: boolean,
): Promise<AdaptationData | null> {
  try {
    if (!forceRefresh) {
      const cached = await adaptationEngine.getLatest(athleteId, trainingDayId);
      if (cached) return formatAdaptationResult(cached);
    }
    const result = await adaptationEngine.run(athleteId, trainingDayId);
    return formatAdaptationResult(result);
  } catch (error) {
    console.error('[today-state-server/adaptation]', error);
    return null;
  }
}

async function loadDailyStrainState(
  athleteId: string,
  trainingDayId: string,
): Promise<DailyStrainData | null> {
  try {
    const [features, activities, athleteProfile, googleAccount, healthEntry] = await Promise.all([
      featureEngine.getDayFeatures(athleteId, trainingDayId),
      prisma.activity.findMany({
        where: {
          date: approximateTrainingDayUtcRange(trainingDayId),
        },
        include: {
          runMetrics: true,
          bikeMetrics: true,
          swimMetrics: true,
        },
        orderBy: { date: 'asc' },
      }),
      prisma.athleteProfile.findUnique({ where: { id: athleteId } }),
      prisma.googleAccount.findFirst({ select: { timeZone: true } }),
      prisma.dailyHealth.findUnique({
        where: { date: new Date(`${trainingDayId}T00:00:00.000Z`) },
      }),
    ]);
    const trainingDayOptions = {
      timezone: googleAccount?.timeZone ?? DEFAULT_TRAINING_DAY_TIMEZONE,
      trainingDayStartHour: DEFAULT_TRAINING_DAY_START_HOUR,
    };
    const filteredActivities = activities.filter((activity) =>
      activityMatchesTrainingDay(activity.date, trainingDayId, trainingDayOptions),
    );

    return computeDailyStrain({
      sessionFeatures: features.sessions,
      legacyActivities: filteredActivities,
      healthSignals: healthEntry
        ? {
            calories: healthEntry.calories,
            recoveryScore: healthEntry.recoveryScore,
            stress: healthEntry.stress,
            bodyBattery: healthEntry.bodyBattery,
            restingHr: healthEntry.restingHr,
            hrv: healthEntry.hrv,
          }
        : null,
      thresholds: {
        ftpW: athleteProfile?.ftpW ?? null,
        maxHr: athleteProfile?.maxHr ?? null,
        lthr: athleteProfile?.lthr ?? null,
        restingHr: features.recovery !== 'PENDING' ? (features.recovery.rhrAbsolute ?? null) : null,
      },
    });
  } catch (error) {
    console.error('[today-state-server/daily-strain]', error);
    return null;
  }
}

async function loadReasoningState(
  athleteId: string,
  trainingDayId: string,
  forceRefresh: boolean,
): Promise<ReasoningData | null> {
  try {
    if (!forceRefresh) {
      const cached = await reasoningEngine.getLatest(athleteId, trainingDayId);
      const cachedHasI18nTopAction = cached?.output.reasoningState.topAction?.verbCode != null;
      const stale = cached != null && (await isReasoningStale(athleteId, cached.computedAt));
      if (
        cached &&
        cached.output.reasoningState.overallVerdict !== 'INSUFFICIENT_DATA' &&
        cachedHasI18nTopAction &&
        !stale
      ) {
        return formatReasoningResult(cached);
      }
    }

    const result = await reasoningEngine.run(athleteId, trainingDayId);
    return formatReasoningResult(result);
  } catch (error) {
    console.error('[today-state-server/reasoning]', error);
    return null;
  }
}

export async function loadTodayState(params: {
  athleteId: string;
  trainingDayId: string;
  forceRefresh?: boolean;
}): Promise<TodayState> {
  const { athleteId, trainingDayId, forceRefresh = false } = params;

  const [recovery, fatigue, adaptation, dailyStrain, reasoning] = await Promise.all([
    loadRecoveryState(athleteId, trainingDayId, forceRefresh),
    loadFatigueState(athleteId, trainingDayId, forceRefresh),
    loadAdaptationState(athleteId, trainingDayId, forceRefresh),
    loadDailyStrainState(athleteId, trainingDayId),
    loadReasoningState(athleteId, trainingDayId, forceRefresh),
  ]);

  return { reasoning, recovery, fatigue, adaptation, dailyStrain };
}
