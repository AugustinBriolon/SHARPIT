import type { ActivityType } from '@prisma/client';
import type { V1TodayConsistency } from '@/lib/presentation/v1/consistency';
import type { PresentationEmptyState } from '@/core/presentation/types';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { activityTypeLabels } from '@/lib/format';

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
    webURL: string;
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

function joinWebURL(webOrigin: string, href: string | undefined): string {
  const base = webOrigin.replace(/\/$/, '');
  if (!href || href === '/') {
    return `${base}/`;
  }
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }
  return `${base}${href.startsWith('/') ? href : `/${href}`}`;
}

function projectEmpty(source: V1TodaySource, webOrigin: string): V1TodayResponse['empty'] {
  if (source.hasContent && source.emptyState === null) {
    return null;
  }
  return emptyPayload(source.emptyState, webOrigin);
}

function emptyPayload(
  emptyState: V1TodaySource['emptyState'],
  webOrigin: string,
): NonNullable<V1TodayResponse['empty']> {
  return {
    title: emptyState?.title ?? 'Pas encore de données',
    message: emptyState?.description ?? null,
    code: 'NO_CONTENT',
    webURL: joinWebURL(webOrigin, emptyState?.action?.href),
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
};

export function projectV1Today(
  source: V1TodaySource,
  input: V1TodayProjectionInput,
): V1TodayResponse {
  const empty = projectEmpty(source, input.webOrigin);
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
