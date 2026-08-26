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
import { activityTypeLabels } from '@/lib/format';
import { isDemoSessionLinkPlannedTitle } from '@/lib/demo/demo-session-link-markers';
import { buildPostSessionLoop } from '@/lib/today/post-session-loop';
import { buildTodayDaySummary, findMissedPlannedSessions } from '@/lib/today/today-day-summary';
import {
  findSessionLinkSuggestions,
  type SessionLinkSuggestion,
} from '@/lib/today/session-link-suggestions';
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
import { endOfDay, format as formatDate, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import type { TodayWeather } from '@/lib/today/today-weather';
import { loadTodayWeather } from '@/lib/today/today-weather';
import { isDemoAthleteProfile, withDemoSnapshotFreshness } from '@/lib/demo/demo-presentation';

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
  /** Today's forecast for the header. Null when unavailable — the screen renders without it. */
  weather?: TodayWeather | null;
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
  /** Ensured by the API route (write side-effect stays off this projection). */
  morningRecalibration: MorningRecalibrationInput | null;
};

function mapSessionLinkSuggestion(s: SessionLinkSuggestion) {
  return {
    id: s.id,
    plannedSessionId: s.plannedSessionId,
    activityId: s.activityId,
    activityType: s.activityType,
    score: s.score,
    matchLabel: s.matchLabel,
    plannedPrimary: s.plannedPrimary,
    plannedSecondary: s.plannedSecondary ?? null,
    activityPrimary: s.activityPrimary,
    activitySecondary: s.activitySecondary ?? null,
  };
}

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
    weather,
  } = inputs;

  const isDemo = isDemoAthleteProfile(athleteProfile);
  const effectiveSnapshot = isDemo ? withDemoSnapshotFreshness(snapshot) : snapshot;

  const sleepTargetMin = athleteProfile?.sleepTargetMinutes ?? SLEEP_TARGET_MIN;

  const recoveryScore = effectiveSnapshot.readiness;
  const sleepScoreSharpit = computeSharpitSleepScoreForDay(healthEntries, day, sleepTargetMin);
  const sleepScore = sleepScoreSharpit ?? effectiveSnapshot.sleepScore;

  const effortScore =
    effectiveSnapshot.dailyStrain?.available && effectiveSnapshot.dailyStrain.strainScore != null
      ? effectiveSnapshot.dailyStrain.strainScore
      : null;

  const adaptationScore = effectiveSnapshot.adaptationIndex;
  const adaptationUnavailableCaption =
    effectiveSnapshot.adaptationIndex == null ? 'Historique insuffisant' : null;

  const phase = effectiveSnapshot.dailyPhase?.phase ?? 'MORNING';
  const isRestDay = effectiveSnapshot.dailyPhase?.signals.sessionStatus === 'NONE_TODAY';
  const adviceActionable = Boolean(effectiveSnapshot.adviceActionable);
  const forward = shouldShowForwardTrainingCopy(phase);

  const verdict = decisionVerdict(effectiveSnapshot.decision);
  const displayVerdict = mapVerdictToDisplay(verdict);

  const heroHeadline = effectiveSnapshot.phaseNarrative?.heroHeadline ?? displayVerdict.label;
  const heroSubline =
    effectiveSnapshot.phaseNarrative?.heroSubline ??
    effectiveSnapshot.insufficientDataMessage ??
    '';
  const heroEyebrow =
    effectiveSnapshot.phaseNarrative?.heroEyebrow ?? "Qu'est-ce qui compte aujourd'hui ?";
  const posture = effectiveSnapshot.phaseNarrative?.posture ?? 'uncertain';
  const postureLabel = effectiveSnapshot.phaseNarrative?.postureLabel ?? '';
  const focusPriority =
    effectiveSnapshot.phaseNarrative?.focusPriority ??
    (adviceActionable && forward
      ? buildTopActionLine(decisionTopAction(effectiveSnapshot.decision))
      : null);
  const goalLine = effectiveSnapshot.phaseNarrative?.goalLine ?? null;
  const actionLine = focusPriority;
  const adaptationReminders: string[] = [];

  const confidenceTier =
    effectiveSnapshot.confidence != null ? mapConfidenceToTier(effectiveSnapshot.confidence) : null;
  const confidenceTone = confidenceTier != null ? mapConfidenceTone(confidenceTier) : 'neutral';

  const confidenceLabel = resolveVisibleConfidenceLabel(
    effectiveSnapshot.confidenceLabel ?? null,
    confidenceTier,
    adviceActionable,
  );
  const confidencePctRounded =
    confidenceLabel != null && effectiveSnapshot.confidence != null
      ? Math.round(effectiveSnapshot.confidence * 100)
      : null;
  const confidenceHref = resolveConfidenceHrefFromDecision(effectiveSnapshot.decision);

  const whyFocus = effectiveSnapshot.dailyPhase?.whyFocus ?? 'readiness';
  const whyFacts = buildTodayWhyFacts({
    verdict,
    consistency: effectiveSnapshot.decision?.physiologicalConsistency ?? null,
    decision: effectiveSnapshot.decision,
    whyFocus,
  });

  const goalTitleById = new Map(goals.map((g) => [g.id, g.title] as const));
  const sessionLinkSuggestions = findSessionLinkSuggestions(
    day,
    activities as unknown as ClientActivity[],
    plannedSessions as unknown as ClientPlannedSession[],
  );
  const daySummary = buildTodayDaySummary(
    day,
    activities as unknown as ClientActivity[],
    plannedSessions as unknown as ClientPlannedSession[],
    goalTitleById,
  );
  const missedSessions = findMissedPlannedSessions(
    plannedSessions as unknown as ClientPlannedSession[],
    day,
  ).filter((s) => !isDemoSessionLinkPlannedTitle(s.title));
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
      !effectiveSnapshot.limitingFactor;
    const limitingBuilt = buildTodayLimitingFacts({
      limitingFactor: preferReminders ? null : effectiveSnapshot.limitingFactor,
      reminders: preferReminders ? adaptationHints : [],
    });
    limitingFacts = limitingBuilt.facts;
    limitingText = limitingBuilt.emptyText;
    limitingHref =
      effectiveSnapshot.limitingFactor != null
        ? (resolveLimitingFactorHrefFromDecision(effectiveSnapshot.decision) ??
          TWIN_DRILL_DOWN.recovery)
        : null;
    limitingMode = limitingFacts.length > 0 || limitingText ? 'facts' : 'none';
  }

  const status = resolveSnapshotStatusMessage(
    effectiveSnapshot,
    phase,
    heroHeadline,
    heroSubline,
    inputs.reconnectNames ?? [],
  );
  const statusMessage = status.message;
  const emptyState =
    !snapshotHasDisplayableContent(effectiveSnapshot) &&
    (statusMessage || effectiveSnapshot.primaryProductMessage)
      ? {
          title: 'Données insuffisantes',
          description:
            effectiveSnapshot.insufficientDataMessage ??
            effectiveSnapshot.primaryProductMessage ??
            'SHARPIT attend tes premières données physiologiques pour établir ton bilan.',
        }
      : null;

  const morningOrientation = resolveMorningOrientation({
    phase,
    snapshot: effectiveSnapshot,
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
  if (effectiveSnapshot.limitingFactor != null) {
    /* The cause, not the system. The signal strip already names the dimension on
       the chip it tints, so repeating "Récupération" underneath it said nothing;
       "Qualité du sommeil" is the part that decides what to do about it. */
    plateLimiterText =
      buildTodayLimitingFacts({ limitingFactor: effectiveSnapshot.limitingFactor }).facts.find(
        (f) => f.label === 'Cause',
      )?.value ?? null;
    plateLimiterHref =
      resolveLimitingFactorHrefFromDecision(effectiveSnapshot.decision) ?? TWIN_DRILL_DOWN.recovery;
  }

  const effectiveStatusMessage = statusMessage;
  const sessionChoice = morningOrientation?.sessionChoice ?? null;

  const postSessionLoop = buildPostSessionLoop({
    phase,
    overallFresh: effectiveSnapshot.freshness.overallFresh,
    day,
    activities: (
      activities as unknown as Array<{
        id: string;
        title: string | null;
        type: keyof typeof activityTypeLabels;
        date: Date | string;
        rpe: number | null;
        feeling: string | null;
      }>
    ).map((a) => ({
      id: a.id,
      title: a.title,
      typeLabel: activityTypeLabels[a.type] ?? a.type,
      date: a.date,
      rpe: a.rpe,
      feeling: a.feeling,
    })),
  });

  return {
    hasContent: snapshotHasDisplayableContent(effectiveSnapshot),
    emptyState,
    statusMessage: effectiveStatusMessage,
    statusHref: status.href,
    statusSnoozeKey: status.snoozeKey,
    confidencePresentation: {
      pct: effectiveSnapshot.confidence,
      label: effectiveSnapshot.confidenceLabel,
      tone: confidenceTone,
    },
    effortUnavailableMessage: effectiveSnapshot.effortUnavailableMessage,
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
        limitingCauseText: plateLimiterText,
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
      sessionLinkSuggestions: sessionLinkSuggestions.map(mapSessionLinkSuggestion),
      daySummaryLines: [
        ...daySummary.lines.map((line) => {
          const plannedId = line.plannedSession?.id ?? (line.kind === 'planned' ? line.id : null);
          const choiceLabel =
            sessionChoice && plannedId && sessionChoice.sessionId === plannedId
              ? sessionChoice.label
              : null;
          return {
            // For a brick line, `line.id` is the brick group id (grouping key, not a
            // planned session). Downstream click handlers open a planned session by
            // id, so this must resolve to the first leg's real session id — the same
            // id the href below already deep-links to.
            id: plannedId ?? line.id,
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
    header: {
      weather: weather
        ? {
            city: weather.city,
            tempC: weather.tempC,
            condition: weather.condition,
            locationKnown: weather.locationKnown,
          }
        : null,
    },
    environmentContext: null,
    nutrition: null,
    postSessionLoop,
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
  athleteId: string,
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
    reconnectNames,
    weather,
  ] = await Promise.all([
    options.athleteSnapshot
      ? Promise.resolve(options.athleteSnapshot)
      : getOrBuildAthleteSnapshot(athleteId, trainingDayId),
    getHealthEntries(athleteId, 14, day),
    getActivitiesList(athleteId, { sinceDays: 60 }),
    getPlannedSessions(athleteId, {
      from: new Date(dayStart.getTime() - 7 * 86_400_000),
      to: dayEnd,
    }),
    getGoals(athleteId),
    getAthleteProfile(athleteId),
    loadReconnectProviderNames(athleteId),
    loadTodayWeather(athleteId, trainingDayId),
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
    morningRecalibration: options.morningRecalibration ?? null,
    reconnectNames,
    weather,
  });
}

async function loadReconnectProviderNames(athleteId: string): Promise<string[]> {
  const [strava, garmin, withings, renpho, google] = await Promise.all([
    getStravaAccount(athleteId).catch(() => null),
    getGarminAccount(athleteId).catch(() => null),
    getWithingsAccount(athleteId).catch(() => null),
    getRenphoAccount(athleteId).catch(() => null),
    getGoogleAccount(athleteId).catch(() => null),
  ]);
  return reconnectProviderNames({ strava, garmin, withings, renpho, google });
}
