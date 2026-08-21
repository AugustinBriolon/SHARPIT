import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { snapshotHasDisplayableContent } from '@/core/athlete-state/snapshot';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { pickAdaptationReminders } from '@/lib/daily-phase/narrative';
import {
  getActivitiesList,
  getAthleteProfile,
  getGoals,
  getHealthEntries,
  getPlannedSessions,
} from '@/lib/queries';
import { computeSharpitSleepScoreForDay, SLEEP_TARGET_MIN } from '@/lib/sleep/sleep-scoring';
import { buildTodayDaySummary, findMissedPlannedSessions } from '@/lib/today/today-day-summary';
import {
  mapConfidenceToTier,
  mapVerdictToDisplay,
  resolveVisibleConfidenceLabel,
} from '@/lib/today/today-mapping';
import {
  actionRowLabels,
  buildTopActionLine,
  shouldShowForwardTrainingCopy,
  whyBlockTitle,
} from '@/lib/today/today-rich-view';
import {
  resolveMorningOrientation,
  type MorningRecalibrationInput,
} from '@/lib/today/morning-orientation';
import {
  decisionTopAction,
  decisionVerdict,
  resolveConfidenceHrefFromDecision,
  resolveLimitingFactorHrefFromDecision,
} from '@/lib/decision/projection';
import { buildTodayLimitingFacts, buildTodayWhyFacts } from '@/lib/today/today-instrument-facts';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import { loadDailyTrainingStressEntries } from '@/lib/training/pmc-server';
import { endOfDay, format as formatDate, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { activityTypeLabels } from '@/lib/format';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { getGarminAccount } from '@/lib/integrations/garmin/garmin-sync';
import { getGoogleAccount } from '@/lib/integrations/google/google-sync';
import { getRenphoAccount } from '@/lib/integrations/renpho/renpho-sync';
import { getStravaAccount } from '@/lib/integrations/strava/strava-sync';
import { getWithingsAccount } from '@/lib/integrations/withings/withings-sync';
import {
  INTEGRATIONS_RECONNECT_HREF,
  reconnectProductMessage,
  reconnectProviderNames,
} from '@/lib/integrations/shared/connection-status';
import { reconnectSnoozeKey } from '@/lib/integrations/shared/reconnect-banner-state';

function localDateFromTrainingDayId(trainingDayId: string): Date {
  const [y, m, d] = trainingDayId.split('-').map(Number);
  // Midday local avoids DST edge cases when subtracting days.
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatMissedDate(date: Date): string {
  return `Manquée · ${formatDate(date, 'EEEE d', { locale: fr })}`;
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
  reconnectNames: string[],
): { message: string | null; href: string | null; snoozeKey: string | null } {
  const reconnectMessage = reconnectProductMessage(reconnectNames);
  if (reconnectMessage) {
    return {
      message: reconnectMessage,
      href: INTEGRATIONS_RECONNECT_HREF,
      snoozeKey: reconnectSnoozeKey(reconnectNames),
    };
  }

  const hasContent = snapshotHasDisplayableContent(snapshot);

  if (phase === 'END_OF_DAY' && hasContent) return { message: null, href: null, snoozeKey: null };

  const candidate = hasContent
    ? snapshot.freshness.primaryProductMessage
    : (snapshot.primaryProductMessage ?? snapshot.insufficientDataMessage ?? null);

  if (!candidate) return { message: null, href: null, snoozeKey: null };
  if (hasContent && (candidate === heroHeadline || candidate === heroSubline)) {
    return { message: null, href: null, snoozeKey: null };
  }

  return { message: candidate, href: null, snoozeKey: null };
}

export type TodayPresentationInputs = {
  trainingDayId: string;
  day: Date;
  snapshot: AthleteSnapshot;
  healthEntries: Awaited<ReturnType<typeof getHealthEntries>>;
  activities: Awaited<ReturnType<typeof getActivitiesList>>;
  plannedSessions: Awaited<ReturnType<typeof getPlannedSessions>>;
  goals: Awaited<ReturnType<typeof getGoals>>;
  athleteProfile: Awaited<ReturnType<typeof getAthleteProfile>>;
  /**
   * Provider display names whose credentials are dead (row still present).
   * Empty when every linked app can still authenticate.
   */
  reconnectNames?: string[];
  /**
   * One entry per training day, carrying the Core's Training Stress. Feeds the
   * effort sparkline and the rolling load so this page cannot report a different
   * weekly load than the effort dashboard. See ADR-011.
   */
  dailyStress: { load: number; date: Date }[];
  /** Ensured by the API route (write side-effect stays off this projection). */
  morningRecalibration: MorningRecalibrationInput | null;
};

/**
 * Pure Today view-model projection from already-loaded inputs.
 * No I/O — callers (routes) ensure morning recalibration before loading.
 */
export function buildTodayViewModelFromInputs(inputs: TodayPresentationInputs): TodayViewModel {
  const {
    day,
    snapshot,
    healthEntries,
    activities,
    plannedSessions,
    goals,
    athleteProfile,
    morningRecalibration,
  } = inputs;

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

  const goalTitleById = new Map(goals.map((g) => [g.id, g.title] as const));
  const daySummary = buildTodayDaySummary(
    day,
    activities as unknown as ClientActivity[],
    plannedSessions as unknown as ClientPlannedSession[],
    goalTitleById,
  );
  const missedSessions = findMissedPlannedSessions(
    plannedSessions as unknown as ClientPlannedSession[],
    day,
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

  const status = resolveSnapshotStatusMessage(
    snapshot,
    phase,
    heroHeadline,
    heroSubline,
    inputs.reconnectNames ?? [],
  );
  const statusMessage = status.message;
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

  let morningEyebrow = heroEyebrow;
  if (evidencePending && !morningEyebrow) morningEyebrow = 'Ce matin';

  let plateLimiterText: string | null = null;
  let plateLimiterHref: string | null = null;
  if (snapshot.limitingFactor != null) {
    plateLimiterText =
      buildTodayLimitingFacts({ limitingFactor: snapshot.limitingFactor }).facts.find(
        (f) => f.label === 'Frein',
      )?.value ?? null;
    plateLimiterHref =
      resolveLimitingFactorHrefFromDecision(snapshot.decision) ?? TWIN_DRILL_DOWN.recovery;
  }

  const effectiveStatusMessage = statusMessage;
  const sessionChoice = morningOrientation?.sessionChoice ?? null;

  return {
    hasContent: snapshotHasDisplayableContent(snapshot),
    emptyState,
    statusMessage: effectiveStatusMessage,
    statusHref: status.href,
    statusSnoozeKey: status.snoozeKey,
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
      posture,
      postureLabel,
      focusPriority,
      goalLine,
      actionLine,
      adaptationReminders,
      verdictStyle: {
        showVerdictColors: verdict !== 'INSUFFICIENT_DATA',
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
      daySummaryLines: [
        ...daySummary.lines.map((line) => {
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
        ...missedSessions.map((s) => ({
          id: s.id,
          activityType: s.type,
          primary: s.title?.trim() || activityTypeLabels[s.type],
          secondary: formatMissedDate(new Date(s.date)),
          kind: 'missed' as const,
          href: TWIN_DRILL_DOWN.plannedSession(s.id),
          isDone: false,
          morningChoiceLabel: null,
        })),
      ],
      morningRecalibration: presentedRecalibration
        ? {
            decisionId: presentedRecalibration.decisionId,
            sessionId: presentedRecalibration.sessionId,
            sessionType: presentedRecalibration.sessionType,
            direction: presentedRecalibration.direction,
            changeSummary: presentedRecalibration.changeSummary,
            why: presentedRecalibration.why,
            status: presentedRecalibration.status,
            fromIntensity: presentedRecalibration.fromIntensity,
            toIntensity: presentedRecalibration.toIntensity,
            fromDurationMin: presentedRecalibration.fromDurationMin,
            toDurationMin: presentedRecalibration.toDurationMin,
            fromLoad: presentedRecalibration.fromLoad,
            toLoad: presentedRecalibration.toLoad,
            fromDescription: presentedRecalibration.fromDescription,
            toDescription: presentedRecalibration.toDescription,
          }
        : null,
    },
    insights: [],
    environmentContext: null,
    nutrition: null,
    hierarchy: { rootId: 'today', order: ['hero', 'why', 'actionRow'] },
    sections: [],
  };
}

export type BuildTodayPresentationOptions = {
  /** Pre-ensured by the route. Defaults to null (no proposal). */
  morningRecalibration?: MorningRecalibrationInput | null;
  /** Reuse snapshot from refreshAthleteState — skips a second getOrBuild. */
  athleteSnapshot?: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>;
};

/**
 * Loads Today presentation inputs then projects a view-model.
 * Does not write morning recalibration — callers must ensure first when needed.
 */
export async function buildTodayPresentationViewModel(
  trainingDayId: string,
  options: BuildTodayPresentationOptions = {},
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
    goals,
    athleteProfile,
    dailyStress,
    reconnectNames,
  ] = await Promise.all([
    options.athleteSnapshot
      ? Promise.resolve(options.athleteSnapshot)
      : getOrBuildAthleteSnapshot(trainingDayId),
    getHealthEntries(14, day),
    getActivitiesList({ sinceDays: 60 }),
    getPlannedSessions({ from: new Date(dayStart.getTime() - 7 * 86_400_000), to: dayEnd }),
    getGoals(),
    getAthleteProfile(),
    loadDailyTrainingStressEntries({ refDate: day }),
    loadReconnectProviderNames(),
  ]);

  return buildTodayViewModelFromInputs({
    trainingDayId,
    day,
    snapshot,
    healthEntries,
    activities,
    plannedSessions,
    goals,
    athleteProfile,
    dailyStress,
    morningRecalibration: options.morningRecalibration ?? null,
    reconnectNames,
  });
}

async function loadReconnectProviderNames(): Promise<string[]> {
  const [strava, garmin, withings, renpho, google] = await Promise.all([
    getStravaAccount().catch(() => null),
    getGarminAccount().catch(() => null),
    getWithingsAccount().catch(() => null),
    getRenphoAccount().catch(() => null),
    getGoogleAccount().catch(() => null),
  ]);
  return reconnectProviderNames({ strava, garmin, withings, renpho, google });
}
