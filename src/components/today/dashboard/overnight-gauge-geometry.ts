/**
 * Overnight gauge geometry — computed once at module load.
 * Fixed precision keeps SSR/client SVG attrs identical.
 */

export const OVERNIGHT_TICK_COUNT = 52;
export const OVERNIGHT_GAUGE = {
  cx: 100,
  cy: 100,
  rInner: 72,
  rOuter: 78,
  start: Math.PI,
  end: 0,
} as const;

/** One-shot instrument reveal (not chrome). Visible fill after shell → data remount. */
export const OVERNIGHT_GAUGE_REVEAL_MS = 560;
/** Cascade between sleep and recovery cards. */
export const OVERNIGHT_GAUGE_STAGGER_MS = 90;

type TickGeom = {
  index: number;
  tickScore: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function polar(angle: number, radius: number) {
  return {
    x: Number((OVERNIGHT_GAUGE.cx + radius * Math.cos(angle)).toFixed(3)),
    y: Number((OVERNIGHT_GAUGE.cy - radius * Math.sin(angle)).toFixed(3)),
  };
}

function buildTicks(): TickGeom[] {
  const { start, end, rInner, rOuter } = OVERNIGHT_GAUGE;
  return Array.from({ length: OVERNIGHT_TICK_COUNT }, (_, index) => {
    const t = index / (OVERNIGHT_TICK_COUNT - 1);
    const angle = start + (end - start) * t;
    const a = polar(angle, rInner);
    const b = polar(angle, rOuter);
    return {
      index,
      tickScore: t * 100,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
    };
  });
}

export const OVERNIGHT_TICKS = buildTicks();

/** Maps tick index → delay so the cascade slows toward the tip. */
export function overnightRevealDelayMs(
  index: number,
  total: number = OVERNIGHT_TICK_COUNT,
): number {
  const t = total <= 1 ? 1 : index / (total - 1);
  // Cubic ease-in-out on the delay lane (not just each stroke).
  const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  return Math.round(eased * OVERNIGHT_GAUGE_REVEAL_MS);
}

export function angleForOvernightScore(score: number): number {
  const t = Math.max(0, Math.min(100, score)) / 100;
  return OVERNIGHT_GAUGE.start + (OVERNIGHT_GAUGE.end - OVERNIGHT_GAUGE.start) * t;
}

export function thumbForOvernightScore(score: number) {
  const mid = (OVERNIGHT_GAUGE.rInner + OVERNIGHT_GAUGE.rOuter) / 2;
  return polar(angleForOvernightScore(score), mid);
}

/** Pure tick colour — used by tests and the SVG. */
export function overnightTickStroke(index: number, score: number | null): string {
  if (score === null) {
    return 'var(--color-border)';
  }
  const tickScore = (index / (OVERNIGHT_TICK_COUNT - 1)) * 100;
  if (tickScore > score) {
    return 'var(--color-border)';
  }
  if (tickScore >= score - 14) {
    return 'var(--color-highlight)';
  }
  return 'var(--color-foreground)';
}
