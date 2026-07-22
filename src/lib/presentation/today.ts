import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { snapshotHasDisplayableContent } from '@/core/athlete-state/snapshot';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { pickAdaptationReminders } from '@/lib/daily-phase/narrative';
import {
  getActivitiesList,
  getAthleteProfile,
  getHealthEntries,
  getPlannedSessions,
} from '@/lib/queries';
import { computeSharpitSleepScoreForDay, SLEEP_TARGET_MIN } from '@/lib/sleep/sleep-scoring';
import { buildTodayDaySummary } from '@/lib/today/today-day-summary';
import {
  mapConfidenceToTier,
  mapVerdictToDisplay,
  resolveVisibleConfidenceLabel,
} from '@/lib/today/today-mapping';
import {
  actionRowLabels,
  buildProgressionSummary,
  buildTopActionLine,
  shouldShowForwardTrainingCopy,
  trajectoryEyebrow,
  whyBlockTitle,
} from '@/lib/today/today-rich-view';
import { resolveMorningOrientation } from '@/lib/today/morning-orientation';
import {
  decisionTopAction,
  decisionVerdict,
  resolveConfidenceHrefFromDecision,
  resolveLimitingFactorHrefFromDecision,
} from '@/lib/decision/projection';
import { buildTodayLimitingFacts, buildTodayWhyFacts } from '@/lib/today/today-instrument-facts';
import {
  TRAJECTORY_DRILL_DOWNS,
  TWIN_DIMENSION_LABEL,
  TWIN_DRILL_DOWN,
} from '@/lib/today/today-twin-navigation';
import { computeTrainingLoad } from '@/lib/training/training-load';
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
  const day = localDateFromTrainingDayId(trainingDayId);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  // `activities`/`plannedSessions` are fetched separately from the snapshot's
  // `sessionsDoneToday`/`plannedToday` on purpose: `daySummary` below needs richer
  // display fields (durationMin, brickGroupId, metrics) than the snapshot's minimal
  // state-signal shape carries. `activities` also covers the 60-day trend window for
  // effortSpark/trainingLoad, not just today. `snapshot.sessionsDoneToday`/`plannedToday`
  // exist for consumers that only need "did/will the athlete train today" (Coach, Gate).
  const [
    snapshot,
    healthEntries,
    activities,
    plannedSessions,
    athleteProfile,
    morningRecalibration,
  ] = await Promise.all([
    getOrBuildAthleteSnapshot(trainingDayId),
    getHealthEntries(14, day),
    getActivitiesList({ sinceDays: 60 }),
    getPlannedSessions({ from: dayStart, to: dayEnd }),
    getAthleteProfile(),
    import('@/lib/morning-recalibration/service').then(({ ensureMorningRecalibration }) =>
      ensureMorningRecalibration(trainingDayId).catch((error) => {
        console.error('[today/morning-recalibration]', error);
        return null;
      }),
    ),
  ]);

  const sleepTargetMin = athleteProfile?.sleepTargetMinutes ?? SLEEP_TARGET_MIN;

  const recoveryScore = snapshot.readiness;
  const sleepScoreSharpit = computeSharpitSleepScoreForDay(healthEntries, day, sleepTargetMin);
  const sleepScore = sleepScoreSharpit ?? snapshot.sleepScore;

  const effortScore =
    snapshot.dailyStrain?.available && snapshot.dailyStrain.strainScore != null
      ? snapshot.dailyStrain.strainScore
      : null;

  const adaptationScore = snapshot.adaptationIndex;
  const adaptationUnavailableCaption =
    snapshot.adaptationIndex == null ? 'Historique insuffisant' : null;

  const recoverySpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(day, 13 - i);
    return healthEntries.find((e) => isSameDay(e.date, d))?.recoveryScore ?? null;
  });

  // Rest days are 0 TSS (continuous series) — never null, or the sparkline breaks into holes.
  const effortSpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(day, 13 - i);
    return activities
      .filter((a) => isSameDay(a.date, d))
      .reduce((sum, a) => sum + (a.load ?? 0), 0);
  });

  const trainingLoad = computeTrainingLoad(
    activities.map((a) => ({ load: a.load, date: a.date })),
    day,
  );
  const { weeklyLoad } = trainingLoad;

  const phase = snapshot.dailyPhase?.phase ?? 'MORNING';
  const isRestDay = snapshot.dailyPhase?.signals.sessionStatus === 'NONE_TODAY';
  const adviceActionable = Boolean(snapshot.adviceActionable);
  const forward = shouldShowForwardTrainingCopy(phase);

  const verdict = decisionVerdict(snapshot.decision);
  const displayVerdict = mapVerdictToDisplay(verdict);

  const heroHeadline = snapshot.phaseNarrative?.heroHeadline ?? displayVerdict.label;
  const heroSubline =
    snapshot.phaseNarrative?.heroSubline ?? snapshot.insufficientDataMessage ?? '';
  const heroEyebrow = snapshot.phaseNarrative?.heroEyebrow ?? "Qu'est-ce qui compte aujourd'hui ?";
  const posture = snapshot.phaseNarrative?.posture ?? 'uncertain';
  const postureLabel = snapshot.phaseNarrative?.postureLabel ?? '';
  const focusPriority =
    snapshot.phaseNarrative?.focusPriority ??
    (adviceActionable && forward ? buildTopActionLine(decisionTopAction(snapshot.decision)) : null);
  const goalLine = snapshot.phaseNarrative?.goalLine ?? null;
  const actionLine = focusPriority;
  const adaptationReminders: string[] = [];

  const confidenceTier =
    snapshot.confidence != null ? mapConfidenceToTier(snapshot.confidence) : null;
  const confidenceTone = confidenceTier != null ? mapConfidenceTone(confidenceTier) : 'neutral';

  const confidenceLabel = resolveVisibleConfidenceLabel(
    snapshot.confidenceLabel ?? null,
    confidenceTier,
    adviceActionable,
  );
  const confidencePctRounded =
    confidenceLabel != null && snapshot.confidence != null
      ? Math.round(snapshot.confidence * 100)
      : null;
  const confidenceHref = resolveConfidenceHrefFromDecision(snapshot.decision);

  const whyFocus = snapshot.dailyPhase?.whyFocus ?? 'readiness';
  const whyFacts = buildTodayWhyFacts({
    verdict,
    consistency: snapshot.decision?.physiologicalConsistency ?? null,
    decision: snapshot.decision,
    whyFocus,
  });

  const daySummary = buildTodayDaySummary(
    day,
    activities as unknown as ClientActivity[],
    plannedSessions as unknown as ClientPlannedSession[],
  );
  const labels = actionRowLabels(phase);
  const adaptationHints = pickAdaptationReminders(phase, 3, isRestDay);

  let limitingMode: TodayViewModel['actionRow']['limitingMode'] = 'none';
  let limitingLines: string[] = [];
  let limitingText: string | null = null;
  let limitingHref: string | null = null;
  let limitingFacts: TodayViewModel['actionRow']['limitingFacts'] = [];

  if (phase === 'END_OF_DAY') {
    limitingMode = 'none';
  } else {
    const preferReminders =
      phase === 'RECOVERY_WINDOW' &&
      adaptationHints.length > 0 &&
      !focusPriority &&
      !snapshot.limitingFactor;
    const limitingBuilt = buildTodayLimitingFacts({
      limitingFactor: preferReminders ? null : snapshot.limitingFactor,
      reminders: preferReminders ? adaptationHints : [],
    });
    limitingFacts = limitingBuilt.facts;
    limitingText = limitingBuilt.emptyText;
    limitingHref =
      snapshot.limitingFactor != null
        ? (resolveLimitingFactorHrefFromDecision(snapshot.decision) ?? TWIN_DRILL_DOWN.recovery)
        : null;
    limitingMode = limitingFacts.length > 0 || limitingText ? 'facts' : 'none';
  }

  const weeklyTrajectoryProgression = buildProgressionSummary(
    snapshot.adaptationIndex != null && snapshot.adaptationStatus
      ? {
          adaptationIndex: snapshot.adaptationIndex,
          adaptationStatus: snapshot.adaptationStatus,
          adaptationTrend: snapshot.adaptationTrend ?? 'STABLE',
        }
      : null,
    weeklyLoad,
  );

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

  const morningOrientation = resolveMorningOrientation({
    phase,
    snapshot,
    recalibration: morningRecalibration,
  });

  const presentedRecalibration =
    morningRecalibration?.status === 'PRESENTED' ? morningRecalibration : null;

  const effectiveHeadline = morningOrientation?.heroHeadline ?? heroHeadline;
  const effectiveSubline = morningOrientation?.heroSubline ?? heroSubline;
  const hideHeroConfidence = Boolean(morningOrientation?.hideHeroConfidence);
  const evidencePending = morningOrientation?.phase === 'EVIDENCE_PENDING';
  const suppressVerdictColors = evidencePending;

  let morningEyebrow = heroEyebrow;
  if (evidencePending) morningEyebrow = 'Ce matin';

  let plateLimiterText: string | null = null;
  let plateLimiterHref: string | null = null;
  if (!evidencePending && snapshot.limitingFactor != null) {
    plateLimiterText =
      buildTodayLimitingFacts({ limitingFactor: snapshot.limitingFactor }).facts.find(
        (f) => f.label === 'Frein',
      )?.value ?? null;
    plateLimiterHref =
      resolveLimitingFactorHrefFromDecision(snapshot.decision) ?? TWIN_DRILL_DOWN.recovery;
  }

  const effectiveStatusMessage = evidencePending ? null : statusMessage;
  const sessionChoice = morningOrientation?.sessionChoice ?? null;

  return {
    hasContent: snapshotHasDisplayableContent(snapshot),
    emptyState,
    statusMessage: effectiveStatusMessage,
    confidencePresentation: {
      pct: snapshot.confidence,
      label: snapshot.confidenceLabel,
      tone: confidenceTone,
    },
    effortUnavailableMessage: snapshot.effortUnavailableMessage,
    morningOrientation,
    navigationTargets: {
      sleep: { label: 'Sommeil', href: TWIN_DRILL_DOWN.sleep },
      recovery: { label: 'Récupération', href: TWIN_DRILL_DOWN.recovery },
      effort: { label: 'Effort', href: TWIN_DRILL_DOWN.effort },
      adaptation: { label: 'Adaptation', href: TWIN_DRILL_DOWN.adaptation },
      physical: { label: 'Santé physique', href: TWIN_DRILL_DOWN.physical },
      planning: { label: 'Planning', href: TWIN_DRILL_DOWN.planning },
    },
    hero: {
      eyebrow: morningEyebrow,
      headline: effectiveHeadline,
      subline: effectiveSubline,
      posture: suppressVerdictColors ? 'uncertain' : posture,
      postureLabel: suppressVerdictColors ? '' : postureLabel,
      focusPriority: evidencePending ? null : focusPriority,
      goalLine: evidencePending ? null : goalLine,
      actionLine: evidencePending ? null : actionLine,
      adaptationReminders,
      verdictStyle: {
        showVerdictColors: !suppressVerdictColors && verdict !== 'INSUFFICIENT_DATA',
        bgClass: displayVerdict.bgClass,
        colorClass: displayVerdict.colorClass,
        dotClass: displayVerdict.dotClass,
        accentBarClass: displayVerdict.accentBarClass,
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
        confidenceLabel: hideHeroConfidence ? null : confidenceLabel,
        confidencePctRounded: hideHeroConfidence ? null : confidencePctRounded,
        confidenceHref: hideHeroConfidence ? null : confidenceHref,
        limitingFactorText: plateLimiterText,
        limitingFactorHref: plateLimiterHref,
      },
    },
    whyBlock: {
      // Retired from Today hub — duplicated verdict + strip; limiter lives on the plate.
      title: whyBlockTitle(phase),
      lines: whyFacts.map((f) =>
        f.hint ? `${f.label} · ${f.value} (${f.hint})` : `${f.label} · ${f.value}`,
      ),
      facts: whyFacts,
      visible: false,
    },
    actionRow: {
      // Frein lives on the plate limiter — no duplicate column.
      showLimitingColumn: false,
      limitingLabel: labels.limiting,
      limitingMode,
      limitingLines,
      limitingText,
      limitingHref,
      limitingFacts,
      actionLabel: labels.action,
      daySummaryEmptyText: 'Aucune séance prévue ni réalisée.',
      daySummaryEmptyHref: TWIN_DRILL_DOWN.planning,
      daySummaryLines: daySummary.lines.map((line) => {
        const plannedId = line.plannedSession?.id ?? (line.kind === 'planned' ? line.id : null);
        const choiceLabel =
          sessionChoice && plannedId && sessionChoice.sessionId === plannedId
            ? sessionChoice.label
            : null;
        return {
          id: line.id,
          activityType: line.activityType,
          primary: line.primary,
          secondary: line.secondary ?? null,
          kind: line.kind,
          href:
            line.kind === 'done'
              ? TWIN_DRILL_DOWN.activity(line.id)
              : TWIN_DRILL_DOWN.plannedSession(line.plannedSession?.id ?? line.id),
          isDone: line.kind === 'done',
          morningChoiceLabel: choiceLabel,
        };
      }),
      morningRecalibration: presentedRecalibration
        ? {
            decisionId: presentedRecalibration.decisionId,
            sessionId: presentedRecalibration.sessionId,
            direction: presentedRecalibration.direction,
            changeSummary: presentedRecalibration.changeSummary,
            why: presentedRecalibration.why,
            status: presentedRecalibration.status,
          }
        : null,
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
    environmentContext: null,
    hierarchy: { rootId: 'today', order: ['hero', 'why', 'actionRow', 'weeklyTrajectory'] },
    sections: [],
  };
}
