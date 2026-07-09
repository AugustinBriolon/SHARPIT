import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { snapshotHasDisplayableContent } from '@/core/athlete-state/snapshot';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { formatLimitingFactorMessage } from '@/lib/athlete-state/snapshot-truthfulness';
import { pickAdaptationReminders } from '@/lib/daily-phase/narrative';
import {
  getActivitiesList,
  getAthleteProfile,
  getHealthEntries,
  getPlannedSessions,
} from '@/lib/queries';
import { computeSharpitSleepScoreForDay, SLEEP_TARGET_MIN } from '@/lib/sleep-scoring';
import { buildTodayDaySummary } from '@/lib/today-day-summary';
import { mapConfidenceToTier, mapVerdictToDisplay, type OverallVerdict } from '@/lib/today-mapping';
import {
  actionRowLabels,
  buildProgressionSummary,
  buildTopActionLine,
  buildWhyEvidence,
  shouldShowForwardTrainingCopy,
  trajectoryEyebrow,
  whyBlockTitle,
} from '@/lib/today-rich-view';
import {
  resolveConfidenceHref,
  resolveLimitingFactorHref,
  TRAJECTORY_DRILL_DOWNS,
  TWIN_DIMENSION_LABEL,
  TWIN_DRILL_DOWN,
} from '@/lib/today-twin-navigation';
import { computeTrainingLoad } from '@/lib/training-load';
import { endOfDay, isSameDay, startOfDay, subDays } from 'date-fns';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';

function localDateFromTrainingDayId(trainingDayId: string): Date {
  const [y, m, d] = trainingDayId.split('-').map(Number);
  // Midday local avoids DST edge cases when subtracting days.
  return new Date(y, m - 1, d, 12, 0, 0);
}

function mapConfidenceTone(
  tier: ReturnType<typeof mapConfidenceToTier>,
): 'good' | 'warn' | 'neutral' {
  switch (tier) {
    case 'high':
      return 'good';
    case 'medium':
      return 'warn';
    default:
      return 'neutral';
  }
}

function resolveSnapshotStatusMessage(
  snapshot: AthleteSnapshot,
  phase: string,
  heroHeadline: string,
  heroSubline: string,
): string | null {
  const hasContent = snapshotHasDisplayableContent(snapshot);

  if (phase === 'END_OF_DAY' && hasContent) return null;

  const candidate = hasContent
    ? snapshot.freshness.primaryProductMessage
    : (snapshot.primaryProductMessage ?? snapshot.insufficientDataMessage ?? null);

  if (!candidate) return null;
  if (hasContent && (candidate === heroHeadline || candidate === heroSubline)) return null;

  return candidate;
}

export async function buildTodayPresentationViewModel(
  trainingDayId: string,
): Promise<TodayViewModel> {
  const snapshot = await getOrBuildAthleteSnapshot(trainingDayId);

  const day = localDateFromTrainingDayId(trainingDayId);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const [healthEntries, activities, plannedSessions, athleteProfile] = await Promise.all([
    getHealthEntries(14, day),
    getActivitiesList({ sinceDays: 60 }),
    getPlannedSessions({ from: dayStart, to: dayEnd }),
    getAthleteProfile(),
  ]);

  const sleepTargetMin = athleteProfile?.sleepTargetMinutes ?? SLEEP_TARGET_MIN;

  const recoveryScore = snapshot.recovery?.readinessScore ?? null;
  const sleepScoreSharpit = computeSharpitSleepScoreForDay(healthEntries, day, sleepTargetMin);
  const sleepScore =
    sleepScoreSharpit ??
    (snapshot.recovery?.dimensions.sleep.available
      ? (snapshot.recovery?.dimensions.sleep.score ?? null)
      : null);

  const effortScore =
    snapshot.dailyStrain?.available && snapshot.dailyStrain.strainScore != null
      ? snapshot.dailyStrain.strainScore
      : null;

  const adaptationScore = snapshot.adaptation?.adaptationIndex ?? null;
  const adaptationUnavailableCaption =
    snapshot.adaptation?.adaptationIndex == null ? 'Historique insuffisant' : null;

  const recoverySpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(day, 13 - i);
    return healthEntries.find((e) => isSameDay(e.date, d))?.recoveryScore ?? null;
  });

  // Today UI uses recovery + effort sparklines for trajectory.

  const effortSpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(day, 13 - i);
    const totalLoad = activities
      .filter((a) => isSameDay(a.date, d))
      .reduce((sum, a) => sum + (a.load ?? 0), 0);
    return totalLoad > 0 ? totalLoad : null;
  });

  const trainingLoad = computeTrainingLoad(
    activities.map((a) => ({ load: a.load, date: a.date })),
    day,
  );
  const { weeklyLoad } = trainingLoad;

  const phase = snapshot.dailyPhase?.phase ?? 'MORNING';
  const adviceActionable = Boolean(snapshot.adviceActionable);
  const forward = shouldShowForwardTrainingCopy(phase);

  const verdict = (snapshot.reasoning?.overallVerdict ?? 'INSUFFICIENT_DATA') as OverallVerdict;
  const displayVerdict = mapVerdictToDisplay(verdict);

  const heroHeadline = snapshot.phaseNarrative?.heroHeadline ?? displayVerdict.label;
  const heroSubline =
    snapshot.phaseNarrative?.heroSubline ?? snapshot.insufficientDataMessage ?? '';
  const heroEyebrow = snapshot.phaseNarrative?.heroEyebrow ?? "Qu'est-ce qui compte aujourd'hui ?";
  const posture = snapshot.phaseNarrative?.posture ?? 'uncertain';
  const postureLabel = snapshot.phaseNarrative?.postureLabel ?? '';
  const focusPriority =
    snapshot.phaseNarrative?.focusPriority ??
    (adviceActionable && forward
      ? buildTopActionLine(snapshot.reasoning?.topAction ?? null)
      : null);
  const goalLine = snapshot.phaseNarrative?.goalLine ?? null;
  const actionLine = focusPriority;
  const adaptationReminders: string[] = [];

  const confidenceLabel = snapshot.confidenceLabel ?? null;
  const confidencePctRounded =
    snapshot.confidence != null ? Math.round(snapshot.confidence * 100) : null;
  const confidenceHref = resolveConfidenceHref(snapshot.reasoning);

  const confidenceTier =
    snapshot.confidence != null ? mapConfidenceToTier(snapshot.confidence) : null;
  const confidenceTone = confidenceTier != null ? mapConfidenceTone(confidenceTier) : 'neutral';

  const whyFocus = snapshot.dailyPhase?.whyFocus ?? 'readiness';
  const whyLines = buildWhyEvidence(snapshot.reasoning, snapshot.briefing?.content, whyFocus);
  const whyVisible = whyLines.length > 0 && !(phase === 'END_OF_DAY' && focusPriority != null);

  const daySummary = buildTodayDaySummary(
    day,
    activities as unknown as ClientActivity[],
    plannedSessions as unknown as ClientPlannedSession[],
  );
  const labels = actionRowLabels(phase);
  const adaptationHints = pickAdaptationReminders(phase, 3);

  // Mirror TodayActionRow rendering decisions.
  let limitingMode: TodayViewModel['actionRow']['limitingMode'] = 'none';
  let limitingLines: string[] = [];
  let limitingText: string | null = null;
  let limitingHref: string | null = null;

  if (phase === 'END_OF_DAY') {
    limitingMode = 'none';
  } else if (phase === 'RECOVERY_WINDOW' && adaptationHints.length > 0 && !focusPriority) {
    limitingMode = 'list';
    limitingLines = adaptationHints;
  } else if (snapshot.limitingFactor) {
    limitingText = formatLimitingFactorMessage(snapshot.limitingFactor);
    limitingHref = resolveLimitingFactorHref(snapshot.limitingFactor);
    limitingMode = limitingHref ? 'link' : 'text';
  } else if (snapshot.adaptation?.limitingFactor) {
    limitingMode = 'link';
    limitingText = snapshot.adaptation.limitingFactor;
    limitingHref = TWIN_DRILL_DOWN.adaptation;
  } else {
    limitingMode = 'text';
    limitingText = "Aucun frein physiologique majeur identifié aujourd'hui.";
  }

  const weeklyTrajectoryProgression = buildProgressionSummary(snapshot.adaptation, weeklyLoad);

  const hasSparks = recoverySpark.some((v) => v != null) || effortSpark.some((v) => v != null);

  const statusMessage = resolveSnapshotStatusMessage(snapshot, phase, heroHeadline, heroSubline);
  const emptyState =
    !snapshotHasDisplayableContent(snapshot) && (statusMessage || snapshot.primaryProductMessage)
      ? {
          title: 'Données insuffisantes',
          description:
            snapshot.insufficientDataMessage ??
            snapshot.primaryProductMessage ??
            'SHARPIT attend tes premières données physiologiques pour établir ton bilan.',
        }
      : null;

  return {
    hasContent: snapshotHasDisplayableContent(snapshot),
    emptyState,
    statusMessage,
    confidencePresentation: {
      pct: snapshot.confidence,
      label: snapshot.confidenceLabel,
      tone: confidenceTone,
    },
    effortUnavailableMessage: snapshot.effortUnavailableMessage,
    navigationTargets: {
      sleep: { label: 'Sommeil', href: TWIN_DRILL_DOWN.sleep },
      recovery: { label: 'Récupération', href: TWIN_DRILL_DOWN.recovery },
      effort: { label: 'Effort', href: TWIN_DRILL_DOWN.effort },
      adaptation: { label: 'Adaptation', href: TWIN_DRILL_DOWN.adaptation },
      planning: { label: 'Planning', href: TWIN_DRILL_DOWN.planning },
    },
    hero: {
      eyebrow: heroEyebrow,
      headline: heroHeadline,
      subline: heroSubline,
      posture,
      postureLabel,
      focusPriority,
      goalLine,
      actionLine,
      adaptationReminders,
      verdictStyle: {
        showVerdictColors: forward && adviceActionable,
        bgClass: displayVerdict.bgClass,
        colorClass: displayVerdict.colorClass,
      },
      metricsRow: {
        sleepScore: sleepScore,
        recoveryScore,
        effortScore,
        adaptationScore,
        effortUnavailableCaption: null,
        adaptationUnavailableCaption,
      },
      twinTrustStrip: {
        confidenceLabel,
        confidencePctRounded,
        confidenceHref,
        limitingFactorText: null,
      },
    },
    whyBlock: {
      title: whyBlockTitle(phase),
      lines: whyLines,
      visible: whyVisible,
    },
    actionRow: {
      showLimitingColumn: limitingMode !== 'none',
      limitingLabel: labels.limiting,
      limitingMode,
      limitingLines,
      limitingText,
      limitingHref,
      actionLabel: labels.action,
      daySummaryEmptyText: 'Aucune séance prévue ni réalisée.',
      daySummaryEmptyHref: TWIN_DRILL_DOWN.planning,
      daySummaryLines: daySummary.lines.map((line) => ({
        id: line.id,
        primary: line.primary,
        secondary: line.secondary ?? null,
        kind: line.kind,
        href: line.kind === 'done' ? TWIN_DRILL_DOWN.activity(line.id) : TWIN_DRILL_DOWN.planning,
        isDone: line.kind === 'done',
      })),
    },
    weeklyTrajectory: {
      eyebrow: trajectoryEyebrow(phase),
      headline: weeklyTrajectoryProgression.headline,
      detail: weeklyTrajectoryProgression.detail,
      trendArrow: weeklyTrajectoryProgression.trendArrow,
      trendClass: weeklyTrajectoryProgression.trendClass,
      drillDownLinks: TRAJECTORY_DRILL_DOWNS.map(({ dimension, href }) => ({
        label: TWIN_DIMENSION_LABEL[dimension],
        href,
      })),
      hasSparks,
      emptyTrajectoryText: "Pas encore assez d'historique pour une trajectoire hebdomadaire.",
      sparks: {
        recoveryValues: recoverySpark,
        effortValues: effortSpark,
      },
    },
    insights: [],
    hierarchy: { rootId: 'today', order: ['hero', 'why', 'actionRow', 'weeklyTrajectory'] },
    sections: [],
  };
}
