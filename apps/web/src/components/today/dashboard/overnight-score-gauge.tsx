'use client';

import {
  OVERNIGHT_TICKS,
  overnightRevealDelayMs,
  overnightTickStroke,
  thumbForOvernightScore,
} from '@/components/today/dashboard/overnight-gauge-geometry';

/** Emil strong ease-in-out — accel then soft settle at the tip. */
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

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
  return overnightRevealDelayMs(Math.round((target / 100) * (OVERNIGHT_TICKS.length - 1)));
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
  const delayMs = lit ? overnightRevealDelayMs(tick.index) : 0;

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

export function TickSemicircle({ score, fill }: { score: number | null; fill: boolean }) {
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
