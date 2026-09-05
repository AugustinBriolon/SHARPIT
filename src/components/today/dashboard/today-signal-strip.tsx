'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';
import {
  OvernightScoreCard,
  type OvernightScoreCardProps,
} from '@/components/today/dashboard/overnight-score-card';
import { TWIN_DRILL_DOWN, twinDimensionFromHref } from '@/lib/today/today-twin-navigation';
import { pickTodayResumeSignalPreviews, type SignalPreview } from '@/lib/today/signal-previews';

type MetricsRow = TodayViewModel['hero']['metricsRow'];
type SignalPreviews = TodayViewModel['hero']['signalPreviews'];

const CARD_META = {
  sleep: {
    accent: 'sleep' as const,
    icon: 'moon' as const,
    href: TWIN_DRILL_DOWN.sleep,
    title: 'Score sommeil',
    scoreKey: 'sleepScore' as const,
  },
  recovery: {
    accent: 'recovery' as const,
    icon: 'heart' as const,
    href: TWIN_DRILL_DOWN.recovery,
    title: 'Score récupération',
    scoreKey: 'recoveryScore' as const,
  },
};

function previewFor(
  previews: SignalPreviews | undefined,
  key: 'sleep' | 'recovery',
): SignalPreview | null {
  return (
    (previews ? pickTodayResumeSignalPreviews(previews) : []).find((p) => p.key === key) ?? null
  );
}

function gaugeOrEmpty(preview: SignalPreview | null) {
  if (preview?.visual.kind === 'gauge') {
    return preview.visual;
  }
  return {
    score: null as number | null,
    statusLabel: null,
    baselineTitle: null,
    baselineDetail: null,
    trend: null,
  };
}

function cardProps({
  kind,
  preview,
  metricsRow,
  isLimiter,
  loading,
}: {
  kind: 'sleep' | 'recovery';
  preview: SignalPreview | null;
  metricsRow: MetricsRow;
  isLimiter: boolean;
  loading: boolean;
}): OvernightScoreCardProps {
  const meta = CARD_META[kind];
  const gauge = gaugeOrEmpty(preview);
  if (loading) {
    return {
      accent: meta.accent,
      baselineDetail: null,
      baselineTitle: null,
      href: meta.href,
      icon: meta.icon,
      isLimiter: false,
      score: null,
      statusLabel: null,
      subtitle: null,
      title: meta.title,
      trend: null,
    };
  }
  return {
    accent: meta.accent,
    baselineDetail: gauge.baselineDetail,
    baselineTitle: gauge.baselineTitle,
    href: meta.href,
    icon: meta.icon,
    isLimiter,
    score: gauge.score ?? metricsRow[meta.scoreKey],
    statusLabel: gauge.statusLabel,
    subtitle: preview?.subtitle ?? null,
    title: meta.title,
    trend: gauge.trend,
  };
}

function OvernightPair({
  metricsRow,
  signalPreviews,
  limiting,
  loading,
}: {
  metricsRow: MetricsRow;
  signalPreviews?: SignalPreviews;
  limiting: string | null;
  loading: boolean;
}) {
  return (
    <>
      <OvernightScoreCard
        {...cardProps({
          kind: 'sleep',
          preview: previewFor(signalPreviews, 'sleep'),
          metricsRow,
          isLimiter: limiting === 'sleep',
          loading,
        })}
      />
      <OvernightScoreCard
        {...cardProps({
          kind: 'recovery',
          preview: previewFor(signalPreviews, 'recovery'),
          metricsRow,
          isLimiter: limiting === 'recovery',
          loading,
        })}
      />
    </>
  );
}

/**
 * Overnight state on Today — twin tick-gauge cards (sleep + recovery).
 * Same mounted chrome while loading (empty gauge); ticks fill when score arrives.
 */
export function TodaySignalStrip({
  metricsRow,
  signalPreviews,
  limiterHref = null,
  className,
  loading = false,
}: {
  metricsRow: MetricsRow;
  signalPreviews?: SignalPreviews;
  limiterHref?: string | null;
  className?: string;
  loading?: boolean;
}) {
  const limiting = loading ? null : twinDimensionFromHref(limiterHref);

  return (
    <div className={className}>
      <nav
        aria-busy={loading || undefined}
        aria-label="Signaux de nuit — ouvrir le détail"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch"
      >
        <OvernightPair
          limiting={limiting}
          loading={loading}
          metricsRow={metricsRow}
          signalPreviews={signalPreviews}
        />
      </nav>
    </div>
  );
}
