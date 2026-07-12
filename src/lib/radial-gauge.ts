export type RadialColorMode = 'dynamic' | 'neutral' | 'strain';
export type RadialScoreFormat = 'percent' | 'strain' | 'number';

export const RADIAL_TRACK_COLOR = 'var(--radial-track)';
export const RADIAL_EMPTY_COLOR = 'var(--radial-empty)';

const FIXED_STROKE_COLORS: Record<Exclude<RadialColorMode, 'dynamic'>, string> = {
  neutral: 'var(--signal-neutral)',
  strain: 'var(--signal-threshold)',
};

/** Score-based stroke color — aligned with Today dashboard dynamic rings. */
export function scoreStrokeColor(score: number | null): string {
  if (score === null) return RADIAL_EMPTY_COLOR;
  if (score >= 67) return 'var(--signal-base)';
  if (score >= 34) return 'var(--signal-caution)';
  return 'var(--signal-risk)';
}

export function resolveRadialStrokeColor(value: number | null, colorMode: RadialColorMode): string {
  if (value === null) return RADIAL_EMPTY_COLOR;
  if (colorMode === 'dynamic') return scoreStrokeColor(value);
  return FIXED_STROKE_COLORS[colorMode];
}

export function radialFillPercent(value: number | null, max: number): number {
  if (value === null || max <= 0) return 0;
  return Math.min(100, (value / max) * 100);
}

export function formatRadialValue(value: number | null, format: RadialScoreFormat): string {
  if (value === null) return '—';
  if (format === 'strain') return value.toFixed(1);
  return String(Math.round(value));
}
