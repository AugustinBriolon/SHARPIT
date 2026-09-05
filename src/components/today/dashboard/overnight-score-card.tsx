'use client';

import type { CSSProperties } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  HeartPulse,
  Minus,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { TodayInstrumentCard } from '@/components/today/dashboard/today-instrument-card';
import { OVERNIGHT_GAUGE_STAGGER_MS } from '@/components/today/dashboard/overnight-gauge-geometry';
import { TickSemicircle } from '@/components/today/dashboard/overnight-score-gauge';
import { useOvernightGaugeReveal } from '@/components/today/dashboard/use-overnight-gauge-reveal';
import { cn } from '@/lib/utils';

/** Re-export for existing tests. */
export { overnightTickStroke as tickStroke } from '@/components/today/dashboard/overnight-gauge-geometry';

const TREND_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
} as const;

/** Emil strong ease-in-out — accel then soft settle at the tip. */
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

export type OvernightScoreTrend = 'up' | 'down' | 'flat';

export type OvernightScoreCardProps = {
  title: string;
  subtitle: string | null;
  score: number | null;
  statusLabel: string | null;
  baselineTitle: string | null;
  baselineDetail: string | null;
  trend: OvernightScoreTrend | null;
  accent: 'sleep' | 'recovery';
  icon: 'moon' | 'heart';
  href: string;
  className?: string;
};

const HEADER_ICON: Record<'moon' | 'heart', LucideIcon> = {
  moon: Moon,
  heart: HeartPulse,
};

function formatGaugeDisplay(displayScore: number | null): string {
  if (displayScore === null) {
    return '—';
  }
  return String(Math.round(displayScore));
}

function gaugeScoreStyle(displayScore: number | null): CSSProperties {
  const empty = displayScore === null;
  return {
    opacity: empty ? 0.45 : 1,
    transform: empty ? 'scale(0.97)' : 'scale(1)',
    transitionTimingFunction: EASE_IN_OUT,
  };
}

function statusAccentClass(accent: 'sleep' | 'recovery'): string {
  if (accent === 'sleep') {
    return 'text-primary';
  }
  return 'text-(--color-signal-recovery)';
}

function GaugeStatusLabel({
  statusLabel,
  fill,
  accent,
}: {
  statusLabel: string | null;
  fill: boolean;
  accent: 'sleep' | 'recovery';
}) {
  if (!fill || !statusLabel) {
    return null;
  }
  return (
    <span
      className={cn(
        'mt-3 text-center text-[11px] font-medium tracking-wide sm:mt-3.5 sm:text-xs',
        statusAccentClass(accent),
      )}
    >
      {statusLabel}
    </span>
  );
}

function GaugeReadout({
  score,
  statusLabel,
  accent,
}: {
  score: number | null;
  statusLabel: string | null;
  accent: 'sleep' | 'recovery';
}) {
  const delayMs = accent === 'recovery' ? OVERNIGHT_GAUGE_STAGGER_MS : 0;
  const { fill, displayScore } = useOvernightGaugeReveal(score, delayMs);

  return (
    <span className="mx-auto flex w-full max-w-36 flex-col items-center pt-0.5 sm:max-w-44 sm:pt-1 md:max-w-52">
      <span className="relative block w-full pb-2.5 sm:pb-3">
        <TickSemicircle fill={fill} score={score} />
        <span className="pointer-events-none absolute inset-x-0 top-[44%] flex flex-col items-center">
          <span
            style={gaugeScoreStyle(displayScore)}
            className={cn(
              'text-data text-foreground leading-none font-semibold tracking-tight tabular-nums',
              'text-[1.75rem] sm:text-[2.25rem] md:text-[2.5rem]',
              'transition-[opacity,transform] duration-200',
            )}
          >
            {formatGaugeDisplay(displayScore)}
          </span>
          <span className="text-muted-foreground mt-0.5 text-[10px] tracking-wide sm:mt-1 sm:text-[11px]">
            sur 100
          </span>
        </span>
      </span>
      <GaugeStatusLabel accent={accent} fill={fill} statusLabel={statusLabel} />
    </span>
  );
}

function trendWellClass(trend: OvernightScoreTrend): string {
  if (trend === 'down') {
    return 'bg-signal-caution/15 text-signal-caution';
  }
  if (trend === 'up') {
    return 'bg-highlight/40 text-(--color-highlight-foreground)';
  }
  return 'bg-muted text-muted-foreground';
}

function BaselineTrendWell({ trend }: { trend: OvernightScoreTrend }) {
  const TrendIcon = TREND_ICON[trend];
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        'size-6 sm:size-7',
        trendWellClass(trend),
      )}
      aria-hidden
    >
      <TrendIcon className="size-3 sm:size-3.5" strokeWidth={2.25} />
    </span>
  );
}

function BaselineBand({
  title,
  detail,
  trend,
}: {
  title: string | null;
  detail: string | null;
  trend: OvernightScoreTrend | null;
}) {
  if (!title && !detail) {
    return null;
  }

  return (
    <span className="flex items-start gap-2 pt-3 sm:items-center sm:gap-2.5 sm:pt-6">
      {trend ? <BaselineTrendWell trend={trend} /> : null}
      <span className="min-w-0 flex-1">
        {title ? (
          <span className="text-foreground block text-[11px] leading-tight font-medium sm:text-xs">
            {title}
          </span>
        ) : null}
        {detail ? (
          <span className="text-muted-foreground mt-0.5 block text-[10px] leading-snug sm:text-[11px]">
            {detail}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/**
 * Shared overnight score card — sleep and recovery.
 * Loading: chrome + empty track. Data: CSS tick cascade (shell remount safe).
 */
export function OvernightScoreCard({
  title,
  subtitle,
  score,
  statusLabel,
  baselineTitle,
  baselineDetail,
  trend,
  accent,
  icon,
  href,
  className,
}: OvernightScoreCardProps) {
  const HeaderIcon = HEADER_ICON[icon];

  return (
    <TodayInstrumentCard
      className={className}
      href={href}
      icon={<HeaderIcon className="size-3.5" strokeWidth={2.25} />}
      subtitle={subtitle}
      title={title}
      titleAttr={`Voir le détail — ${title}`}
    >
      <GaugeReadout accent={accent} score={score} statusLabel={statusLabel} />
      <BaselineBand detail={baselineDetail} title={baselineTitle} trend={trend} />
    </TodayInstrumentCard>
  );
}
