'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';
import {
  OvernightScoreCard,
  type OvernightScoreCardProps,
} from '@/components/today/dashboard/overnight-score-card';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
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
  loading,
}: {
  kind: 'sleep' | 'recovery';
  preview: SignalPreview | null;
  metricsRow: MetricsRow;
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
  loading,
}: {
  metricsRow: MetricsRow;
  signalPreviews?: SignalPreviews;
  loading: boolean;
}) {
  const previews = signalPreviews ? pickTodayResumeSignalPreviews(signalPreviews) : [];
  const sleep = previews.find((p) => p.key === 'sleep') ?? null;
  const recovery = previews.find((p) => p.key === 'recovery') ?? null;

  return (
    <>
      <OvernightScoreCard
        {...cardProps({
          kind: 'sleep',
          preview: sleep,
          metricsRow,
          loading,
        })}
      />
      <OvernightScoreCard
        {...cardProps({
          kind: 'recovery',
          preview: recovery,
          metricsRow,
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
  className,
  loading = false,
}: {
  metricsRow: MetricsRow;
  signalPreviews?: SignalPreviews;
  className?: string;
  loading?: boolean;
}) {
  return (
    <div className={className}>
      <nav
        aria-busy={loading || undefined}
        aria-label="Signaux de nuit — ouvrir le détail"
        className="grid grid-cols-2 items-stretch gap-2 sm:gap-3"
      >
        <OvernightPair loading={loading} metricsRow={metricsRow} signalPreviews={signalPreviews} />
      </nav>
    </div>
  );
}
