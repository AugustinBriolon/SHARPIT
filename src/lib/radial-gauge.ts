export type RadialColorMode = 'dynamic' | 'neutral' | 'strain';
export type RadialScoreFormat = 'percent' | 'strain' | 'number';

export const RADIAL_TRACK_COLOR = '#E8ECF0';
export const RADIAL_EMPTY_COLOR = '#CBD5E1';

const FIXED_STROKE_COLORS: Record<Exclude<RadialColorMode, 'dynamic'>, string> = {
  neutral: '#809cb6',
  strain: '#3B82F6',
};

/** Score-based stroke color — aligned with Today dashboard dynamic rings. */
export function scoreStrokeColor(score: number | null): string {
  if (score === null) return RADIAL_EMPTY_COLOR;
  if (score >= 67) return '#059669';
  if (score >= 34) return '#D97706';
  return '#DC2626';
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
