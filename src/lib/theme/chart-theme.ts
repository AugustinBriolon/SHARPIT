/** Recharts / SVG chart colors derived from design tokens (light + dark aware). */

export const CHART_TICK_COLOR = 'var(--muted-foreground)';
export const CHART_GRID_COLOR = 'var(--analysis-grid)';
export const CHART_TOOLTIP_BG = 'var(--card)';
export const CHART_TOOLTIP_BORDER = 'var(--border)';
export const CHART_TOOLTIP_FG = 'var(--foreground)';
export const CHART_TOOLTIP_MUTED = 'var(--muted-foreground)';

export const CHART_RECOVERY_STROKE = 'var(--signal-recovery)';
export const CHART_BASE_STROKE = 'var(--signal-base)';
export const CHART_TEMPO_STROKE = 'var(--signal-tempo)';
export const CHART_THRESHOLD_STROKE = 'var(--signal-threshold)';
export const CHART_VO2_STROKE = 'var(--signal-vo2)';
export const CHART_RECORD_STROKE = 'var(--record-accent)';

export const CHART_CAUTION_STROKE = 'var(--signal-caution)';
/**
 * The second line of a two-line chart, tuned only for separation from `--primary`.
 *
 * Not `--signal-caution`: that token answers "is this a warning", and once it was
 * darkened enough to be legible as text it landed almost on top of the brand green
 * in luminance. A series is not a state. Even so, the gap here is ~2.7:1 on the
 * light canvas and less on dark — a palette anchored on one background cannot buy
 * three levels of 3:1 out of a 21:1 range — so the pattern, not the colour, is
 * what actually tells the two curves apart.
 */
export const CHART_COUNTER_STROKE = 'var(--signal-threshold)';
export const CHART_RISK_STROKE = 'var(--signal-risk)';

export const CHART_REFERENCE_LINE = 'var(--analysis-border)';
export const CHART_ACTIVE_DOT_FILL = 'var(--card)';

export const CHART_PRIMARY_STROKE = 'var(--primary)';
/** Stroke legible on an ink band in both themes (see `--ink-accent`). */
export const CHART_INK_STROKE = 'var(--ink-accent)';
export const CHART_INK_GRID_COLOR =
  'color-mix(in oklch, var(--ink-surface-foreground) 15%, transparent)';
