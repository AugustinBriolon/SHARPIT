'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';
import {
  OvernightScoreCard,
  type OvernightScoreCardProps,
} from '@/components/today/dashboard/overnight-score-card';
import { TWIN_DRILL_DOWN } from '@/lib/today/navigation/today-twin-navigation';
import {
  pickTodayResumeSignalPreviews,
  type SignalPreview,
} from '@/lib/today/dashboard/signal-previews';
import { cn } from '@/lib/utils';

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
} as const;

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

function resolveOvernightScore(
  kind: 'sleep' | 'recovery',
  preview: SignalPreview | null,
  metricsRow: MetricsRow,
): number | null {
  return gaugeOrEmpty(preview).score ?? metricsRow[CARD_META[kind].scoreKey];
}

function overnightCardProps({
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

function pickOvernightPreviews(signalPreviews: SignalPreviews | undefined) {
  const previews = signalPreviews ? pickTodayResumeSignalPreviews(signalPreviews) : [];
  return {
    sleep: previews.find((p) => p.key === 'sleep') ?? null,
    recovery: previews.find((p) => p.key === 'recovery') ?? null,
  };
}

function OvernightCards({
  metricsRow,
  signalPreviews,
  loading,
  showSleep,
  showRecovery,
}: {
  metricsRow: MetricsRow;
  signalPreviews?: SignalPreviews;
  loading: boolean;
  showSleep: boolean;
  showRecovery: boolean;
}) {
  const { sleep, recovery } = pickOvernightPreviews(signalPreviews);
  return (
    <>
      {showSleep ? (
        <OvernightScoreCard
          {...overnightCardProps({
            kind: 'sleep',
            preview: sleep,
            metricsRow,
            loading,
          })}
        />
      ) : null}
      {showRecovery ? (
        <OvernightScoreCard
          {...overnightCardProps({
            kind: 'recovery',
            preview: recovery,
            metricsRow,
            loading,
          })}
        />
      ) : null}
    </>
  );
}

function overnightVisibility(
  loading: boolean,
  metricsRow: MetricsRow,
  signalPreviews: SignalPreviews | undefined,
) {
  if (loading) {
    return { showSleep: true, showRecovery: true, visibleCount: 2 };
  }
  const { sleep, recovery } = pickOvernightPreviews(signalPreviews);
  const showSleep = resolveOvernightScore('sleep', sleep, metricsRow) !== null;
  const showRecovery = resolveOvernightScore('recovery', recovery, metricsRow) !== null;
  return {
    showSleep,
    showRecovery,
    visibleCount: Number(showSleep) + Number(showRecovery),
  };
}

/**
 * Overnight state on Today — twin tick-gauge cards (sleep + recovery).
 * Hidden entirely when neither score exists (no wearable data yet).
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
  const { showSleep, showRecovery, visibleCount } = overnightVisibility(
    loading,
    metricsRow,
    signalPreviews,
  );

  if (visibleCount === 0) {
    return null;
  }

  return (
    <div className={className}>
      <nav
        aria-busy={loading || undefined}
        aria-label="Signaux de nuit — ouvrir le détail"
        className={cn(
          'grid items-stretch gap-2 sm:gap-3',
          visibleCount === 1 ? 'grid-cols-1' : 'grid-cols-2',
        )}
      >
        <OvernightCards
          loading={loading}
          metricsRow={metricsRow}
          showRecovery={showRecovery}
          showSleep={showSleep}
          signalPreviews={signalPreviews}
        />
      </nav>
    </div>
  );
}
