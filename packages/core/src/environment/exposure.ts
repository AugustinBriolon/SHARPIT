/**
 * Environmental exposure duration — future integration point (v2.7+).
 *
 * Stress intensity today depends on instantaneous conditions only.
 * Exposure duration will modulate cumulative physiological cost in a future version.
 *
 * @see docs/models/ENVIRONMENTAL_EXPOSURE_MODEL.md
 */

/**
 * Describes how long the athlete was exposed to environmental conditions.
 * Not yet consumed by stress or impact builders — passthrough only.
 */
export type EnvironmentalExposureContext = {
  /** Elapsed exposure in minutes. Null when unknown. */
  readonly durationMinutes: number | null;
  readonly startAt?: Date;
  readonly endAt?: Date;
};

export type BuildEnvironmentalStressOptions = {
  /**
   * Future: duration-weighted stress amplification.
   * Currently ignored — behavior unchanged until v2.7 calibration.
   */
  readonly exposure?: EnvironmentalExposureContext;
};

/**
 * Duration multiplier applied to stress intensity (future).
 * Always returns 1.0 until exposure model is calibrated and activated.
 */
export function resolveExposureDurationFactor(
  exposure: EnvironmentalExposureContext | undefined,
): number {
  void exposure;
  return 1;
}
