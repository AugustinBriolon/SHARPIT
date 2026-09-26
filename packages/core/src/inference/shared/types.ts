/**
 * A localizable item: a stable code key plus optional interpolation params.
 * The inference domain emits these; the presentation layer resolves them via i18n.
 */
export type I18nItem = {
  code: string;
  params?: Record<string, number | string>;
};

/**
 * Internal scoring output for a single dimension, weighted by data quality.
 * Shared shape for the fatigue and recovery models (identical scoring contract).
 */
export type DimensionScore = {
  readonly score: number | null;
  readonly available: boolean;
  readonly qualityFactor: number;
};

/**
 * Internal scoring output for a single adaptation dimension.
 * Distinct from `DimensionScore`: adaptation explains unavailability/defaults via
 * a human-readable `reason` instead of a `qualityFactor` weight.
 */
export type AdaptationDimensionScore = {
  readonly score: number | null;
  readonly available: boolean;
  readonly reason?: string;
};
