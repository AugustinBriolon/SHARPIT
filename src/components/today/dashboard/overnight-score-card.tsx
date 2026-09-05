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
import {
  OVERNIGHT_GAUGE_REVEAL_MS,
  OVERNIGHT_GAUGE_STAGGER_MS,
  OVERNIGHT_TICKS,
  overnightTickStroke,
  thumbForOvernightScore,
} from '@/components/today/dashboard/overnight-gauge-geometry';
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

/** Maps tick index → delay so the cascade slows toward the tip. */
function revealDelayMs(index: number, total: number): number {
  const t = total <= 1 ? 1 : index / (total - 1);
  // Cubic ease-in-out on the delay lane (not just each stroke).
  const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  return Math.round(eased * OVERNIGHT_GAUGE_REVEAL_MS);
}

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
  isLimiter?: boolean;
  className?: string;
};

const HEADER_ICON: Record<'moon' | 'heart', LucideIcon> = {
  moon: Moon,
  heart: HeartPulse,
};

function clampOvernightScore(score: number | null): number | null {
  if (score === null) {
    return null;
  }
  return Math.max(0, Math.min(100, score));
}

function isTickLit(fill: boolean, target: number | null, tickScore: number): boolean {
  return fill && target !== null && tickScore <= target;
}

function thumbRevealDelayMs(target: number | null): number {
  if (target === null) {
    return 0;
  }
  return revealDelayMs(
    Math.round((target / 100) * (OVERNIGHT_TICKS.length - 1)),
    OVERNIGHT_TICKS.length,
  );
}

function TickLine({
  tick,
  fill,
  target,
}: {
  tick: (typeof OVERNIGHT_TICKS)[number];
  fill: boolean;
  target: number | null;
}) {
  const lit = isTickLit(fill, target, tick.tickScore);
  const delayMs = lit ? revealDelayMs(tick.index, OVERNIGHT_TICKS.length) : 0;

  return (
    <line
      stroke={overnightTickStroke(tick.index, lit ? target : null)}
      strokeLinecap="round"
      strokeWidth={1.6}
      x1={tick.x1}
      x2={tick.x2}
      y1={tick.y1}
      y2={tick.y2}
      style={{
        transitionProperty: 'stroke',
        transitionDuration: fill ? '70ms' : '0ms',
        transitionTimingFunction: EASE_IN_OUT,
        transitionDelay: `${delayMs}ms`,
      }}
    />
  );
}

function ThumbDot({ fill, target }: { fill: boolean; target: number | null }) {
  if (!fill || target === null || target <= 0.5) {
    return null;
  }
  const thumb = thumbForOvernightScore(target);
  return (
    <circle
      cx={thumb.x}
      cy={thumb.y}
      fill="var(--color-highlight)"
      r={3.75}
      stroke="var(--color-highlight-foreground)"
      strokeWidth={1}
      style={{
        opacity: 1,
        transitionProperty: 'opacity',
        transitionDuration: '160ms',
        transitionTimingFunction: EASE_IN_OUT,
        transitionDelay: `${thumbRevealDelayMs(target)}ms`,
      }}
    />
  );
}

function TickSemicircle({ score, fill }: { score: number | null; fill: boolean }) {
  const target = clampOvernightScore(score);

  return (
    <svg className="h-auto w-full" viewBox="0 0 200 118" aria-hidden>
      {OVERNIGHT_TICKS.map((tick) => (
        <TickLine key={tick.index} fill={fill} target={target} tick={tick} />
      ))}
      <ThumbDot fill={fill} target={target} />
    </svg>
  );
}

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
  score,
  statusLabel,
  fill,
  accent,
}: {
  score: number | null;
  statusLabel: string | null;
  fill: boolean;
  accent: 'sleep' | 'recovery';
}) {
  if (score === null || !statusLabel || !fill) {
    return null;
  }
  return (
    <span
      className={cn(
        'mt-2 text-center text-xs font-medium tracking-wide',
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
    <span className="relative mx-auto w-full max-w-52 pt-1">
      <TickSemicircle fill={fill} score={score} />
      <span className="pointer-events-none absolute inset-x-0 top-[46%] flex flex-col items-center">
        <span
          style={gaugeScoreStyle(displayScore)}
          className={cn(
            'text-data text-foreground text-[2.5rem] leading-none font-semibold tracking-tight tabular-nums',
            'transition-[opacity,transform] duration-200',
          )}
        >
          {formatGaugeDisplay(displayScore)}
        </span>
        <span className="text-muted-foreground mt-1 text-[11px] tracking-wide">sur 100</span>
        <GaugeStatusLabel accent={accent} fill={fill} score={score} statusLabel={statusLabel} />
      </span>
    </span>
  );
}

function trendWellClass(trend: OvernightScoreTrend | null): string {
  if (trend === 'down') {
    return 'bg-signal-caution/15 text-signal-caution';
  }
  if (trend === 'up') {
    return 'bg-highlight/40 text-(--color-highlight-foreground)';
  }
  return 'bg-muted text-muted-foreground';
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
  const TrendIcon = trend ? TREND_ICON[trend] : ArrowUpRight;

  return (
    <span className="flex items-center gap-2.5 pt-8">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          trendWellClass(trend),
        )}
        aria-hidden
      >
        <TrendIcon className="size-3.5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        {title ? (
          <span className="text-foreground block text-xs leading-tight font-medium">{title}</span>
        ) : null}
        {detail ? (
          <span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">
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
  isLimiter = false,
  className,
}: OvernightScoreCardProps) {
  const HeaderIcon = HEADER_ICON[icon];

  return (
    <TodayInstrumentCard
      className={className}
      href={href}
      icon={<HeaderIcon className="size-3.5" strokeWidth={2.25} />}
      isLimiter={isLimiter}
      subtitle={subtitle}
      title={title}
      titleAttr={isLimiter ? `Frein aujourd’hui — ${title}` : `Voir le détail — ${title}`}
    >
      <GaugeReadout accent={accent} score={score} statusLabel={statusLabel} />
      <BaselineBand detail={baselineDetail} title={baselineTitle} trend={trend} />
    </TodayInstrumentCard>
  );
}
