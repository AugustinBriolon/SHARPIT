/**
 * Reading density — how much of the twin the athlete wants exposed.
 *
 * `essential` is the accessible reading: what happened, how it felt, what to do
 * next. `expert` adds the technical layer the metrics were derived from (TSS,
 * IF, CTL/ATL/TSB, thresholds, zones, decoupling). The distinction is about the
 * reader, not the data — nothing is computed differently, only shown or not.
 *
 * Stored on the athlete profile rather than on the device: the density belongs
 * to the athlete, and follows them across phone, tablet and desktop.
 */
export const DISPLAY_MODES = ['essential', 'expert'] as const;

export type DisplayMode = (typeof DISPLAY_MODES)[number];

/** Accessible reading first — an unknown or unset profile is never expert. */
export const DEFAULT_DISPLAY_MODE: DisplayMode = 'essential';

export function isDisplayMode(value: unknown): value is DisplayMode {
  return typeof value === 'string' && (DISPLAY_MODES as readonly string[]).includes(value);
}

export function toDisplayMode(value: unknown): DisplayMode {
  return isDisplayMode(value) ? value : DEFAULT_DISPLAY_MODE;
}

export function isExpertMode(mode: DisplayMode): boolean {
  return mode === 'expert';
}

/**
 * Audience of a single metric.
 *
 * `core` metrics are readable without training literacy — distance, duration,
 * perceived effort. `expert` metrics require the vocabulary to mean anything.
 */
export type MetricAudience = 'core' | 'expert';

export function isMetricVisible(audience: MetricAudience, mode: DisplayMode): boolean {
  return audience === 'core' || isExpertMode(mode);
}

/** Drops the expert entries from a metric list when the reading is essential. */
export function filterByAudience<T extends { audience?: MetricAudience }>(
  items: readonly T[],
  mode: DisplayMode,
): T[] {
  return items.filter((item) => isMetricVisible(item.audience ?? 'core', mode));
}

/**
 * Training-load figure for the current reading.
 *
 * Expert keeps the TSS acronym (the name is the barrier). Essential keeps the
 * magnitude as plain « charge » so daily surfaces stay readable without the jargon.
 */
export function formatTrainingLoad(load: number, mode: DisplayMode): string {
  const rounded = Math.round(load);
  return isExpertMode(mode) ? `${rounded} TSS` : `charge ${rounded}`;
}

/** Unit word for deltas / chart axes that still need a short label. */
export function trainingLoadUnit(mode: DisplayMode): 'TSS' | 'charge' {
  return isExpertMode(mode) ? 'TSS' : 'charge';
}
