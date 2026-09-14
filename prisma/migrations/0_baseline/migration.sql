-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('RUN', 'BIKE', 'SWIM', 'STRENGTH', 'TRIATHLON', 'HIKE', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalHorizon" AS ENUM ('LONG_TERM', 'MEDIUM_TERM', 'SHORT_TERM', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "GoalKind" AS ENUM ('RACE', 'METRIC');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "SessionIntensity" AS ENUM ('RECOVERY', 'ENDURANCE', 'TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE');

-- CreateEnum
CREATE TYPE "PhysicalCategory" AS ENUM ('PAIN', 'INJURY', 'MOBILITY', 'POSTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "BodySide" AS ENUM ('LEFT', 'RIGHT', 'BILATERAL', 'NA');

-- CreateEnum
CREATE TYPE "PhysicalStatus" AS ENUM ('ACTIVE', 'MONITORING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ConditionScope" AS ENUM ('LOCALIZED', 'SYSTEMIC');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('PAIN', 'INJURY', 'DISCOMFORT', 'MOBILITY_LIMITATION', 'POSTURE_ISSUE', 'MUSCULAR_TIGHTNESS', 'JOINT_STIFFNESS', 'INSTABILITY', 'RECURRING_PHYSICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('NEW', 'ACTIVE', 'IMPROVING', 'STABLE', 'WORSENING', 'RESOLVED', 'RECURRENT');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('ACTIVE', 'IMPROVING', 'STABLE', 'WORSENING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ObservationContext" AS ENUM ('BEFORE_SESSION', 'DURING_SESSION', 'AFTER_SESSION', 'MORNING_CHECKIN', 'EVENING_CHECKIN', 'MANUAL', 'COACH_CONVERSATION', 'INTEGRATION', 'LEGACY_MIGRATION');

-- CreateEnum
CREATE TYPE "ObservationSource" AS ENUM ('ATHLETE', 'COACH_AI', 'SYSTEM_MIGRATION', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "FunctionalImpact" AS ENUM ('NONE', 'MILD', 'MODERATE', 'LIMITING', 'STOPPED');

-- CreateEnum
CREATE TYPE "TrainingCapacityLevel" AS ENUM ('FULL', 'REDUCED', 'LIMITED', 'UNABLE');

-- CreateEnum
CREATE TYPE "KnowledgeHypothesisType" AS ENUM ('TRIGGER', 'RECOVERY_DURATION', 'RECURRENCE_PATTERN', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PlanPhase" AS ENUM ('BASE', 'BUILD', 'PEAK', 'TAPER', 'RACE');

-- CreateEnum
CREATE TYPE "TrainingPlanStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccessTier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "NutritionAnalysisStatus" AS ENUM ('PROVISIONAL', 'FINAL');

-- CreateEnum
CREATE TYPE "BodyCompositionSource" AS ENUM ('RENPHO', 'WITHINGS');

-- CreateEnum
CREATE TYPE "CoachingDecisionSource" AS ENUM ('PLAN_GENERATOR', 'PLAN_ADAPTER');

-- CreateEnum
CREATE TYPE "CoachingDecisionStatus" AS ENUM ('PRESENTED', 'ACCEPTED', 'MODIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CoachingDecisionActionType" AS ENUM ('ACCEPTED', 'MODIFIED', 'REJECTED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "CoachingDecisionActionSource" AS ENUM ('PLAN_REVIEW_UI', 'CALENDAR_EDIT', 'BATCH_EXPIRY');

-- CreateEnum
CREATE TYPE "CoachingOutcomeStatus" AS ENUM ('EVALUATED', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "CoachMemorySource" AS ENUM ('USER', 'COACH');

-- CreateEnum
CREATE TYPE "TravelTrainingConstraint" AS ENUM ('FULL', 'REDUCED', 'MOBILITY_ONLY', 'NONE');

-- CreateEnum
CREATE TYPE "TravelDiscipline" AS ENUM ('RUN', 'BIKE', 'SWIM', 'STRENGTH', 'MOBILITY');

-- CreateEnum
CREATE TYPE "AthleteMemoryEntryType" AS ENUM ('TRAVEL', 'CONSTRAINT');

-- CreateEnum
CREATE TYPE "JournalHabitExperimentIntent" AS ENUM ('REMOVE', 'ADD');

-- CreateEnum
CREATE TYPE "AnalysisKind" AS ENUM ('ACTIVITY_NARRATIVE', 'SESSION_COMPLIANCE', 'BRICK', 'WEEKLY_REVIEW');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('RUNNING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "duration" INTEGER,
    "rpe" INTEGER,
    "feeling" TEXT,
    "notes" TEXT,
    "weather" TEXT,
    "load" DOUBLE PRECISION,
    "athleteId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "stravaId" TEXT,
    "garminId" TEXT,
    "multisportLegs" JSONB,
    "hikeTripId" TEXT,
    "narrativeAnalysis" JSONB,
    "narrativeAnalyzedAt" TIMESTAMP(3),
    "observedLocationLabel" TEXT,
    "observedLocationLat" DOUBLE PRECISION,
    "observedLocationLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "tier" "AccessTier" NOT NULL DEFAULT 'FREE',
    "heightCm" INTEGER,
    "targetWeightKg" DOUBLE PRECISION,
    "birthDate" DATE,
    "ftpW" INTEGER,
    "maxHr" INTEGER,
    "lthr" INTEGER,
    "runThresholdPaceSecPerKm" DOUBLE PRECISION,
    "swimCssSecPer100m" DOUBLE PRECISION,
    "vo2maxRunning" INTEGER,
    "vo2maxCycling" INTEGER,
    "thresholdsSyncedAt" TIMESTAMP(3),
    "context" TEXT,
    "displayMode" TEXT NOT NULL DEFAULT 'essential',
    "journalPrefs" JSONB,
    "equipment" JSONB,
    "practicedSports" JSONB,
    "trainingAvailability" JSONB,
    "defaultPoolLengthM" INTEGER,
    "sleepTargetMinutes" INTEGER,
    "sleepBedtimeTargetMin" INTEGER,
    "homeLocationLabel" TEXT,
    "homeLocationLat" DOUBLE PRECISION,
    "homeLocationLng" DOUBLE PRECISION,
    "onboardingCompletedAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "privacyAcceptedAt" TIMESTAMP(3),
    "privacyVersion" TEXT,
    "healthDataConsentAt" TIMESTAMP(3),
    "aiProcessingConsentAt" TIMESTAMP(3),
    "unofficialProvidersAckAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "integrationSourcePrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteThresholdSnapshot" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ftpW" INTEGER,
    "lthr" INTEGER,
    "runThresholdPaceSecPerKm" DOUBLE PRECISION,
    "swimCssSecPer100m" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteThresholdSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityStream" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "polyline" TEXT,
    "data" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarminAccount" (
    "athleteId" TEXT NOT NULL,
    "displayName" TEXT,
    "fullName" TEXT,
    "oauth1TokenEnc" TEXT NOT NULL,
    "oauth2TokenEnc" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastActivitySyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarminAccount_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "StravaAccount" (
    "athleteId" TEXT NOT NULL,
    "stravaAthleteId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaAccount_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "GoogleAccount" (
    "athleteId" TEXT NOT NULL,
    "email" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "targetCalendarId" TEXT,
    "targetCalendarName" TEXT,
    "hiddenCalendarIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "RenphoAccount" (
    "athleteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "displayName" TEXT,
    "renphoUserId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenphoAccount_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "WithingsAccount" (
    "athleteId" TEXT NOT NULL,
    "withingsUserId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithingsAccount_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "MyFitnessPalAccount" (
    "athleteId" TEXT NOT NULL,
    "sessionTokenEnc" TEXT NOT NULL,
    "displayName" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MyFitnessPalAccount_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "NutritionDayAnalysis" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "NutritionAnalysisStatus" NOT NULL DEFAULT 'FINAL',
    "inputHash" TEXT,
    "facts" JSONB,
    "analysis" JSONB,
    "model" TEXT,
    "generatedAt" TIMESTAMP(3),
    "attemptHash" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionDayAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyNutrition" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'myfitnesspal',
    "externalId" TEXT,
    "calories" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbohydrates" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "water" DOUBLE PRECISION,
    "meals" JSONB NOT NULL DEFAULT '[]',
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "goalCalories" INTEGER,
    "goalProtein" DOUBLE PRECISION,
    "goalCarbohydrates" DOUBLE PRECISION,
    "goalFat" DOUBLE PRECISION,
    "exerciseCalories" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyNutrition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION,
    "elevationM" DOUBLE PRECISION,
    "paceSecPerKm" DOUBLE PRECISION,
    "avgHr" INTEGER,
    "avgPower" DOUBLE PRECISION,
    "cadence" INTEGER,
    "shoes" TEXT,

    CONSTRAINT "RunMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "ftpPercent" DOUBLE PRECISION,
    "normalizedPower" DOUBLE PRECISION,
    "intensityFactor" DOUBLE PRECISION,
    "tss" DOUBLE PRECISION,
    "avgCadence" INTEGER,
    "avgPower" DOUBLE PRECISION,
    "elevationM" DOUBLE PRECISION,
    "calories" INTEGER,
    "bikeName" TEXT,

    CONSTRAINT "BikeMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION,
    "sets" INTEGER,
    "cssSecPer100m" DOUBLE PRECISION,
    "avgPaceSecPer100m" DOUBLE PRECISION,
    "swolf" DOUBLE PRECISION,
    "drills" TEXT,

    CONSTRAINT "SwimMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikeTrip" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HikeTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HikeMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION,
    "elevationM" DOUBLE PRECISION,
    "elevationLossM" DOUBLE PRECISION,
    "avgHr" INTEGER,
    "calories" INTEGER,
    "avgSpeedMps" DOUBLE PRECISION,

    CONSTRAINT "HikeMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthSet" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "exerciseCatalogId" TEXT,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "rpe" INTEGER,
    "restSec" INTEGER,
    "videoUrl" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StrengthSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyHealth" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sleepMinutes" INTEGER,
    "napMinutes" INTEGER,
    "hrv" INTEGER,
    "restingHr" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "calories" INTEGER,
    "recoveryScore" INTEGER,
    "stress" INTEGER,
    "mood" TEXT,
    "sleepScore" INTEGER,
    "sleepDeepMin" INTEGER,
    "sleepLightMin" INTEGER,
    "sleepRemMin" INTEGER,
    "sleepAwakeMin" INTEGER,
    "sleepBedtimeMin" INTEGER,
    "sleepWakeMin" INTEGER,
    "sleepRespiration" DOUBLE PRECISION,
    "sleepAvgStress" INTEGER,
    "sleepScoreFeedback" TEXT,
    "readinessLevel" TEXT,
    "readinessFeedback" TEXT,
    "readinessFactors" JSONB,
    "hrvStatus" TEXT,
    "hrvBaselineLow" INTEGER,
    "hrvBaselineHigh" INTEGER,
    "bodyBattery" INTEGER,
    "totalSteps" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyCompositionMeasurement" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "source" "BodyCompositionSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "waterPct" DOUBLE PRECISION,
    "musclePct" DOUBLE PRECISION,
    "boneKg" DOUBLE PRECISION,
    "bmr" DOUBLE PRECISION,
    "visceralFat" DOUBLE PRECISION,
    "proteinPct" DOUBLE PRECISION,
    "bodyAge" INTEGER,
    "subcutaneousFatPct" DOUBLE PRECISION,
    "skeletalMusclePct" DOUBLE PRECISION,
    "fatFreeWeightKg" DOUBLE PRECISION,
    "heartRate" INTEGER,
    "vascularAgeYears" INTEGER,
    "pulseWaveVelocity" DOUBLE PRECISION,
    "vo2Max" DOUBLE PRECISION,
    "nerveHealthScore" DOUBLE PRECISION,
    "nerveHealthLeft" DOUBLE PRECISION,
    "nerveHealthRight" DOUBLE PRECISION,
    "nerveResponseScore" DOUBLE PRECISION,
    "skinConductance" DOUBLE PRECISION,
    "metabolicAge" INTEGER,
    "hydrationKg" DOUBLE PRECISION,
    "fatMassKg" DOUBLE PRECISION,
    "extracellularWaterKg" DOUBLE PRECISION,
    "intracellularWaterKg" DOUBLE PRECISION,
    "withingsExtras" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyCompositionMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "GoalKind" NOT NULL DEFAULT 'METRIC',
    "horizon" "GoalHorizon",
    "metricKey" TEXT,
    "startValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "unit" TEXT,
    "lowerIsBetter" BOOLEAN NOT NULL DEFAULT false,
    "targetDate" TIMESTAMP(3),
    "location" TEXT,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "priority" "GoalPriority",
    "raceFormat" TEXT,
    "targetPerformance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalAchievement" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "activityId" TEXT,
    "source" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "periodKey" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "goalId" TEXT,
    "raceDate" DATE NOT NULL,
    "startDate" DATE NOT NULL,
    "status" "TrainingPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "baselineCtl" INTEGER,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekIndex" INTEGER NOT NULL,
    "phase" "PlanPhase" NOT NULL,
    "targetLoad" INTEGER NOT NULL,
    "targetHours" DOUBLE PRECISION,
    "focus" TEXT,
    "isDeload" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalNote" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "category" "PhysicalCategory" NOT NULL DEFAULT 'PAIN',
    "status" "PhysicalStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "bodyPart" TEXT,
    "side" "BodySide" NOT NULL DEFAULT 'NA',
    "severity" INTEGER,
    "description" TEXT,
    "affectsTraining" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalCheckin" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhysicalCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "scope" "ConditionScope" NOT NULL,
    "type" "ConditionType" NOT NULL,
    "bodyRegion" TEXT NOT NULL,
    "side" "BodySide" NOT NULL DEFAULT 'NA',
    "label" TEXT NOT NULL,
    "diagnosis" TEXT,
    "status" "ConditionStatus" NOT NULL DEFAULT 'NEW',
    "severity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "affectsTraining" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "lastObservationAt" TIMESTAMP(3),
    "recurrenceCount" INTEGER NOT NULL DEFAULT 0,
    "observationCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedRecoveryDays" INTEGER,
    "primaryTriggerManual" TEXT,
    "legacyPhysicalNoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionEpisode" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "peakSeverity" DOUBLE PRECISION,
    "estimatedRecoveryDays" INTEGER,
    "triggerHypothesis" TEXT,

    CONSTRAINT "ConditionEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionObservation" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "conditionId" TEXT,
    "episodeId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" "ObservationContext" NOT NULL,
    "source" "ObservationSource" NOT NULL DEFAULT 'ATHLETE',
    "symptomPresent" BOOLEAN NOT NULL,
    "severityReported" INTEGER,
    "functionalImpact" "FunctionalImpact",
    "bodyRegion" TEXT NOT NULL,
    "side" "BodySide" NOT NULL DEFAULT 'NA',
    "type" "ConditionType" NOT NULL,
    "comment" TEXT,
    "activityId" TEXT,
    "plannedSessionId" TEXT,
    "trainingDayId" TEXT,
    "externalId" TEXT,
    "legacyPhysicalCheckinId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConditionObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionalCapacity" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "observationId" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "painSeverity" INTEGER,
    "trainingCapacity" "TrainingCapacityLevel" NOT NULL,
    "comment" TEXT,

    CONSTRAINT "FunctionalCapacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionKnowledge" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "hypothesisType" "KnowledgeHypothesisType" NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" "KnowledgeConfidenceLevel" NOT NULL DEFAULT 'LOW',
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "isInferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConditionKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyBriefing" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "readiness" INTEGER,
    "phaseAtGeneration" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyBriefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReview" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "stats" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceRecord" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "displayValue" TEXT NOT NULL,
    "sublabel" TEXT,
    "activityId" TEXT,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "activityTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "qualityFlags" JSONB NOT NULL DEFAULT '[]',
    "normalizedAt" TIMESTAMP(3) NOT NULL,
    "externalId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureSet" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "trainingDayId" TEXT,
    "sessionObsId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "algorithmId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "sourceObsIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "computedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalTwin" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "recoveryState" JSONB,
    "fatigueState" JSONB,
    "adaptationState" JSONB,
    "reasoningState" JSONB,
    "physicalHealthState" JSONB,
    "environmentalStressState" JSONB,
    "environmentalImpactState" JSONB,
    "environmentalStateMeta" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalTwin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentalObservationRecord" (
    "id" TEXT NOT NULL,
    "recordVersion" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL,
    "trainingDayId" TEXT,
    "temporalScope" TEXT NOT NULL,
    "intervalStart" TIMESTAMP(3),
    "intervalEnd" TIMESTAMP(3),
    "exposure" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "providerId" TEXT,
    "externalId" TEXT,
    "providerSnapshot" JSONB NOT NULL,
    "fieldQuality" JSONB NOT NULL,
    "aggregateQuality" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "supersededBy" TEXT,

    CONSTRAINT "EnvironmentalObservationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "signals" JSONB NOT NULL,
    "stateUpdate" JSONB NOT NULL,
    "decision" JSONB NOT NULL,
    "recommendation" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "inputSummary" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingDecision" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "source" "CoachingDecisionSource" NOT NULL,
    "status" "CoachingDecisionStatus" NOT NULL DEFAULT 'PRESENTED',
    "proposal" JSONB NOT NULL,
    "gateResult" JSONB NOT NULL,
    "snapshotContext" JSONB NOT NULL,
    "snapshotIdAtRecommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingDecisionAction" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "actionType" "CoachingDecisionActionType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "CoachingDecisionActionSource" NOT NULL,
    "rationale" TEXT,
    "resultingPlannedSessionId" TEXT,

    CONSTRAINT "CoachingDecisionAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachingDecisionOutcome" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcomeStatus" "CoachingOutcomeStatus" NOT NULL,
    "executionMatch" JSONB,
    "subjectiveResponse" JSONB,
    "shortTermRecoveryResponse" JSONB,
    "safetySignal" JSONB,
    "limitations" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CoachingDecisionOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteSnapshotRecord" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteSnapshotRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Nouvelle conversation',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedSession" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "title" TEXT,
    "description" TEXT,
    "strengthPrescription" JSONB,
    "endurancePrescription" JSONB,
    "accessories" JSONB,
    "durationMin" INTEGER,
    "load" DOUBLE PRECISION,
    "intensity" "SessionIntensity",
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "exposureSetting" TEXT,
    "locationLabel" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "locationType" TEXT,
    "environmentContext" JSONB,
    "environmentContextAt" TIMESTAMP(3),
    "goalId" TEXT,
    "brickGroupId" TEXT,
    "brickOrder" INTEGER,
    "activityId" TEXT,
    "analysis" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "googleEventId" TEXT,
    "garminWorkoutId" TEXT,
    "garminWorkoutScheduledDate" TEXT,
    "garminWorkoutPushedAt" TIMESTAMP(3),
    "garminWorkoutThresholds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteTravelContext" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "type" "AthleteMemoryEntryType" NOT NULL DEFAULT 'TRAVEL',
    "label" TEXT,
    "locationLabel" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "note" TEXT,
    "trainingConstraint" "TravelTrainingConstraint" NOT NULL DEFAULT 'FULL',
    "allowedDisciplines" "TravelDiscipline"[] DEFAULT ARRAY[]::"TravelDiscipline"[],
    "source" "CoachMemorySource" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteTravelContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteDayJournal" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "trainingDayId" TEXT NOT NULL,
    "factors" JSONB NOT NULL DEFAULT '{}',
    "moodLabel" TEXT,
    "hydrationMl" INTEGER,
    "caffeineMg" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteDayJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalHabitExperiment" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "factorId" TEXT NOT NULL,
    "intent" "JournalHabitExperimentIntent" NOT NULL,
    "startDayId" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalHabitExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteActivityStatus" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "retentionKind" TEXT NOT NULL DEFAULT 'until_modified',
    "untilDate" DATE,
    "travelId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteActivityStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteActivityStatusHistory" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retentionKind" TEXT NOT NULL,
    "untilDate" DATE,
    "travelId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteActivityStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrickAnalysis" (
    "brickGroupId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrickAnalysis_pkey" PRIMARY KEY ("brickGroupId")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "kind" "AnalysisKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_stravaId_key" ON "Activity"("stravaId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_garminId_key" ON "Activity"("garminId");

-- CreateIndex
CREATE INDEX "Activity_date_idx" ON "Activity"("date");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "Activity_hikeTripId_idx" ON "Activity"("hikeTripId");

-- CreateIndex
CREATE INDEX "Activity_athleteId_idx" ON "Activity"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_clerkUserId_key" ON "AthleteProfile"("clerkUserId");

-- CreateIndex
CREATE INDEX "AthleteProfile_deletedAt_idx" ON "AthleteProfile"("deletedAt");

-- CreateIndex
CREATE INDEX "AthleteThresholdSnapshot_profileId_idx" ON "AthleteThresholdSnapshot"("profileId");

-- CreateIndex
CREATE INDEX "AthleteThresholdSnapshot_createdAt_idx" ON "AthleteThresholdSnapshot"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityStream_activityId_key" ON "ActivityStream"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaAccount_stravaAthleteId_key" ON "StravaAccount"("stravaAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionDayAnalysis_athleteId_date_key" ON "NutritionDayAnalysis"("athleteId", "date");

-- CreateIndex
CREATE INDEX "DailyNutrition_date_idx" ON "DailyNutrition"("date");

-- CreateIndex
CREATE INDEX "DailyNutrition_athleteId_idx" ON "DailyNutrition"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNutrition_athleteId_date_provider_key" ON "DailyNutrition"("athleteId", "date", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "DailyNutrition_athleteId_externalId_key" ON "DailyNutrition"("athleteId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "RunMetrics_activityId_key" ON "RunMetrics"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "BikeMetrics_activityId_key" ON "BikeMetrics"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "SwimMetrics_activityId_key" ON "SwimMetrics"("activityId");

-- CreateIndex
CREATE INDEX "HikeTrip_athleteId_idx" ON "HikeTrip"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "HikeMetrics_activityId_key" ON "HikeMetrics"("activityId");

-- CreateIndex
CREATE INDEX "StrengthSet_activityId_idx" ON "StrengthSet"("activityId");

-- CreateIndex
CREATE INDEX "StrengthSet_exerciseCatalogId_idx" ON "StrengthSet"("exerciseCatalogId");

-- CreateIndex
CREATE INDEX "DailyHealth_athleteId_idx" ON "DailyHealth"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyHealth_athleteId_date_key" ON "DailyHealth"("athleteId", "date");

-- CreateIndex
CREATE INDEX "BodyCompositionMeasurement_measuredAt_idx" ON "BodyCompositionMeasurement"("measuredAt");

-- CreateIndex
CREATE INDEX "BodyCompositionMeasurement_source_measuredAt_idx" ON "BodyCompositionMeasurement"("source", "measuredAt");

-- CreateIndex
CREATE INDEX "BodyCompositionMeasurement_athleteId_idx" ON "BodyCompositionMeasurement"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "BodyCompositionMeasurement_athleteId_source_externalId_key" ON "BodyCompositionMeasurement"("athleteId", "source", "externalId");

-- CreateIndex
CREATE INDEX "Goal_kind_idx" ON "Goal"("kind");

-- CreateIndex
CREATE INDEX "Goal_targetDate_idx" ON "Goal"("targetDate");

-- CreateIndex
CREATE INDEX "Goal_athleteId_idx" ON "Goal"("athleteId");

-- CreateIndex
CREATE INDEX "GoalAchievement_goalId_achievedAt_idx" ON "GoalAchievement"("goalId", "achievedAt");

-- CreateIndex
CREATE INDEX "GoalAchievement_activityId_idx" ON "GoalAchievement"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalAchievement_goalId_periodKey_key" ON "GoalAchievement"("goalId", "periodKey");

-- CreateIndex
CREATE INDEX "TrainingPlan_status_idx" ON "TrainingPlan"("status");

-- CreateIndex
CREATE INDEX "TrainingPlan_raceDate_idx" ON "TrainingPlan"("raceDate");

-- CreateIndex
CREATE INDEX "TrainingPlan_athleteId_idx" ON "TrainingPlan"("athleteId");

-- CreateIndex
CREATE INDEX "PlanWeek_planId_idx" ON "PlanWeek"("planId");

-- CreateIndex
CREATE INDEX "PlanWeek_weekStart_idx" ON "PlanWeek"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "PlanWeek_planId_weekIndex_key" ON "PlanWeek"("planId", "weekIndex");

-- CreateIndex
CREATE INDEX "PhysicalNote_status_idx" ON "PhysicalNote"("status");

-- CreateIndex
CREATE INDEX "PhysicalNote_athleteId_idx" ON "PhysicalNote"("athleteId");

-- CreateIndex
CREATE INDEX "PhysicalCheckin_noteId_idx" ON "PhysicalCheckin"("noteId");

-- CreateIndex
CREATE INDEX "PhysicalCheckin_date_idx" ON "PhysicalCheckin"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Condition_legacyPhysicalNoteId_key" ON "Condition"("legacyPhysicalNoteId");

-- CreateIndex
CREATE INDEX "Condition_status_idx" ON "Condition"("status");

-- CreateIndex
CREATE INDEX "Condition_type_idx" ON "Condition"("type");

-- CreateIndex
CREATE INDEX "Condition_bodyRegion_side_idx" ON "Condition"("bodyRegion", "side");

-- CreateIndex
CREATE INDEX "Condition_athleteId_idx" ON "Condition"("athleteId");

-- CreateIndex
CREATE INDEX "ConditionEpisode_conditionId_idx" ON "ConditionEpisode"("conditionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionEpisode_conditionId_episodeNumber_key" ON "ConditionEpisode"("conditionId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionObservation_externalId_key" ON "ConditionObservation"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionObservation_legacyPhysicalCheckinId_key" ON "ConditionObservation"("legacyPhysicalCheckinId");

-- CreateIndex
CREATE INDEX "ConditionObservation_conditionId_observedAt_idx" ON "ConditionObservation"("conditionId", "observedAt");

-- CreateIndex
CREATE INDEX "ConditionObservation_activityId_idx" ON "ConditionObservation"("activityId");

-- CreateIndex
CREATE INDEX "ConditionObservation_plannedSessionId_idx" ON "ConditionObservation"("plannedSessionId");

-- CreateIndex
CREATE INDEX "ConditionObservation_observedAt_idx" ON "ConditionObservation"("observedAt");

-- CreateIndex
CREATE INDEX "ConditionObservation_athleteId_idx" ON "ConditionObservation"("athleteId");

-- CreateIndex
CREATE INDEX "FunctionalCapacity_conditionId_assessedAt_idx" ON "FunctionalCapacity"("conditionId", "assessedAt");

-- CreateIndex
CREATE INDEX "ConditionKnowledge_conditionId_idx" ON "ConditionKnowledge"("conditionId");

-- CreateIndex
CREATE INDEX "DailyBriefing_date_idx" ON "DailyBriefing"("date");

-- CreateIndex
CREATE INDEX "DailyBriefing_athleteId_idx" ON "DailyBriefing"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBriefing_athleteId_date_key" ON "DailyBriefing"("athleteId", "date");

-- CreateIndex
CREATE INDEX "WeeklyReview_weekStart_idx" ON "WeeklyReview"("weekStart");

-- CreateIndex
CREATE INDEX "WeeklyReview_athleteId_idx" ON "WeeklyReview"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReview_athleteId_weekStart_key" ON "WeeklyReview"("athleteId", "weekStart");

-- CreateIndex
CREATE INDEX "PerformanceRecord_group_idx" ON "PerformanceRecord"("group");

-- CreateIndex
CREATE INDEX "PerformanceRecord_athleteId_idx" ON "PerformanceRecord"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceRecord_athleteId_category_rank_key" ON "PerformanceRecord"("athleteId", "category", "rank");

-- CreateIndex
CREATE INDEX "Observation_athleteId_type_idx" ON "Observation"("athleteId", "type");

-- CreateIndex
CREATE INDEX "Observation_athleteId_trainingDayId_idx" ON "Observation"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "Observation_athleteId_trainingDayId_type_idx" ON "Observation"("athleteId", "trainingDayId", "type");

-- CreateIndex
CREATE INDEX "Observation_type_externalId_idx" ON "Observation"("type", "externalId");

-- CreateIndex
CREATE INDEX "Observation_timestamp_idx" ON "Observation"("timestamp");

-- CreateIndex
CREATE INDEX "FeatureSet_athleteId_category_trainingDayId_idx" ON "FeatureSet"("athleteId", "category", "trainingDayId");

-- CreateIndex
CREATE INDEX "FeatureSet_athleteId_category_sessionObsId_idx" ON "FeatureSet"("athleteId", "category", "sessionObsId");

-- CreateIndex
CREATE INDEX "FeatureSet_athleteId_trainingDayId_idx" ON "FeatureSet"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "FeatureSet_athleteId_status_idx" ON "FeatureSet"("athleteId", "status");

-- CreateIndex
CREATE INDEX "FeatureSet_sessionObsId_idx" ON "FeatureSet"("sessionObsId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalTwin_athleteId_key" ON "DigitalTwin"("athleteId");

-- CreateIndex
CREATE INDEX "DigitalTwin_athleteId_idx" ON "DigitalTwin"("athleteId");

-- CreateIndex
CREATE INDEX "EnvironmentalObservationRecord_athleteId_trainingDayId_idx" ON "EnvironmentalObservationRecord"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "EnvironmentalObservationRecord_athleteId_observedAt_idx" ON "EnvironmentalObservationRecord"("athleteId", "observedAt");

-- CreateIndex
CREATE INDEX "EnvironmentalObservationRecord_supersededBy_idx" ON "EnvironmentalObservationRecord"("supersededBy");

-- CreateIndex
CREATE INDEX "DecisionRecord_athleteId_trainingDayId_idx" ON "DecisionRecord"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "DecisionRecord_athleteId_modelId_idx" ON "DecisionRecord"("athleteId", "modelId");

-- CreateIndex
CREATE INDEX "DecisionRecord_computedAt_idx" ON "DecisionRecord"("computedAt");

-- CreateIndex
CREATE INDEX "CoachingDecision_athleteId_trainingDayId_idx" ON "CoachingDecision"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "CoachingDecision_status_idx" ON "CoachingDecision"("status");

-- CreateIndex
CREATE INDEX "CoachingDecisionAction_decisionId_idx" ON "CoachingDecisionAction"("decisionId");

-- CreateIndex
CREATE INDEX "CoachingDecisionAction_resultingPlannedSessionId_idx" ON "CoachingDecisionAction"("resultingPlannedSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachingDecisionOutcome_decisionId_key" ON "CoachingDecisionOutcome"("decisionId");

-- CreateIndex
CREATE INDEX "CoachingDecisionOutcome_decisionId_idx" ON "CoachingDecisionOutcome"("decisionId");

-- CreateIndex
CREATE INDEX "AthleteSnapshotRecord_snapshotId_idx" ON "AthleteSnapshotRecord"("snapshotId");

-- CreateIndex
CREATE INDEX "AthleteSnapshotRecord_generatedAt_idx" ON "AthleteSnapshotRecord"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteSnapshotRecord_athleteId_trainingDayId_key" ON "AthleteSnapshotRecord"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_athleteId_idx" ON "Conversation"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedSession_activityId_key" ON "PlannedSession"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedSession_googleEventId_key" ON "PlannedSession"("googleEventId");

-- CreateIndex
CREATE INDEX "PlannedSession_date_idx" ON "PlannedSession"("date");

-- CreateIndex
CREATE INDEX "PlannedSession_brickGroupId_idx" ON "PlannedSession"("brickGroupId");

-- CreateIndex
CREATE INDEX "PlannedSession_athleteId_idx" ON "PlannedSession"("athleteId");

-- CreateIndex
CREATE INDEX "AthleteTravelContext_startDate_endDate_idx" ON "AthleteTravelContext"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "AthleteTravelContext_type_idx" ON "AthleteTravelContext"("type");

-- CreateIndex
CREATE INDEX "AthleteTravelContext_athleteId_idx" ON "AthleteTravelContext"("athleteId");

-- CreateIndex
CREATE INDEX "AthleteDayJournal_athleteId_trainingDayId_idx" ON "AthleteDayJournal"("athleteId", "trainingDayId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteDayJournal_athleteId_trainingDayId_key" ON "AthleteDayJournal"("athleteId", "trainingDayId");

-- CreateIndex
CREATE INDEX "JournalHabitExperiment_athleteId_startDayId_idx" ON "JournalHabitExperiment"("athleteId", "startDayId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteActivityStatus_athleteId_key" ON "AthleteActivityStatus"("athleteId");

-- CreateIndex
CREATE INDEX "AthleteActivityStatusHistory_athleteId_startedAt_idx" ON "AthleteActivityStatusHistory"("athleteId", "startedAt");

-- CreateIndex
CREATE INDEX "AthleteActivityStatusHistory_athleteId_endedAt_idx" ON "AthleteActivityStatusHistory"("athleteId", "endedAt");

-- CreateIndex
CREATE INDEX "BrickAnalysis_athleteId_idx" ON "BrickAnalysis"("athleteId");

-- CreateIndex
CREATE INDEX "AnalysisRun_athleteId_finishedAt_idx" ON "AnalysisRun"("athleteId", "finishedAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_athleteId_status_idx" ON "AnalysisRun"("athleteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisRun_athleteId_kind_targetId_key" ON "AnalysisRun"("athleteId", "kind", "targetId");

-- CreateIndex
CREATE INDEX "AiUsageEvent_athleteId_createdAt_idx" ON "AiUsageEvent"("athleteId", "createdAt");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_hikeTripId_fkey" FOREIGN KEY ("hikeTripId") REFERENCES "HikeTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteThresholdSnapshot" ADD CONSTRAINT "AthleteThresholdSnapshot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityStream" ADD CONSTRAINT "ActivityStream_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarminAccount" ADD CONSTRAINT "GarminAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaAccount" ADD CONSTRAINT "StravaAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleAccount" ADD CONSTRAINT "GoogleAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenphoAccount" ADD CONSTRAINT "RenphoAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithingsAccount" ADD CONSTRAINT "WithingsAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MyFitnessPalAccount" ADD CONSTRAINT "MyFitnessPalAccount_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionDayAnalysis" ADD CONSTRAINT "NutritionDayAnalysis_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyNutrition" ADD CONSTRAINT "DailyNutrition_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunMetrics" ADD CONSTRAINT "RunMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeMetrics" ADD CONSTRAINT "BikeMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimMetrics" ADD CONSTRAINT "SwimMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeTrip" ADD CONSTRAINT "HikeTrip_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HikeMetrics" ADD CONSTRAINT "HikeMetrics_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthSet" ADD CONSTRAINT "StrengthSet_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyHealth" ADD CONSTRAINT "DailyHealth_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyCompositionMeasurement" ADD CONSTRAINT "BodyCompositionMeasurement_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalAchievement" ADD CONSTRAINT "GoalAchievement_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalAchievement" ADD CONSTRAINT "GoalAchievement_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanWeek" ADD CONSTRAINT "PlanWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalNote" ADD CONSTRAINT "PhysicalNote_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalCheckin" ADD CONSTRAINT "PhysicalCheckin_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "PhysicalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionEpisode" ADD CONSTRAINT "ConditionEpisode_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "ConditionEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionObservation" ADD CONSTRAINT "ConditionObservation_plannedSessionId_fkey" FOREIGN KEY ("plannedSessionId") REFERENCES "PlannedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionalCapacity" ADD CONSTRAINT "FunctionalCapacity_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionalCapacity" ADD CONSTRAINT "FunctionalCapacity_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "ConditionObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionKnowledge" ADD CONSTRAINT "ConditionKnowledge_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyBriefing" ADD CONSTRAINT "DailyBriefing_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureSet" ADD CONSTRAINT "FeatureSet_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalTwin" ADD CONSTRAINT "DigitalTwin_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentalObservationRecord" ADD CONSTRAINT "EnvironmentalObservationRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRecord" ADD CONSTRAINT "DecisionRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingDecision" ADD CONSTRAINT "CoachingDecision_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingDecisionAction" ADD CONSTRAINT "CoachingDecisionAction_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "CoachingDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachingDecisionOutcome" ADD CONSTRAINT "CoachingDecisionOutcome_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "CoachingDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSnapshotRecord" ADD CONSTRAINT "AthleteSnapshotRecord_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteTravelContext" ADD CONSTRAINT "AthleteTravelContext_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteDayJournal" ADD CONSTRAINT "AthleteDayJournal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalHabitExperiment" ADD CONSTRAINT "JournalHabitExperiment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteActivityStatus" ADD CONSTRAINT "AthleteActivityStatus_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteActivityStatusHistory" ADD CONSTRAINT "AthleteActivityStatusHistory_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrickAnalysis" ADD CONSTRAINT "BrickAnalysis_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

