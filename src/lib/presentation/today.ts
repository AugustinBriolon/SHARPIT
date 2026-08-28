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

type SnapshotStatusInput = {
  snapshot: AthleteSnapshot;
  phase: string;
  heroHeadline: string;
  heroSubline: string;
  reconnectNames: string[];
};

function snapshotStatusCandidate(
  snapshot: AthleteSnapshot,
  hasContent: boolean,
): string | null {
  if (hasContent) {
    return snapshot.freshness.primaryProductMessage;
  }
  return snapshot.primaryProductMessage ?? snapshot.insufficientDataMessage ?? null;
}

function resolveSnapshotStatusMessage(input: SnapshotStatusInput): {
  message: string | null;
  href: string | null;
  snoozeKey: string | null;
} {
  const reconnectMessage = reconnectProductMessage(input.reconnectNames);
  if (reconnectMessage) {
    return {
      message: reconnectMessage,
      href: INTEGRATIONS_RECONNECT_HREF,
      snoozeKey: reconnectSnoozeKey(input.reconnectNames),
    };
  }

  const hasContent = snapshotHasDisplayableContent(input.snapshot);
  if (input.phase === 'END_OF_DAY' && hasContent) {
    return { message: null, href: null, snoozeKey: null };
  }

  const candidate = snapshotStatusCandidate(input.snapshot, hasContent);
  if (!candidate) {
    return { message: null, href: null, snoozeKey: null };
  }
  if (hasContent && (candidate === input.heroHeadline || candidate === input.heroSubline)) {
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

function buildTodayScores(
  effectiveSnapshot: AthleteSnapshot,
  healthEntries: TodayPresentationInputs['healthEntries'],
  day: Date,
  sleepTargetMin: number,
) {
  const sleepScoreSharpit = computeSharpitSleepScoreForDay(healthEntries, day, sleepTargetMin);
  const sleepScore = sleepScoreSharpit ?? effectiveSnapshot.sleepScore;
  const effortScore =
    effectiveSnapshot.dailyStrain?.available && effectiveSnapshot.dailyStrain.strainScore !== null
      ? effectiveSnapshot.dailyStrain.strainScore
      : null;
  return {
    sleepScore,
    recoveryScore: effectiveSnapshot.readiness,
    effortScore,
    adaptationScore: effectiveSnapshot.adaptationIndex,
    adaptationUnavailableCaption:
      effectiveSnapshot.adaptationIndex === null ? 'Historique insuffisant' : null,
  };
}

function shouldPreferAdaptationReminders(input: {
  phase: string;
  adaptationHints: string[];
  focusPriority: string | null;
  limitingFactor: AthleteSnapshot['limitingFactor'];
}): boolean {
  return (
    input.phase === 'RECOVERY_WINDOW' &&
    input.adaptationHints.length > 0 &&
    !input.focusPriority &&
    !input.limitingFactor
  );
}

function buildTodayLimitingSection(input: {
  phase: string;
  effectiveSnapshot: AthleteSnapshot;
  focusPriority: string | null;
  adaptationHints: string[];
}) {
  if (input.phase === 'END_OF_DAY') {
    return {
      limitingMode: 'none' as const,
      limitingLines: [] as string[],
      limitingText: null as string | null,
      limitingHref: null as string | null,
      limitingFacts: [] as TodayViewModel['actionRow']['limitingFacts'],
    };
  }

  const preferReminders = shouldPreferAdaptationReminders({
    phase: input.phase,
    adaptationHints: input.adaptationHints,
    focusPriority: input.focusPriority,
    limitingFactor: input.effectiveSnapshot.limitingFactor,
  });
  const limitingBuilt = buildTodayLimitingFacts({
    limitingFactor: preferReminders ? null : input.effectiveSnapshot.limitingFactor,
    reminders: preferReminders ? input.adaptationHints : [],
  });
  const limitingHref =
    input.effectiveSnapshot.limitingFactor !== null
      ? (resolveLimitingFactorHrefFromDecision(input.effectiveSnapshot.decision) ??
        TWIN_DRILL_DOWN.recovery)
      : null;

  return {
    limitingMode:
      limitingBuilt.facts.length > 0 || limitingBuilt.emptyText
        ? ('facts' as const)
        : ('none' as const),
    limitingLines: [] as string[],
    limitingText: limitingBuilt.emptyText,
    limitingHref,
    limitingFacts: limitingBuilt.facts,
  };
}

function daySummaryLineHref(
  line: ReturnType<typeof buildTodayDaySummary>['lines'][number],
): string {
  if (line.kind === 'done') {
    return TWIN_DRILL_DOWN.activity(line.id);
  }
  return TWIN_DRILL_DOWN.plannedSession(line.plannedSession?.id ?? line.id);
}

function morningChoiceForLine(
  plannedId: string | null,
  sessionChoice: ReturnType<typeof resolveMorningOrientation>['sessionChoice'],
): string | null {
  if (!sessionChoice || !plannedId || sessionChoice.sessionId !== plannedId) {
    return null;
  }
  return sessionChoice.label;
}

function mapDaySummaryLineForView(
  line: ReturnType<typeof buildTodayDaySummary>['lines'][number],
  sessionChoice: ReturnType<typeof resolveMorningOrientation>['sessionChoice'],
) {
  const plannedId = line.plannedSession?.id ?? (line.kind === 'planned' ? line.id : null);
  return {
    id: plannedId ?? line.id,
    activityType: line.activityType,
    primary: line.primary,
    secondary: line.secondary ?? null,
    kind: line.kind,
    href: daySummaryLineHref(line),
    isDone: line.kind === 'done',
    morningChoiceLabel: morningChoiceForLine(plannedId, sessionChoice),
    brickLegs: line.brickLegs ?? null,
  };
}

function buildPlateLimiter(
  effectiveSnapshot: AthleteSnapshot,
): { text: string | null; href: string | null } {
  if (effectiveSnapshot.limitingFactor === null) {
    return { text: null, href: null };
  }
  const text =
    buildTodayLimitingFacts({ limitingFactor: effectiveSnapshot.limitingFactor }).facts.find(
      (f) => f.label === 'Cause',
    )?.value ?? null;
  const href =
    resolveLimitingFactorHrefFromDecision(effectiveSnapshot.decision) ?? TWIN_DRILL_DOWN.recovery;
  return { text, href };
}

function phaseNarrativeText(
  narrative: AthleteSnapshot['phaseNarrative'],
  field: 'heroHeadline' | 'heroSubline' | 'heroEyebrow' | 'postureLabel',
  fallback: string,
): string {
  const value = narrative?.[field];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function heroHeadlineFrom(
  narrative: AthleteSnapshot['phaseNarrative'],
  displayVerdict: ReturnType<typeof mapVerdictToDisplay>,
): string {
  return narrative?.heroHeadline ?? displayVerdict.label;
}

function heroSublineFrom(
  narrative: AthleteSnapshot['phaseNarrative'],
  insufficientDataMessage: string | null,
): string {
  return narrative?.heroSubline ?? insufficientDataMessage ?? '';
}

function buildHeroCopy(
  effectiveSnapshot: AthleteSnapshot,
  displayVerdict: ReturnType<typeof mapVerdictToDisplay>,
) {
  const narrative = effectiveSnapshot.phaseNarrative;
  return {
    heroHeadline: heroHeadlineFrom(narrative, displayVerdict),
    heroSubline: heroSublineFrom(narrative, effectiveSnapshot.insufficientDataMessage),
    heroEyebrow: phaseNarrativeText(narrative, 'heroEyebrow', "Qu'est-ce qui compte aujourd'hui ?"),
    posture: narrative?.posture ?? 'uncertain',
    postureLabel: phaseNarrativeText(narrative, 'postureLabel', ''),
    goalLine: narrative?.goalLine ?? null,
  };
}

function buildFocusPriority(
  effectiveSnapshot: AthleteSnapshot,
  phase: string,
): string | null {
  if (effectiveSnapshot.phaseNarrative?.focusPriority) {
    return effectiveSnapshot.phaseNarrative.focusPriority;
  }
  const adviceActionable = Boolean(effectiveSnapshot.adviceActionable);
  if (!adviceActionable || !shouldShowForwardTrainingCopy(phase)) {
    return null;
  }
  return buildTopActionLine(decisionTopAction(effectiveSnapshot.decision));
}

function buildConfidenceFields(effectiveSnapshot: AthleteSnapshot) {
  const adviceActionable = Boolean(effectiveSnapshot.adviceActionable);
  const confidenceTier =
    effectiveSnapshot.confidence !== null
      ? mapConfidenceToTier(effectiveSnapshot.confidence)
      : null;
  const confidenceLabel = resolveVisibleConfidenceLabel(
    effectiveSnapshot.confidenceLabel ?? null,
    confidenceTier,
    adviceActionable,
  );
  return {
    confidenceTone: confidenceTier !== null ? mapConfidenceTone(confidenceTier) : 'neutral',
    confidenceLabel,
    confidencePctRounded:
      confidenceLabel !== null && effectiveSnapshot.confidence !== null
        ? Math.round(effectiveSnapshot.confidence * 100)
        : null,
    confidenceHref: resolveConfidenceHrefFromDecision(effectiveSnapshot.decision),
  };
}

function prepareTodayHeroFields(
  effectiveSnapshot: AthleteSnapshot,
  displayVerdict: ReturnType<typeof mapVerdictToDisplay>,
) {
  const phase = effectiveSnapshot.dailyPhase?.phase ?? 'MORNING';
  return {
    ...buildHeroCopy(effectiveSnapshot, displayVerdict),
    focusPriority: buildFocusPriority(effectiveSnapshot, phase),
    ...buildConfidenceFields(effectiveSnapshot),
  };
}

function prepareTodayActionFields(input: {
  day: Date;
  phase: string;
  effectiveSnapshot: AthleteSnapshot;
  focusPriority: string | null;
  activities: TodayPresentationInputs['activities'];
  plannedSessions: TodayPresentationInputs['plannedSessions'];
  goals: TodayPresentationInputs['goals'];
}) {
  const isRestDay = input.effectiveSnapshot.dailyPhase?.signals.sessionStatus === 'NONE_TODAY';
  const goalTitleById = new Map(input.goals.map((g) => [g.id, g.title] as const));
  const daySummary = buildTodayDaySummary(
    input.day,
    input.activities as unknown as ClientActivity[],
    input.plannedSessions as unknown as ClientPlannedSession[],
    goalTitleById,
  );
  const adaptationHints = pickAdaptationReminders(input.phase, 3, isRestDay);

  return {
    whyFacts: buildTodayWhyFacts({
      verdict: decisionVerdict(input.effectiveSnapshot.decision),
      consistency: input.effectiveSnapshot.decision?.physiologicalConsistency ?? null,
      decision: input.effectiveSnapshot.decision,
      whyFocus: input.effectiveSnapshot.dailyPhase?.whyFocus ?? 'readiness',
    }),
    sessionLinkSuggestions: findSessionLinkSuggestions(
      input.day,
      input.activities as unknown as ClientActivity[],
      input.plannedSessions as unknown as ClientPlannedSession[],
    ),
    daySummary,
    missedSessions: findMissedPlannedSessions(
      input.plannedSessions as unknown as ClientPlannedSession[],
      input.day,
    ).filter((s) => !isDemoSessionLinkPlannedTitle(s.title)),
    labels: actionRowLabels(input.phase),
    limitingSection: buildTodayLimitingSection({
      phase: input.phase,
      effectiveSnapshot: input.effectiveSnapshot,
      focusPriority: input.focusPriority,
      adaptationHints,
    }),
  };
}

function mapPostSessionActivities(
  activities: TodayPresentationInputs['activities'],
) {
  return (
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
  }));
}

function resolveMorningEyebrow(
  evidencePending: boolean,
  heroEyebrow: string,
): string {
  if (evidencePending && !heroEyebrow) {
    return 'Ce matin';
  }
  return heroEyebrow;
}

function morningPresentationFromOrientation(
  morningOrientation: ReturnType<typeof resolveMorningOrientation>,
  input: {
    heroHeadline: string;
    heroSubline: string;
    heroEyebrow: string;
  },
) {
  if (!morningOrientation) {
    return {
      effectiveHeadline: input.heroHeadline,
      effectiveSubline: input.heroSubline,
      hideHeroConfidence: false,
      heroEyebrow: input.heroEyebrow,
      sessionChoice: null,
    };
  }

  const evidencePending = morningOrientation.phase === 'EVIDENCE_PENDING';
  return {
    effectiveHeadline: morningOrientation.heroHeadline ?? input.heroHeadline,
    effectiveSubline: morningOrientation.heroSubline ?? input.heroSubline,
    hideHeroConfidence: Boolean(morningOrientation.hideHeroConfidence),
    heroEyebrow: resolveMorningEyebrow(evidencePending, input.heroEyebrow),
    sessionChoice: morningOrientation.sessionChoice ?? null,
  };
}

function prepareTodayMorningFields(
  input: {
    phase: string;
    effectiveSnapshot: AthleteSnapshot;
    morningRecalibration: MorningRecalibrationInput | null;
    heroHeadline: string;
    heroSubline: string;
    heroEyebrow: string;
    day: Date;
    activities: TodayPresentationInputs['activities'];
  },
) {
  const morningOrientation = resolveMorningOrientation({
    phase: input.phase,
    snapshot: input.effectiveSnapshot,
    recalibration: input.morningRecalibration,
  });

  return {
    morningOrientation,
    presentedRecalibration:
      input.morningRecalibration?.status === 'PRESENTED' ? input.morningRecalibration : null,
    ...morningPresentationFromOrientation(morningOrientation, input),
    postSessionLoop: buildPostSessionLoop({
      phase: input.phase,
      overallFresh: input.effectiveSnapshot.freshness.overallFresh,
      day: input.day,
      activities: mapPostSessionActivities(input.activities),
    }),
  };
}

function buildTodayEmptyState(
  effectiveSnapshot: AthleteSnapshot,
  statusMessage: string | null,
) {
  if (snapshotHasDisplayableContent(effectiveSnapshot)) {
    return null;
  }
  if (!statusMessage && !effectiveSnapshot.primaryProductMessage) {
    return null;
  }
  return {
    title: 'Données insuffisantes',
    description:
      effectiveSnapshot.insufficientDataMessage ??
      effectiveSnapshot.primaryProductMessage ??
      'SHARPIT attend tes premières données physiologiques pour établir ton bilan.',
  };
}

function prepareTodayViewModelContext(inputs: TodayPresentationInputs) {
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

  const effectiveSnapshot = isDemoAthleteProfile(athleteProfile)
    ? withDemoSnapshotFreshness(snapshot)
    : snapshot;
  const sleepTargetMin = athleteProfile?.sleepTargetMinutes ?? SLEEP_TARGET_MIN;
  const scores = buildTodayScores(effectiveSnapshot, healthEntries, day, sleepTargetMin);
  const phase = effectiveSnapshot.dailyPhase?.phase ?? 'MORNING';
  const verdict = decisionVerdict(effectiveSnapshot.decision);
  const displayVerdict = mapVerdictToDisplay(verdict);
  const hero = prepareTodayHeroFields(effectiveSnapshot, displayVerdict);
  const action = prepareTodayActionFields({
    day,
    phase,
    effectiveSnapshot,
    focusPriority: hero.focusPriority,
    activities,
    plannedSessions,
    goals,
  });
  const status = resolveSnapshotStatusMessage({
    snapshot: effectiveSnapshot,
    phase,
    heroHeadline: hero.heroHeadline,
    heroSubline: hero.heroSubline,
    reconnectNames: inputs.reconnectNames ?? [],
  });
  const morning = prepareTodayMorningFields({
    phase,
    effectiveSnapshot,
    morningRecalibration,
    heroHeadline: hero.heroHeadline,
    heroSubline: hero.heroSubline,
    heroEyebrow: hero.heroEyebrow,
    day,
    activities,
  });

  return {
    day,
    weather,
    effectiveSnapshot,
    scores,
    phase,
    verdict,
    displayVerdict,
    ...hero,
    heroEyebrow: morning.heroEyebrow,
    ...action,
    status,
    emptyState: buildTodayEmptyState(effectiveSnapshot, status.message),
    ...morning,
    plateLimiter: buildPlateLimiter(effectiveSnapshot),
  };
}

function assembleTodayViewModel(
  ctx: ReturnType<typeof prepareTodayViewModelContext>,
): TodayViewModel {
  return {
    hasContent: snapshotHasDisplayableContent(ctx.effectiveSnapshot),
    emptyState: ctx.emptyState,
    statusMessage: ctx.status.message,
    statusHref: ctx.status.href,
    statusSnoozeKey: ctx.status.snoozeKey,
    confidencePresentation: {
      pct: ctx.effectiveSnapshot.confidence,
      label: ctx.effectiveSnapshot.confidenceLabel,
      tone: ctx.confidenceTone,
    },
    effortUnavailableMessage: ctx.effectiveSnapshot.effortUnavailableMessage,
    morningOrientation: ctx.morningOrientation,
    navigationTargets: {
      sleep: { label: 'Sommeil', href: TWIN_DRILL_DOWN.sleep },
      recovery: { label: 'Récupération', href: TWIN_DRILL_DOWN.recovery },
      effort: { label: 'Effort', href: TWIN_DRILL_DOWN.effort },
      adaptation: { label: 'Adaptation', href: TWIN_DRILL_DOWN.adaptation },
      physical: { label: 'Santé physique', href: TWIN_DRILL_DOWN.physical },
      planning: { label: 'Planning', href: TWIN_DRILL_DOWN.planning },
    },
    hero: {
      eyebrow: ctx.heroEyebrow,
      headline: ctx.effectiveHeadline,
      subline: ctx.effectiveSubline,
      posture: ctx.posture,
      postureLabel: ctx.postureLabel,
      focusPriority: ctx.focusPriority,
      goalLine: ctx.goalLine,
      actionLine: ctx.focusPriority,
      adaptationReminders: [],
      verdictStyle: {
        showVerdictColors: ctx.verdict !== 'INSUFFICIENT_DATA',
        bgClass: ctx.displayVerdict.bgClass,
        colorClass: ctx.displayVerdict.colorClass,
        dotClass: ctx.displayVerdict.dotClass,
        accentBarClass: ctx.displayVerdict.accentBarClass,
      },
      metricsRow: {
        sleepScore: ctx.scores.sleepScore,
        recoveryScore: ctx.scores.recoveryScore,
        effortScore: ctx.scores.effortScore,
        adaptationScore: ctx.scores.adaptationScore,
        effortUnavailableCaption: null,
        adaptationUnavailableCaption: ctx.scores.adaptationUnavailableCaption,
      },
      twinTrustStrip: {
        confidenceLabel: ctx.hideHeroConfidence ? null : ctx.confidenceLabel,
        confidencePctRounded: ctx.hideHeroConfidence ? null : ctx.confidencePctRounded,
        confidenceHref: ctx.hideHeroConfidence ? null : ctx.confidenceHref,
        limitingCauseText: ctx.plateLimiter.text,
        limitingFactorHref: ctx.plateLimiter.href,
      },
    },
    whyBlock: {
      title: whyBlockTitle(ctx.phase),
      lines: ctx.whyFacts.map((f) =>
        f.hint ? `${f.label} · ${f.value} (${f.hint})` : `${f.label} · ${f.value}`,
      ),
      facts: ctx.whyFacts,
      visible: false,
    },
    actionRow: {
      showLimitingColumn: false,
      limitingLabel: ctx.labels.limiting,
      limitingMode: ctx.limitingSection.limitingMode,
      limitingLines: ctx.limitingSection.limitingLines,
      limitingText: ctx.limitingSection.limitingText,
      limitingHref: ctx.limitingSection.limitingHref,
      limitingFacts: ctx.limitingSection.limitingFacts,
      actionLabel: ctx.labels.action,
      daySummaryEmptyText: 'Aucune séance prévue ni réalisée.',
      daySummaryEmptyHref: TWIN_DRILL_DOWN.planning,
      sessionLinkSuggestions: ctx.sessionLinkSuggestions.map(mapSessionLinkSuggestion),
      daySummaryLines: [
        ...ctx.daySummary.lines.map((line) =>
          mapDaySummaryLineForView(line, ctx.sessionChoice),
        ),
        ...ctx.missedSessions.map((s) => ({
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
      morningRecalibration: ctx.presentedRecalibration
        ? {
            decisionId: ctx.presentedRecalibration.decisionId,
            sessionId: ctx.presentedRecalibration.sessionId,
            sessionType: ctx.presentedRecalibration.sessionType,
            direction: ctx.presentedRecalibration.direction,
            changeSummary: ctx.presentedRecalibration.changeSummary,
            why: ctx.presentedRecalibration.why,
            status: ctx.presentedRecalibration.status,
            fromIntensity: ctx.presentedRecalibration.fromIntensity,
            toIntensity: ctx.presentedRecalibration.toIntensity,
            fromDurationMin: ctx.presentedRecalibration.fromDurationMin,
            toDurationMin: ctx.presentedRecalibration.toDurationMin,
            fromLoad: ctx.presentedRecalibration.fromLoad,
            toLoad: ctx.presentedRecalibration.toLoad,
            fromDescription: ctx.presentedRecalibration.fromDescription,
            toDescription: ctx.presentedRecalibration.toDescription,
          }
        : null,
    },
    insights: [],
    header: {
      weather: ctx.weather
        ? {
            city: ctx.weather.city,
            tempC: ctx.weather.tempC,
            condition: ctx.weather.condition,
            locationKnown: ctx.weather.locationKnown,
          }
        : null,
    },
    environmentContext: null,
    nutrition: null,
    postSessionLoop: ctx.postSessionLoop,
    hierarchy: { rootId: 'today', order: ['hero', 'why', 'actionRow'] },
    sections: [],
  };
}

/**
 * Pure Today view-model projection from already-loaded inputs.
 * No I/O — callers (routes) ensure morning recalibration before loading.
 */
export function buildTodayViewModelFromInputs(inputs: TodayPresentationInputs): TodayViewModel {
  return assembleTodayViewModel(prepareTodayViewModelContext(inputs));
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
