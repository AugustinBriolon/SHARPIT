import type { ActivityType } from '@prisma/client';
import type { V1TodayConsistency } from '@sharpit/server/lib/presentation/v1/consistency';
import type { PresentationEmptyState } from '@sharpit/server/presentation/types';
import type { TodayViewModel } from '@sharpit/server/presentation/today-view-model';
import { activityTypeLabels } from '@sharpit/server/lib/format';
import { CONNECT_GARMIN_PATH } from '@sharpit/server/lib/integrations/garmin/garmin-connect-handoff';

export type V1TodayPackTier = 'FULL' | 'PARTIAL' | 'LOW' | 'INSUFFICIENT';

export type V1TodaySource = {
  hasContent: boolean;
  emptyState: PresentationEmptyState | null;
  hero: {
    eyebrow: string;
    headline: string;
    subline: string;
    posture: 'protect' | 'steady' | 'push' | 'uncertain';
    postureLabel?: string | null;
    focusPriority?: string | null;
    actionLine?: string | null;
    twinTrustStrip: {
      confidencePctRounded: number | null;
      limitingCauseText: string | null;
      confidenceLabel?: string | null;
    };
    reliability?: {
      packTier: V1TodayPackTier;
      visibleGaps: readonly string[];
    } | null;
    signalPreviews: Array<{
      key: 'sleep' | 'recovery' | 'adaptation' | 'effort';
      scoreDisplay: string;
      subtitle: string | null;
    }>;
  };
  header: {
    weather: { city: string; tempC: number; condition: string } | null;
  };
  actionRow: {
    daySummaryLines: Array<{
      id: string;
      kind: 'done' | 'planned';
      primary: string;
      secondary?: string | null;
      activityType?: ActivityType;
      plannedSessionId?: string | null;
      metrics?: Array<{ label: string; value: string; unit: string }> | null;
    }>;
  };
};

export type V1TodayResponse = {
  apiVersion: 1;
  trainingDayId: string;
  empty: {
    title: string;
    message: string | null;
    code: 'NO_CONTENT';
    /** Absolute Garmin handoff URL on the canonical origin (ADR-040). */
    webURL: string;
    /** CTA label for `webURL`; null when Garmin is already connected — nothing to do. */
    actionLabel: string | null;
  } | null;
  verdict: {
    eyebrow: string;
    headline: string;
    subline: string;
    posture: 'protect' | 'steady' | 'push' | 'uncertain';
    confidencePct: number | null;
    limitingCause: string | null;
    statusLabel: string;
    actionLine: string | null;
    confidenceLabel: string | null;
    packTier: V1TodayPackTier | null;
    estimationGaps: string[];
  };
  weather: { city: string; tempC: number; condition: string } | null;
  sessions: Array<{
    id: string;
    kind: 'planned' | 'done';
    title: string;
    subtitle: string | null;
    metrics: Array<{ label: string; value: string; unit: string }>;
    sport: string | null;
    priority: boolean;
    /**
     * The prescription this line stands for, when there is one. Distinct from `id`: a
     * brick line is identified by its group, so only this addresses the session itself.
     */
    plannedSessionId: string | null;
  }>;
  signals: Array<{
    key: 'sleep' | 'recovery' | 'effort' | 'adaptation';
    score: string;
    caption: string | null;
  }>;
  /** Null when the caller could not resolve the athlete's recent activities. */
  consistency: V1TodayConsistency | null;
};

const CONNECT_GARMIN_EMPTY = {
  title: 'Pas encore de données',
  message: 'Connecte Garmin pour que ton Twin lise ton sommeil, ta récupération et tes séances.',
  actionLabel: 'Connecter Garmin',
} as const;

function projectEmpty(
  source: V1TodaySource,
  input: V1TodayProjectionInput,
): V1TodayResponse['empty'] {
  if (source.hasContent && source.emptyState === null) {
    return null;
  }
  return emptyPayload(source.emptyState, input);
}

/**
 * Without Garmin the gap is the missing source, so the empty state says so and offers
 * the handoff. With Garmin connected the data is on its way: the Twin's own message
 * stands and there is no action.
 */
function emptyPayload(
  emptyState: V1TodaySource['emptyState'],
  input: V1TodayProjectionInput,
): NonNullable<V1TodayResponse['empty']> {
  const webURL = `${input.webOrigin.replace(/\/$/, '')}${CONNECT_GARMIN_PATH}`;
  if (!input.garminConnected) {
    return { ...CONNECT_GARMIN_EMPTY, code: 'NO_CONTENT', webURL };
  }
  return {
    title: emptyState?.title ?? 'Pas encore de données',
    message: emptyState?.description ?? null,
    code: 'NO_CONTENT',
    webURL,
    actionLabel: null,
  };
}

function sportLabel(activityType: ActivityType | undefined): string | null {
  if (!activityType) {
    return null;
  }
  return activityTypeLabels[activityType] ?? null;
}

function resolveStatusLabel(hero: V1TodaySource['hero']): string {
  const fromPosture = hero.postureLabel?.trim();
  if (fromPosture) {
    return fromPosture;
  }
  return hero.eyebrow;
}

function resolveActionLine(hero: V1TodaySource['hero']): string | null {
  const fromFocus = hero.focusPriority?.trim();
  if (fromFocus) {
    return fromFocus;
  }
  const fromAction = hero.actionLine?.trim();
  if (fromAction) {
    return fromAction;
  }
  return hero.subline || null;
}

function projectVerdict(
  hero: V1TodaySource['hero'],
  empty: V1TodayResponse['empty'],
): V1TodayResponse['verdict'] {
  return {
    eyebrow: hero.eyebrow,
    headline: empty ? empty.title : hero.headline,
    subline: hero.subline,
    posture: hero.posture,
    confidencePct: hero.twinTrustStrip.confidencePctRounded,
    limitingCause: hero.twinTrustStrip.limitingCauseText,
    statusLabel: resolveStatusLabel(hero),
    actionLine: resolveActionLine(hero),
    confidenceLabel: hero.twinTrustStrip.confidenceLabel ?? null,
    packTier: hero.reliability?.packTier ?? null,
    estimationGaps: [...(hero.reliability?.visibleGaps ?? [])],
  };
}

function projectSessions(
  lines: V1TodaySource['actionRow']['daySummaryLines'],
): V1TodayResponse['sessions'] {
  return lines.map((line, index) => ({
    id: line.id,
    kind: line.kind,
    title: line.primary,
    subtitle: line.secondary ?? null,
    metrics: line.metrics ?? [],
    sport: sportLabel(line.activityType),
    priority: index === 0,
    plannedSessionId: line.plannedSessionId ?? null,
  }));
}

function projectOvernightSignals(
  previews: V1TodaySource['hero']['signalPreviews'],
): V1TodayResponse['signals'] {
  return previews
    .filter((signal) => signal.key === 'sleep' || signal.key === 'recovery')
    .map((signal) => ({
      key: signal.key,
      score: signal.scoreDisplay,
      caption: signal.subtitle,
    }));
}

export type V1TodayProjectionInput = {
  trainingDayId: string;
  webOrigin: string;
  /**
   * Regularity is not part of the Today view model — the web computes it client-side
   * from a separate activity fetch — so the caller resolves it and passes it in.
   */
  consistency?: V1TodayConsistency | null;
  /** Decides the empty state's copy and action; unknown reads as not connected. */
  garminConnected?: boolean;
};

export function projectV1Today(
  source: V1TodaySource,
  input: V1TodayProjectionInput,
): V1TodayResponse {
  const empty = projectEmpty(source, input);
  return {
    apiVersion: 1,
    trainingDayId: input.trainingDayId,
    empty,
    verdict: projectVerdict(source.hero, empty),
    weather: source.header.weather,
    sessions: projectSessions(source.actionRow.daySummaryLines),
    signals: projectOvernightSignals(source.hero.signalPreviews),
    consistency: input.consistency ?? null,
  };
}

function sourceFromViewModel(vm: TodayViewModel): V1TodaySource {
  return {
    hasContent: vm.hasContent,
    emptyState: vm.emptyState,
    hero: {
      eyebrow: vm.hero.eyebrow,
      headline: vm.hero.headline,
      subline: vm.hero.subline,
      posture: vm.hero.posture,
      postureLabel: vm.hero.postureLabel,
      focusPriority: vm.hero.focusPriority,
      actionLine: vm.hero.actionLine,
      twinTrustStrip: {
        confidencePctRounded: vm.hero.twinTrustStrip.confidencePctRounded,
        limitingCauseText: vm.hero.twinTrustStrip.limitingCauseText,
        confidenceLabel: vm.hero.twinTrustStrip.confidenceLabel,
      },
      reliability: vm.hero.reliability
        ? {
            packTier: vm.hero.reliability.packTier,
            visibleGaps: vm.hero.reliability.visibleGaps,
          }
        : null,
      signalPreviews: vm.hero.signalPreviews.map((signal) => ({
        key: signal.key,
        scoreDisplay: signal.scoreDisplay,
        subtitle: signal.subtitle,
      })),
    },
    header: {
      weather: vm.header.weather
        ? {
            city: vm.header.weather.city,
            tempC: vm.header.weather.tempC,
            condition: vm.header.weather.condition,
          }
        : null,
    },
    actionRow: {
      daySummaryLines: vm.actionRow.daySummaryLines.map((line) => ({
        id: line.id,
        kind: line.kind,
        primary: line.primary,
        secondary: line.secondary,
        activityType: line.activityType,
        plannedSessionId: line.plannedSessionId,
        metrics: line.metrics,
      })),
    },
  };
}

export function projectV1TodayFromViewModel(
  vm: TodayViewModel,
  input: V1TodayProjectionInput,
): V1TodayResponse {
  return projectV1Today(sourceFromViewModel(vm), input);
}
