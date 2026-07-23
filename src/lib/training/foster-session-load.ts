/**
 * Foster session-RPE load (internal load).
 * Reference: Foster et al. (2001) — sessionLoad = RPE × durationMin.
 * TSS-scale equivalence used by the session-feature cascade:
 *   TSS_rpe = (sessionLoad / 600) × 100  (1h at RPE 10 → 100).
 */

/** Foster training load units (RPE × minutes). */
export function computeFosterSessionLoad(durationSec: number, rpe: number): number {
  return rpe * (durationSec / 60);
}

/** Map Foster load onto the TSS-like scale used as Tier-4 cascade fallback. */
export function fosterSessionLoadToTss(fosterSessionLoad: number): number {
  return (fosterSessionLoad / 600) * 100;
}

/**
 * Relative gap between canonical TSS and Foster-equivalent TSS.
 * Null when either side is missing / non-positive.
 */
export function fosterTssDissonanceRatio(
  canonicalTss: number | null | undefined,
  fosterSessionLoad: number | null | undefined,
): number | null {
  if (canonicalTss == null || canonicalTss <= 0) return null;
  if (fosterSessionLoad == null || fosterSessionLoad <= 0) return null;
  const fosterTss = fosterSessionLoadToTss(fosterSessionLoad);
  if (fosterTss <= 0) return null;
  return Math.abs(fosterTss - canonicalTss) / Math.max(fosterTss, canonicalTss);
}

/** Show a soft dissonance hint above this relative gap (~30%). */
export const FOSTER_TSS_DISSONANCE_RATIO = 0.3;

export function fosterDissonanceLabel(
  canonicalTss: number,
  fosterSessionLoad: number,
): 'higher' | 'lower' | null {
  const ratio = fosterTssDissonanceRatio(canonicalTss, fosterSessionLoad);
  if (ratio == null || ratio < FOSTER_TSS_DISSONANCE_RATIO) return null;
  const fosterTss = fosterSessionLoadToTss(fosterSessionLoad);
  return fosterTss > canonicalTss ? 'higher' : 'lower';
}

/**
 * Compact activity-detail hint: Foster load in RPE×min units,
 * plus a soft dissonance note when canonical TSS diverges ≥30%.
 */
export function formatFosterLoadHint(
  durationSec: number | null | undefined,
  rpe: number | null | undefined,
  canonicalTss: number | null | undefined,
): string | null {
  if (rpe == null || durationSec == null || durationSec <= 0) return null;
  const fosterLoad = computeFosterSessionLoad(durationSec, rpe);
  const rounded = Math.round(fosterLoad);
  if (canonicalTss == null) return `${rounded} perçue`;
  const dissonance = fosterDissonanceLabel(canonicalTss, fosterLoad);
  if (dissonance === 'higher') return `${rounded} perçue (ressenti plus élevé)`;
  if (dissonance === 'lower') return `${rounded} perçue (ressenti plus bas)`;
  return `${rounded} perçue`;
}
