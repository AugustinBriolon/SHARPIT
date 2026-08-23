import { redirect } from 'next/navigation';

/**
 * Thresholds moved once already, out of a training hub and into Settings, on
 * the argument that the panel is a settings panel. That was right against the
 * destinations that existed then: the only alternatives were a list of sessions
 * and a data domain.
 *
 * A threshold is not a preference — it is a measurement of the athlete, and the
 * yardstick every performance reading is scaled against. With Progression it has
 * somewhere truthful to live, next to the records it explains (ADR-022).
 */
export default function SettingsCalibrationRedirect() {
  redirect('/progress?tab=performance');
}
