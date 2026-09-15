import type { PresentationEmptyState } from '@/core/presentation/types';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

export type V1TodaySource = {
  hasContent: boolean;
  emptyState: PresentationEmptyState | null;
  hero: {
    eyebrow: string;
    headline: string;
    subline: string;
    posture: 'protect' | 'steady' | 'push' | 'uncertain';
    twinTrustStrip: {
      confidencePctRounded: number | null;
      limitingCauseText: string | null;
    };
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
  };
  weather: { city: string; tempC: number; condition: string } | null;
  sessions: Array<{
    id: string;
    kind: 'planned' | 'done';
    title: string;
    subtitle: string | null;
    metrics: Array<{ label: string; value: string; unit: string }>;
  }>;
  signals: Array<{
    key: 'sleep' | 'recovery' | 'effort' | 'adaptation';
    score: string;
    caption: string | null;
  }>;
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

export function projectV1Today(
  source: V1TodaySource,
  input: { trainingDayId: string; webOrigin: string },
): V1TodayResponse {
  const empty = projectEmpty(source, input.webOrigin);

  return {
    apiVersion: 1,
    trainingDayId: input.trainingDayId,
    empty,
    verdict: {
      eyebrow: source.hero.eyebrow,
      headline: empty ? empty.title : source.hero.headline,
      subline: source.hero.subline,
      posture: source.hero.posture,
      confidencePct: source.hero.twinTrustStrip.confidencePctRounded,
      limitingCause: source.hero.twinTrustStrip.limitingCauseText,
    },
    weather: source.header.weather,
    sessions: source.actionRow.daySummaryLines.map((line) => ({
      id: line.id,
      kind: line.kind,
      title: line.primary,
      subtitle: line.secondary ?? null,
      metrics: line.metrics ?? [],
    })),
    signals: source.hero.signalPreviews.map((signal) => ({
      key: signal.key,
      score: signal.scoreDisplay,
      caption: signal.subtitle,
    })),
  };
}

export function projectV1TodayFromViewModel(
  vm: TodayViewModel,
  input: { trainingDayId: string; webOrigin: string },
): V1TodayResponse {
  return projectV1Today(vm, input);
}
