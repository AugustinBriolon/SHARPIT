'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  HeartPulse,
  Minus,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const TICK_COUNT = 52;
const CX = 100;
const CY = 100;
const R_INNER = 72;
const R_OUTER = 78;
const THUMB_R = (R_INNER + R_OUTER) / 2;
const START = Math.PI;
const END = 0;

function polar(angle: number, radius: number) {
  return {
    x: CX + radius * Math.cos(angle),
    y: CY - radius * Math.sin(angle),
  };
}

function angleForScore(score: number): number {
  const t = Math.max(0, Math.min(100, score)) / 100;
  return START + (END - START) * t;
}

function tickStroke(index: number, score: number | null): string {
  if (score === null) {
    return 'var(--color-border)';
  }
  const tickScore = (index / (TICK_COUNT - 1)) * 100;
  if (tickScore > score) {
    return 'var(--color-border)';
  }
  // Tip of the reading: Lime Pulse; the rest stays Forest ink.
  if (tickScore >= score - 14) {
    return 'var(--color-highlight)';
  }
  return 'var(--color-foreground)';
}

const TREND_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
} as const;

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

function TickSemicircle({ score }: { score: number | null }) {
  const scoreValue = score === null ? 0 : Math.max(0, Math.min(100, Math.round(score)));
  const thumb = polar(angleForScore(scoreValue), THUMB_R);

  return (
    <svg className="h-auto w-full" viewBox="0 0 200 118" aria-hidden>
      {Array.from({ length: TICK_COUNT }, (_, i) => {
        const angle = START + (END - START) * (i / (TICK_COUNT - 1));
        const a = polar(angle, R_INNER);
        const b = polar(angle, R_OUTER);
        return (
          <line
            key={i}
            stroke={tickStroke(i, score)}
            strokeLinecap="round"
            strokeWidth={1.6}
            x1={a.x}
            x2={b.x}
            y1={a.y}
            y2={b.y}
          />
        );
      })}
      {score !== null ? (
        <circle
          cx={thumb.x}
          cy={thumb.y}
          fill="var(--color-highlight)"
          r={3.75}
          stroke="var(--color-highlight-foreground)"
          strokeWidth={1}
        />
      ) : null}
    </svg>
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
  const display = score === null ? '—' : String(Math.round(score));

  return (
    <span className="relative mx-auto w-full max-w-52 pt-1">
      <TickSemicircle score={score} />
      <span className="pointer-events-none absolute inset-x-0 top-[46%] flex flex-col items-center">
        <span className="text-data text-foreground text-[2.5rem] leading-none font-semibold tracking-tight tabular-nums">
          {display}
        </span>
        <span className="text-muted-foreground mt-1 text-[11px] tracking-wide">sur 100</span>
        {statusLabel ? (
          <span
            className={cn(
              'mt-2 text-center text-xs font-medium tracking-wide',
              accent === 'sleep' ? 'text-primary' : 'text-[var(--color-signal-recovery)]',
            )}
          >
            {statusLabel}
          </span>
        ) : null}
      </span>
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
  const TrendIcon = trend ? TREND_ICON[trend] : ArrowUpRight;

  return (
    <span className="flex items-center gap-2.5 pt-8">
      <span
        className="bg-highlight/40 flex size-7 shrink-0 items-center justify-center rounded-full text-(--color-highlight-foreground)"
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
 * Short tick semicircle, quiet header, hairline baseline band.
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
    <Link
      href={href}
      title={isLimiter ? `Frein aujourd’hui — ${title}` : `Voir le détail — ${title}`}
      className={cn(
        'chip-surface-lg hover:border-primary/35 group bg-white',
        'focus-visible:ring-primary/35 flex w-full min-w-0 flex-col overflow-hidden',
        'rounded-2xl px-4 pt-4 pb-3.5 transition-[border-color,background-color] duration-150 ease-out',
        'focus-visible:ring-2 focus-visible:outline-hidden',
        isLimiter && 'border-signal-caution/45 bg-signal-caution/8',
        className,
      )}
    >
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="text-foreground block text-sm font-semibold tracking-tight">
            {title}
          </span>
          {subtitle && (
            <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
              {subtitle}
            </span>
          )}
        </span>
        <span className="icon-well size-8" aria-hidden>
          <HeaderIcon className="size-3.5" strokeWidth={2.25} />
        </span>
      </span>

      <GaugeReadout accent={accent} score={score} statusLabel={statusLabel} />
      <BaselineBand detail={baselineDetail} title={baselineTitle} trend={trend} />
    </Link>
  );
}
